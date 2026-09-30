# Plano de implementação — Segurança, LGPD e operação

Portal do Cliente Alfa · levantamento de 30/09/2026

Base: leitura completa do código (branch `main`, 4 commits) e inspeção do
Supabase de produção **"Andamento de obra"** (`sodsudxlbyuqxzusswny`,
sa-east-1). O banco de produção tem as 7 tabelas criadas e **nenhuma linha**.
Ainda não há dado pessoal real, então esta é a hora mais barata e segura de
corrigir a arquitetura.

---

## 1. Diagnóstico consolidado

Os problemas pontuais (lista abaixo) vêm de **três falhas de arquitetura**.
Corrigir as três resolve boa parte da lista de uma vez:

| # | Falha de arquitetura | Consequência |
|---|---|---|
| A | **O login do cliente é só o CPF**, que é um dado semipúblico e adivinhável. A sessão é um JWT próprio de 30 dias e não pode ser revogada. | Qualquer pessoa entra com o CPF de outra. Dá para enumerar a base de clientes. Um cliente desativado continua logado. |
| B | **O portal inteiro roda com a service role key**, que ignora a RLS. | A RLS existe, mas não protege o portal. Um bug de lógica no servidor vira vazamento de dados, sem segunda barreira. |
| C | **Não existe processo de mudança.** Sem migrations, sem staging, sem CI, sem testes. O schema foi colado no SQL Editor. | Toda mudança vai direto para produção, sem histórico nem rollback. Hoje o `storage.sql` nem chegou a ser aplicado. |

Achado de produto que precisa de decisão (ver seção 5): **todo cliente logado vê
todos os empreendimentos.** Não existe vínculo entre cliente e empreendimento.

### Achados pontuais

**Supabase (produção)**
- Funções `SECURITY DEFINER` executáveis por `anon` via `/rest/v1/rpc`: `eh_admin`, `nivel_acesso_atual`, `marcar_convite_ativo` e **`purgar_fotos_excluidas`**. Esta última deixa qualquer visitante apagar fotos em definitivo.
- `set_updated_at` está sem `search_path` fixo.
- Os buckets `obras` e `logos` **não existem**, então o upload de fotos está quebrado.
- A edge function `cpf-login` não está publicada. O login cai no fallback com service role.
- Proteção contra senha vazada está desligada. `pg_cron` não está instalado, então a purga agendada não roda.
- Há 20 políticas permissivas duplicadas (`for all` sobreposto a `for select`) e 3 chaves estrangeiras sem índice.
- Existe um projeto duplicado e vazio: "Alfaeng's Project" (us-west-2).

**Código**
- A resposta do login distingue "CPF inexistente" de "CPF válido", o que permite enumerar clientes.
- A edge function aceita qualquer chamada se `CPF_LOGIN_INTERNAL_KEY` não estiver definida, e usa CORS `*`.
- Não há rate limit em nenhum lugar, nem MFA para admin. A senha mínima de 8 caracteres só é validada no navegador.
- `zod` está instalado e não é usado. `Number()` sem checagem aceita `NaN`.
- O upload confia no `contentType` enviado pelo navegador, usa o nome original do arquivo e não tem limite de tamanho.
- A importação de CSV não tem limite de tamanho nem de linhas, e não valida e-mail nem telefone.
- **Injeção de fórmula no Excel:** o nome do cliente vai cru para o `.xlsx`.
- A exportação inclui o **CPF completo** de quem respondeu a pesquisa, e não há registro de quem exportou.
- `responderPesquisa` não valida a campanha e permite votos repetidos.
- Algumas mensagens de erro expõem detalhes internos (`uploadError.message`).
- `wp.ts` usa `link` e `imagem` externos sem validar o esquema da URL.
- Não há headers de segurança (CSP, HSTS, X-Frame-Options).
- `excluirCliente` é bloqueado quando existem respostas de pesquisa. Isso impede atender pedidos de exclusão da LGPD.
- Dependências: `next@14.2.15` (high), `postcss` (critical), `xlsx` (high, sem correção).

---

## 2. Decisões de arquitetura (recomendadas)

### D1. Login do cliente com Supabase Auth: CPF + código por e-mail (OTP)
Fluxo:
1. O cliente digita o CPF.
2. O servidor procura o e-mail cadastrado a partir do CPF. Essa busca tem rate limit por IP e por CPF.
3. O servidor chama `signInWithOtp` para esse e-mail.
4. A tela mostra **sempre** a mesma mensagem: "Se o CPF estiver cadastrado, enviamos um código para o e-mail registrado".
5. O cliente digita o código de 6 dígitos.

