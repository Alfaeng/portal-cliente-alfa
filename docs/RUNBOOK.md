# Runbook: o que fazer quando algo dá errado

Portal do Cliente Alfa · escrito para quem **não** é programador. Cada seção é um roteiro curto.
Onde aparece **[DECIDIR]**, é uma decisão da Alfa ou do cliente que ainda está em aberto.

---

## 0. Mapa rápido: onde mora cada coisa

| Peça | O que é | Onde mexer |
|---|---|---|
| **Site** | O portal em si (Next.js) | Vercel → projeto `portal-cliente-alfa` |
| **Banco de dados, login da equipe, fotos** | Supabase, projeto `sodsudxlbyuqxzusswny` (São Paulo) | painel do Supabase |
| **Código** | Repositório `Alfaeng/portal-cliente-alfa` no GitHub | GitHub |
| **Teste de saúde** | `https://<endereço-do-site>/api/saude` | qualquer navegador |
| **Limpeza diária automática** | `/api/cron/manutencao` (06:00 UTC, 03:00 em São Luís) | Vercel → Cron Jobs |

Cada mudança no banco tem um arquivo em `supabase/migrations/` e o "desfazer" correspondente em `supabase/rollback/`.

---

## 1. Como saber se o site está no ar

Abra `https://<endereço-do-site>/api/saude`.

- `{"status":"ok", ...}` → site e banco funcionando.
- `503` com `"status":"erro"` → o site está de pé mas **não consegue falar com o banco**. Vá para a seção 4.

**Monitor de disponibilidade** (responsabilidade do cliente, ainda a contratar): aponte um serviço
como UptimeRobot ou Better Stack para esse endereço, a cada 5 minutos, esperando status 200 e
avisando por e-mail. Esse endereço não expõe nenhum dado.

---

## 2. Deploy quebrou o site (algo parou de funcionar depois de uma atualização)

Tempo típico: 2 minutos.

1. Vercel → projeto → **Deployments**.
2. Localize o último deploy que funcionava (o anterior ao problema).
3. Menu `⋯` → **Instant Rollback** (ou "Promote to Production").
4. Confirme abrindo o site e o `/api/saude`.
5. Avise o desenvolvedor para corrigir o código antes do próximo deploy.

O rollback do site **não** desfaz mudanças no banco.

---

## 3. Uma mudança no banco deu errado

1. Identifique a migration em `supabase/migrations/` (o nome tem a data).
2. Rode o arquivo de mesmo nome em `supabase/rollback/` (termina em `.down.sql`) no SQL Editor do Supabase.
3. **Exceção importante:** a migration `fase6b_remove_cpf_em_claro` apagou o CPF em texto puro de propósito.
   O rollback dela só recria a estrutura; os CPFs voltam apenas de um backup ou reimportando a planilha do Sienge.

---

## 4. O banco está fora do ar ou os dados sumiram

### 4.1. O site responde 503 em `/api/saude`
1. Abra o painel do Supabase. Se aparecer **"Project paused"** (projetos do plano gratuito são pausados por inatividade), clique em **Restore project** e espere alguns minutos.
2. Veja o status em `status.supabase.com`.
3. Confira se a variável `NEXT_PUBLIC_SUPABASE_URL` da Vercel ainda aponta para o projeto certo.

### 4.2. Dados apagados ou corrompidos
Depende do plano do Supabase **[DECIDIR: plano Pro, com o cliente]**:

| Situação | O que existe | Como recuperar |
|---|---|---|
| **Plano Pro** | Backup diário por 7 dias (e PITR, se contratado) | Painel → Database → Backups → escolher o ponto → Restore |
| **Plano gratuito** | Em geral **não há** backup diário acessível (confirme em Database → Backups) | Usar a cópia semanal criptografada do GitHub (seção 4.3) ou reimportar do Sienge |

### 4.3. Restaurar a cópia semanal de emergência (GitHub)
Só existe se o cliente configurou os segredos `SUPABASE_DB_URL` e `BACKUP_PASSPHRASE` (ver
`.github/workflows/backup-banco.yml`).

1. GitHub → **Actions** → "Backup do banco (emergência)" → o último run → baixe o artefato `backup-banco`.
2. Descriptografe: `openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -in backup-AAAA-MM-DD.dump.enc -out backup.dump -pass env:BACKUP_PASSPHRASE`
3. Em um projeto novo do Supabase, aplique as migrations de `supabase/migrations/` na ordem.
4. **Antes de entrar os dados**, recoloque a chave do CPF (seção 6), senão o login dos clientes não funciona.
5. Carregue os dados: `pg_restore --no-owner --data-only --schema=public -d "<conexão do projeto novo>" backup.dump`
6. Recrie os usuários da equipe (convite pelo Admin → Usuários) e atualize as variáveis da Vercel para o projeto novo.

**O que a cópia NÃO inclui:** as **fotos** (ficam no armazenamento) e a **chave do CPF** (Vault).
Fotos podem ser reenviadas a partir dos originais da equipe.

---

## 5. Vazou uma chave ou senha

