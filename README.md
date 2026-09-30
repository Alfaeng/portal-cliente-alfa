# Portal do Cliente Alfa

Portal do cliente da Alfa Engenharia (São Luís/MA) para acompanhamento de
obras, com área administrativa para a equipe. Next.js 14 (App Router) +
Tailwind CSS + Supabase.

## Stack

- Next.js 14 (App Router, Server Actions)
- Tailwind CSS
- Supabase (Postgres + Auth + Storage + Edge Functions)
- `xlsx` (SheetJS) e `pdf-lib` para exportação de relatórios
- `jose` para assinar a sessão simples do login por CPF
- `papaparse` para importar a base de clientes via CSV

## 1. Instalar dependências

```bash
npm install
```

## 2. Configurar variáveis de ambiente

Copie `.env.local.example` para `.env.local` e preencha com as chaves do
seu projeto Supabase (Project Settings → API):

```bash
cp .env.local.example .env.local
```

- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`: do painel do Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: idem — **nunca** exponha essa chave no client.
- `SESSION_SECRET`: gere com `openssl rand -base64 48`.
- `CPF_LOGIN_INTERNAL_KEY`: gere outra string aleatória e configure a
  **mesma** como secret da edge function (passo 5).
- `NEXT_PUBLIC_SITE_URL`: URL pública do site (usada nos links de convite).

## 3. Rodar o banco de dados

O banco é versionado em `supabase/migrations/` (ordem cronológica). Cada
migration tem um rollback correspondente em `supabase/rollback/`. Use a
Supabase CLI (`supabase db push`) ou aplique os arquivos, em ordem, no SQL
Editor. **Aplique sempre primeiro no projeto de teste (staging).**

1. `20260930120000_baseline_schema.sql` — tabelas, RLS, funções e triggers.
2. `20260930120100_baseline_storage.sql` — buckets `logos` e `obras`.
3. `20260930130000_fase1_endurecimento_banco.sql` — políticas por comando,
   funções não expostas via API, limites de upload e índices.
4. `supabase/seed.sql` (opcional, só em teste) — dados de exemplo.

Plano completo de segurança, LGPD e operação: `docs/PLANO-DE-SEGURANCA.md`.

## 4. Criar o primeiro administrador

O convite de novos usuários admin só funciona a partir de um administrador
já existente (ninguém convida o primeiro). Para criar o primeiro:

1. No painel do Supabase → Authentication → Users → **Add user**, crie o
   usuário com e-mail e senha (ou envie um convite por lá).
2. No SQL Editor, rode:

   ```sql
   insert into public.usuarios_admin (id, nome, email, nivel_acesso, convite_status)
   values ('UUID-do-usuario-criado', 'Seu nome', 'seu@email.com', 'administrador', 'ativo');
   ```

Depois disso, use a tela **/admin → Usuários** para convidar o restante da
equipe — cada pessoa recebe um e-mail e cria a própria senha.

## 5. Deploy da Edge Function (login por CPF)

```bash
supabase functions deploy cpf-login --no-verify-jwt
supabase secrets set CPF_LOGIN_INTERNAL_KEY=mesma-string-do-.env.local
```

Se a function ainda não estiver publicada, o login por CPF cai
automaticamente em um fallback que consulta a tabela `clientes` direto do
servidor Next.js — útil durante o desenvolvimento, mas o ideal em produção
é ter a function publicada (mantém a service role key fora do processo
Next.js).

## 6. Importar clientes (base do Sienge)

Em **/admin/clientes**, envie um CSV com as colunas `cpf, nome, email,
telefone`. Clientes com o mesmo CPF são atualizados; CPFs novos são
cadastrados. O CPF é usado só como porteira de login — nenhum dado de
contrato fica no portal.

## 7. Rodar localmente

```bash
npm run dev
```

- Portal do cliente: `http://localhost:3000`
- Área administrativa: `http://localhost:3000/admin` (endereço discreto,
  sem link a partir da área do cliente)

## Decisões e observações importantes

- **Avanço geral** de cada empreendimento é um campo digitado pelo admin
  (vem do relatório do Sienge, que já pondera por etapa) — o sistema
  nunca calcula esse número a partir das etapas.
- **Etapas em 0%** ficam ocultas do cliente automaticamente (filtradas na
  consulta) e aparecem sozinhas quando o admin lançar um percentual > 0.
- **Fotos**: ao enviar fotos novas, as atuais recebem soft-delete
  (`deleted_at`) e continuam recuperáveis por ~30 dias. Agende a função
  `public.purgar_fotos_excluidas()` (ver comentário em `supabase/migrations/20260930120000_baseline_schema.sql`) para
  limpar definitivamente os registros antigos; os arquivos no Storage
  correspondentes podem ser removidos por uma rotina agendada separada.
- **Pesquisa de satisfação**: cada pergunta é uma campanha com status
  `ativa`/`pausada`. Só existe uma campanha `ativa` por vez (garantido por
  um índice único no banco). Reativar uma campanha antiga pausa a atual e
  volta a somar respostas no mesmo histórico — é assim que dá pra comparar
  a evolução da satisfação ao longo das fases da obra.
- **Conteúdo do site institucional** (nav, rodapé, seção "Serviços da
  Alfa", textos do "Saiba mais sobre a Alfa" e a logo) foi puxado do
  conteúdo real publicado em alfaengenhariama.com.br em julho/2026 — ver
  `src/lib/site-content.ts`. Revise esse arquivo se o site institucional
  mudar. Os ícones da seção "Serviços da Alfa" são desenhos de linha
  (calendário, prédio, painel, atendimento) equivalentes aos usados no
  protótipo, já que o site atual usa imagens fotográficas nessa seção, não
  ícones vetoriais isolados — troque por SVGs oficiais da marca se a Alfa
  tiver um kit de ícones próprio.
- **Logos por empreendimento**: o campo `empreendimentos.logo_url` existe
  para colar a URL `.webp` de cada empreendimento publicada no site atual
  quando você tiver essa lista; por padrão o card do cliente usa a marca
  "✦ ALFA" (como no protótipo) quando `logo_url` está vazio.
- **Destaques da semana**: busca os posts reais do blog via
  `GET /wp-json/wp/v2/posts`. Se a API estiver bloqueada ou instável, a
  seção some da tela silenciosamente (sem quebrar o portal) — ver
  `src/lib/wp.ts`.
- **RLS**: as leituras/escritas do portal do cliente (CPF, empreendimentos,
  etapas, fotos, resposta de pesquisa) rodam no servidor Next.js com a
  service role key, que ignora RLS por desenho do Supabase. As políticas
  de RLS em `supabase/migrations` protegem o acesso via Supabase Auth (área admin),
  conforme o `nivel_acesso` de cada usuário.

## Estrutura

```
src/
  app/            rotas (App Router) — portal do cliente e /admin
  app/actions/     Server Actions (login, obras, pesquisa, usuários, clientes)
  components/      componentes de UI (site, cliente, admin)
  lib/             clients Supabase, auth, exportação, dados, utils
  types/           tipos das tabelas do banco
supabase/
  migrations/      schema versionado (tabelas, RLS, storage)
  rollback/        scripts que desfazem cada migration
  seed.sql         dados de exemplo (opcional)
  functions/
    cpf-login/     Edge Function do login por CPF
```