Por que essa opção:
- O segundo fator é algo que o cliente **tem**: o e-mail.
- A sessão passa a ser do Supabase, com refresh token revogável e expiração configurável. Desativar o cliente derruba o acesso.
- O rate limit de envio de OTP já vem pronto no Supabase Auth.
- Com o cliente autenticado de verdade, **a RLS passa a valer no portal** (resolve B).
- **Elimina** o JWT próprio (`jose`), o `SESSION_SECRET`, a edge function `cpf-login` e o fallback com service role. Sai código, a superfície de ataque fica menor e ainda economiza horas.

Custo: o cliente precisa de e-mail válido no Sienge, e é preciso configurar um SMTP próprio (Resend ou SES), porque o SMTP padrão do Supabase tem limite de poucos e-mails por hora. SMS é uma alternativa, com custo por mensagem.

### D2. Service role só onde é indispensável
Os únicos usos que continuam com service role são a busca de CPF para e-mail no login, os convites de admin e os jobs agendados. As leituras do portal e do admin passam a usar o client do usuário, e a RLS decide o acesso.

### D3. Minimização do CPF (LGPD) em vez de criptografia
O sistema não precisa ler o CPF completo depois do cadastro. Ele só precisa **comparar** CPFs. Então:
- Guardar `cpf_hash = HMAC-SHA256(cpf, pepper)`, com o pepper no Supabase Vault ou em variável de ambiente, e **nunca** no banco em claro.
- Guardar `cpf_mascarado = "***.456.789-**"` para exibição no admin.
- Login e importação do CSV (upsert) passam a funcionar pelo `cpf_hash`.

Resultado: se o banco vazar, não vaza CPF. É mais simples e mais forte do que criptografar e ter que gerenciar chaves.

### D4. Admin com MFA obrigatório, aplicado no banco
Os admins usam TOTP do Supabase. As funções `eh_admin()` e `nivel_acesso_atual()` passam a exigir `auth.jwt()->>'aal' = 'aal2'`. Sem o segundo fator, a RLS nega acesso mesmo que alguém pule a tela.

### D5. Processo de mudança
- Reaproveitar o projeto vazio **"Alfaeng's Project" como staging**, em vez de excluir.
- Adotar a Supabase CLI com `supabase/migrations/`. Cada migration ganha um par em `supabase/rollback/`, porque as migrations do Supabase só andam para frente.
- Toda migration é aplicada primeiro no staging.
- Rollback do app pelo "Instant Rollback" da Vercel.
- Rollback do banco pelo script `down` e, em último caso, por PITR ou backup.

---

## 3. Plano por fases

A ordem segue as dependências. O staging vem antes de tocar produção, a
autenticação vem antes da RLS do portal (porque a RLS depende de saber quem é o
cliente), e a LGPD vem depois que o modelo de dados estabiliza.

### Fase 0 — Fundação (6–10h)
- [ ] Configurar "Alfaeng's Project" como staging e documentar as variáveis de cada ambiente.
- [ ] Supabase CLI: migration baseline gerada do schema atual de produção (`supabase db pull`).
- [ ] Mover `schema.sql` e `storage.sql` para migrations. Deixar o `seed.sql` só para staging.
- [ ] GitHub Actions: `tsc --noEmit`, lint, `next build`, `npm audit --audit-level=high`.
- [ ] Dependabot semanal.
- [ ] Sentry no Next.js (o conector já está disponível).
- [ ] Proteção do branch `main`: exigir PR com CI verde.

### Fase 1 — Correções imediatas no banco (6–8h) · *baixo risco, alto ganho*
- [ ] `REVOKE EXECUTE ... FROM anon, authenticated` em `purgar_fotos_excluidas` e `marcar_convite_ativo`. Nas funções de RLS, liberar só `authenticated`.
- [ ] `set search_path = ''` em `set_updated_at`, e nomes totalmente qualificados em todas as funções.
- [ ] Reescrever as políticas: separar `select`, `insert`, `update` e `delete` (acaba com as duplicadas), usar `(select auth.uid())` por performance, e `to authenticated` explícito.
- [ ] Índices em `campanhas_pesquisa.created_by`, `respostas_pesquisa.cliente_id` e `usuarios_admin.convidado_por`.
- [ ] Criar os buckets com `allowed_mime_types` (jpeg, png, webp) e `file_size_limit` de 10 MB.
- [ ] `unique (campanha_id, cliente_id)` em `respostas_pesquisa`.
- [ ] Trocar a FK `respostas_pesquisa.cliente_id` para `on delete set null`. Assim a resposta fica anônima e o cliente pode ser excluído.
- [ ] Painel do Auth:
  - ligar a proteção contra senha vazada;
  - senha mínima de 10 caracteres com complexidade;
  - allowlist de redirect URLs;
  - JWT de 1h;
  - CAPTCHA (Turnstile) nos logins.