| Segredo | Onde fica | O que fazer |
|---|---|---|
| Chave de serviço do Supabase (`SUPABASE_SERVICE_ROLE_KEY`) | Vercel | Supabase → Project Settings → API: gerar uma nova chave de serviço e revogar a antiga → atualizar na Vercel (marcar **Sensitive**) → **Redeploy** |
| `SESSION_SECRET` | Vercel | Gerar outro valor longo e aleatório → atualizar → Redeploy. **Efeito:** todos os clientes são deslogados (é esperado) |
| `CRON_SECRET` | Vercel | Gerar outro → atualizar → Redeploy |
| Senha de um usuário da equipe | Supabase Auth | Admin → Usuários → excluir e convidar de novo, ou "esqueci a senha" |
| Senha do banco | Supabase | Project Settings → Database → Reset password (e atualizar `SUPABASE_DB_URL` no GitHub, se existir) |
| Chave do CPF (`cpf_pepper`) | Vault do Supabase | **Não troque.** Se vazou junto com uma cópia do banco, avise o jurídico e trate como incidente (seção 7). Trocar exige reimportar todos os clientes |

Depois de qualquer troca: confira `/api/saude`, o login de um cliente de teste e o login do admin.

---

## 6. Guarda da chave do CPF (faça uma vez, antes do lançamento)

O CPF dos clientes é guardado como um código gerado com uma chave secreta (`cpf_pepper`), que mora no
**Vault do Supabase**. Se essa chave se perder, **nenhum CPF cadastrado pode ser localizado** e os
clientes precisam ser reimportados.

**Faça uma cópia segura:**
1. Supabase → SQL Editor → rode: `select decrypted_secret from vault.decrypted_secrets where name = 'cpf_pepper';`
2. Guarde o valor em um **gerenciador de senhas** da Alfa (com acesso restrito a poucas pessoas).
3. **Nunca** cole esse valor em chat, e-mail, tarefa ou no GitHub.

**Para recolocar a chave em um projeto novo (seção 4.3, passo 4):**
`select vault.create_secret('<valor guardado>', 'cpf_pepper', 'Chave usada no hash do CPF');`

Restaurar um backup do **mesmo** projeto mantém a chave sozinho.

---

## 7. Incidente com dados pessoais (suspeita de vazamento)

1. **Conter:** trocar as chaves (seção 5), e se preciso tirar o site do ar (Vercel → Settings → Pause, ou ligar o "Attack Challenge Mode").
2. **Levantar o que aconteceu:** Admin → **Auditoria** (quem mexeu em quê), logs da Vercel e logs do Supabase.
3. **Avisar** o encarregado (DPO) e o jurídico **no mesmo dia**.
4. **Comunicar** à ANPD e aos clientes afetados, se o jurídico entender que há risco relevante. O prazo é curto (a regulamentação atual fala em 3 dias úteis: **confirmar com o jurídico**).
5. **Registrar** o que houve, o que foi afetado e o que foi corrigido.

Mais detalhes: `docs/LGPD-MAPEAMENTO.md`.

---

## 8. Metas de recuperação **[DECIDIR com o cliente]**

| Meta | Significado | Sugestão |
|---|---|---|
| **RPO** | Quanto de dado aceitamos perder | Até 24 horas (backup diário do plano Pro) |
| **RTO** | Quanto tempo aceitamos ficar fora do ar | Até 4 horas em horário comercial |

Sem o plano Pro, o RPO real é o da cópia semanal de emergência (até 7 dias), e a reimportação do Sienge cobre a base de clientes.

---

## 9. Rotinas automáticas (o que roda sozinho)

| Rotina | Quando | O que faz |
|---|---|---|
| Limpeza diária (`/api/cron/manutencao`) | Todo dia, 03:00 (São Luís) | Apaga de vez as fotos removidas há mais de 30 dias (arquivo e registro) e limpa contadores antigos de tentativas de login |
| Verificações do GitHub (CI) | A cada mudança proposta | Confere tipos, vulnerabilidades e build |
| Dependabot | Segundas-feiras | Abre PRs de atualização (só versões pequenas; as grandes são tratadas à mão) |
| Backup de emergência | Domingos, 04:00 (São Luís) | Só se os segredos estiverem configurados |

Se a limpeza diária falhar, o erro aparece nos logs da Vercel com o texto `manutencao:`.

---

## 10. Como ler os logs da Vercel

Vercel → projeto → **Logs**. Cada erro do sistema sai em uma linha de JSON com `"nivel":"erro"` e um
`"evento"` que diz onde foi (ex.: `login cliente`, `enviarFoto`, `manutencao`). CPF, e-mail e tokens são
trocados por `[cpf]`, `[email]` e `[token]` antes de serem escritos.

---

## 11. Checklist antes de lançar aos clientes

- [ ] Textos de `/privacidade` e `/termos` revisados pelo jurídico, sem nenhum `[PREENCHER]`
- [ ] Endereço final do site definido (a proteção de deploy da Vercel **não** pode exigir login da Vercel para clientes)
- [ ] Plano do Supabase escolhido e backups ligados **[cliente]**
- [ ] Monitor de disponibilidade apontando para `/api/saude` **[cliente]**
- [ ] Monitoramento de erros (ex.: Sentry) ligado **[cliente]**
- [ ] Cópia da chave do CPF guardada no gerenciador de senhas (seção 6)
- [ ] Chave de serviço do Supabase trocada e `CRON_SECRET` presente na Vercel
- [ ] Proteção contra senhas vazadas ligada no Supabase (Authentication)
- [ ] Usuário de teste do admin (`teste.admin@alfaeng.test`) removido
- [ ] Dados de teste removidos (obra "ZZ Teste QA", respostas de pesquisa de teste, clientes de teste)
- [ ] Um teste de restauração: fazer, uma vez, o exercício da seção 4.3 num projeto descartável