### Fase 2 — Autenticação (12–18h)
- [ ] Login do cliente com CPF + OTP por e-mail (D1). Mensagem sempre genérica e tempo de resposta constante.
- [ ] Vincular `clientes.auth_user_id` a `auth.users`. Criar o usuário do Auth na primeira entrada ou na importação.
- [ ] Rate limit com uma tabela `rate_limit` no Postgres e uma função atômica, sem fornecedor novo. Limites: 5 tentativas por CPF a cada 15 min e 20 por IP a cada 15 min. Complementar com regra de rate limit no firewall da Vercel.
- [ ] SMTP próprio configurado no Supabase Auth.
- [ ] MFA TOTP obrigatório para admins (D4): tela de cadastro do app autenticador e tela de desafio.
- [ ] Sessões: admin com timeout de inatividade de 8h, cliente de 7 dias. Fazer logout com `signOut({ scope: 'global' })`.
- [ ] Remover `jose`, `SESSION_SECRET`, `cliente-session.ts`, a edge function `cpf-login` e o fallback.
- [ ] Mover a validação de senha para o servidor. O Auth passa a aplicar a política.

### Fase 3 — Portal protegido por RLS (6–10h)
- [ ] Políticas de leitura para clientes autenticados:
  - empreendimentos ativos;
  - etapas com `percentual > 0`;
  - fotos sem `deleted_at`;
  - a campanha ativa.
- [ ] Política de `insert` em `respostas_pesquisa` só com `cliente_id = cliente atual` e em campanha ativa.
- [ ] Trocar `createSupabaseAdminClient` pelo client do usuário em `lib/data/empreendimentos.ts` e `lib/data/pesquisa.ts`.
- [ ] Se a decisão 1 for "cada cliente vê só a própria obra": criar a tabela `cliente_empreendimentos`, a coluna de empreendimento no CSV do Sienge e filtrar na RLS (+4–6h).
- [ ] Testes de RLS com pgTAP (extensão já disponível). Cada papel (`anon`, cliente, `editor_obras`, `editor_completo`, `administrador`) tenta ler e escrever cada tabela.

### Fase 4 — Validação e sanitização (10–14h)
- [ ] Schemas `zod` compartilhados para todas as Server Actions: UUIDs, percentuais de 0 a 100, textos com limite de tamanho, e-mail e telefone.
- [ ] Upload:
  - validar o tipo real pelos *magic bytes*;
  - limite de tamanho e de quantidade;
  - nome do arquivo gerado (`<uuid>.webp`);
  - remover metadados EXIF, porque fotos de obra podem ter geolocalização.
- [ ] CSV: no máximo 2 MB e 10 mil linhas, e relatório das linhas rejeitadas.
- [ ] Exportação: neutralizar células que começam com `= + - @ \t \r`.
- [ ] `wp.ts`: aceitar só URLs `https://` do domínio da Alfa. Validar a resposta com `zod`.
- [ ] Mensagens de erro genéricas para o usuário e detalhes só no log (Sentry).
- [ ] Headers no `next.config.mjs`:
  - CSP com nonce;
  - HSTS;
  - `X-Frame-Options: DENY`;
  - `Referrer-Policy`;
  - `Permissions-Policy`.
- [ ] Trocar o `dangerouslySetInnerHTML` de `ServicoIcon` por componentes SVG.
- [ ] SQL injection: o risco é baixo, porque todo acesso passa pelo PostgREST parametrizado. Manter a regra de **nunca** montar SQL com string e revisar isso nas funções novas.

### Fase 5 — Dependências (8–12h)
- [ ] Atualizar o Next 14 para 15. `cookies()` passa a ser assíncrono e é preciso revisar o cache. Com isso o `postcss` interno também é corrigido.
- [ ] Trocar `xlsx` por `exceljs`.
- [ ] Atualizar `@supabase/ssr` e `@supabase/supabase-js`.
- [ ] `npm audit` zerado em high/critical, com o CI barrando regressões.

### Fase 6 — LGPD (14–22h)
- [ ] Minimização do CPF (D3): migration de `cpf` para `cpf_hash` + `cpf_mascarado`, com o login e a importação adaptados.
- [ ] Tirar o CPF da exportação da pesquisa. Manter o nome se houver finalidade, ou anonimizar.
- [ ] **Log de auditoria** (`audit_log`, só inserção, nem admins apagam):
  - triggers em `clientes`, `usuarios_admin` e `campanhas_pesquisa`;
  - registro das exportações e dos logins de admin.
- [ ] **Consentimento:** tabela `aceites_termos` (cliente, versão, data e hora, IP) e aceite obrigatório no primeiro acesso.
- [ ] Páginas de **Política de Privacidade** e **Termos de Uso**. Eu entrego o rascunho técnico, e a **revisão é do jurídico**.
- [ ] **Direitos do titular:** no admin, "exportar dados do cliente" (acesso) e "excluir ou anonimizar" (eliminação), com registro na auditoria.
- [ ] **Retenção:** job `pg_cron` que anonimiza clientes inativos após o prazo definido e purga fotos e registros de auditoria antigos. Também excluir os arquivos do Storage, que hoje ficam órfãos.
- [ ] Documentos: registro de operações de tratamento (RoPA), indicação do encarregado (DPO) e confirmação dos DPAs de Supabase e Vercel.

### Fase 7 — Operação: backups, monitoramento e recuperação (10–14h)
- [ ] Backups: plano **Pro** do Supabase (backup diário com 7 dias). Decidir sobre o PITR.
- [ ] Dump lógico semanal por GitHub Action, criptografado, em armazenamento externo (backup fora do Supabase).
- [ ] Teste de restauração no staging, feito uma vez e documentado.
- [ ] Monitoramento:
  - alertas do Sentry;
  - uptime externo do `/` e do login;
  - alertas de uso do Supabase;
  - log drain da Vercel.
- [ ] Log estruturado no servidor (JSON, sem CPF e sem token).
- [ ] **Plano de recuperação** (`docs/RUNBOOK.md`):
  - RPO e RTO acordados;
  - passo a passo para banco corrompido, vazamento de chave, deploy quebrado e incidente de dados pessoais (com prazo de comunicação à ANPD e aos titulares).
- [ ] Rotação de secrets: trocar a service role key e as chaves do projeto antes do go-live, documentar onde cada secret mora e quem tem acesso.
- [ ] CORS: com a edge function removida, fica o padrão do Supabase. As Server Actions do Next já checam a origem.

### Fase 8 — Testes e go-live (8–12h)
- [ ] Testes e2e com Playwright (Chromium já disponível):
  - login do cliente com OTP;
  - login do admin com MFA;
  - upload de foto;
  - resposta de pesquisa;
  - exportação.
- [ ] Checklist de pentest manual:
  - chamadas diretas à API REST com a anon key;
  - IDOR por UUID;
  - enumeração de CPF;
  - upload malicioso;
  - CSRF.
- [ ] `get_advisors` do Supabase zerado em segurança.
- [ ] Checklist de go-live: domínio, HTTPS, variáveis de produção, SMTP, backups ativos, primeiro admin com MFA.

---

## 4. Estimativa

| Fase | Horas |
|---|---|
| 0 — Fundação | 6–10 |
| 1 — Correções imediatas no banco | 6–8 |
| 2 — Autenticação | 12–18 |
| 3 — Portal com RLS | 6–10 (+4–6 se houver vínculo cliente↔obra) |
| 4 — Validação e sanitização | 10–14 |
| 5 — Dependências | 8–12 |
| 6 — LGPD | 14–22 |
| 7 — Operação | 10–14 |
| 8 — Testes e go-live | 8–12 |
| **Total** | **80–120h** |

**Marco de demonstração interna** (sem clientes reais): ao fim das fases 0 a 3,
cerca de 30–46h. **Liberação para clientes:** só com todas as fases concluídas.

Custos recorrentes fora das horas:
- Supabase Pro (cerca de US$ 25/mês, mais PITR opcional);
- SMTP (Resend: grátis até cerca de 3 mil e-mails/mês);
- Vercel (confirmar o plano).

---

## 5. Decisões pendentes (cliente e supervisor)

1. **Cada cliente vê só o próprio empreendimento, ou todos veem todos?** Hoje todos veem todos. Se for por cliente, o CSV do Sienge precisa trazer o empreendimento de cada CPF.
2. **Todos os clientes têm e-mail válido no Sienge?** Isso define se o OTP será por e-mail (recomendado) ou se será preciso SMS.
3. **Aprovação dos custos:** Supabase Pro e, opcionalmente, PITR.
4. **Prazo de retenção** dos dados de clientes inativos (sugestão: 5 anos após o fim da obra, a validar com o jurídico).
5. **Encarregado (DPO)** e **jurídico** que vão revisar a política e os termos.
6. **RPO e RTO** aceitáveis (sugestão: até 24h de perda de dados e 4h para voltar ao ar).
