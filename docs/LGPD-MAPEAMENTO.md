# LGPD — Mapeamento de dados e procedimentos

Portal do Cliente Alfa · versão 2026-10-01 · **rascunho técnico, sujeito a revisão jurídica**

> Este documento registra o que o sistema faz na prática. Base legal, prazo de retenção, encarregado
> (DPO) e textos de política são decisões da Alfa e do jurídico: os campos marcados **[DECIDIR]**
> ainda dependem delas.

## 1. Quais dados pessoais existem e onde ficam

| Dado | Onde | Como é guardado | Quem vê |
|---|---|---|---|
| CPF | `clientes.cpf_hash`, `clientes.cpf_mascarado` | **Hash com chave secreta (HMAC-SHA256)**; o número completo não é gravado. Só a versão mascarada (`***.123.456-**`) é exibida. | Administrador (mascarado) |
| Nome, e-mail, telefone | `clientes` | Texto | Administrador |
| Vínculo cliente ↔ obra | `cliente_empreendimentos` | ids | Administrador; o cliente vê a própria obra |
| Respostas de pesquisa (nota) | `respostas_pesquisa` | Nota + id do cliente (fica nulo se o cliente for excluído) | Administrador e editor completo |
| Aceite da política | `aceites_termos` | Cliente, versão e data | Administrador |
| Histórico de quem mexeu nos dados | `audit_log` | Só quem/quando/o quê; **nunca os valores** | Administrador |
| Sessão do cliente | Cookie `alfa_cliente_session` (7 dias, HttpOnly) | JWT assinado | — |
| Usuários da equipe | `usuarios_admin` + Supabase Auth | Senha com hash (gerenciado pelo Supabase Auth) | Administrador |
| Fotos de obra | Storage `obras` | JPEG sem metadados (EXIF/GPS removidos no envio) | Público por link; não são dados pessoais |

Fluxo do CPF: o cliente digita → o servidor calcula o hash dentro do banco (a chave fica no Vault do
Supabase, nunca no código) → compara com o hash guardado. Importação por planilha e cadastro manual
também nunca gravam o número.

## 2. Finalidades e base legal

| Tratamento | Finalidade | Base legal |
|---|---|---|
| Login por CPF e exibição da obra | Dar acesso ao acompanhamento contratado | **[DECIDIR]** sugestão: execução de contrato (art. 7º, V) |
| Pesquisa de satisfação | Melhoria do atendimento | **[DECIDIR]** sugestão: legítimo interesse (art. 7º, IX), participação voluntária |
| Auditoria | Segurança e prestação de contas | **[DECIDIR]** sugestão: legítimo interesse / obrigação de segurança |
| Aceite da política | Transparência (art. 9º) e prova de ciência | — |

## 3. Operadores e transferências

| Fornecedor | Serviço | Localização | Pendências |
|---|---|---|---|
| Supabase | Banco, autenticação, arquivos | São Paulo (sa-east-1) | **[DECIDIR]** confirmar DPA (contrato de tratamento de dados) |
| Vercel | Hospedagem do site | **[DECIDIR]** confirmar região das funções | DPA e cláusulas de transferência internacional, se aplicável |
| Sienge (origem dos dados) | Sistema de gestão da Alfa | — | Quem envia a planilha ao portal |

## 4. Retenção

**[DECIDIR]** prazo para clientes ativos e inativos. Hoje **nada é apagado automaticamente**, exceto
fotos removidas há mais de 30 dias (rotina ainda a agendar, ver plano de segurança, fase 7).
Sugestão para discussão com o jurídico: manter enquanto durar o contrato e pelo prazo legal aplicável
depois, e então excluir o cliente (as respostas de pesquisa ficam sem identificação).

## 5. Direitos do titular (art. 18) — como atender pelo painel

Área **Admin → Clientes** (nível administrador). Toda ação fica registrada em **Admin → Auditoria**.

| Pedido do titular | O que fazer |
|---|---|
| Confirmação e acesso aos dados | Botão **Baixar dados** na linha do cliente: gera um arquivo com nome, contato, CPF mascarado, obras, respostas e aceites. |
| Correção | **Editar** (nome, e-mail, telefone). O CPF não é editável: para corrigir, excluir e recadastrar. |
| Eliminação | **Excluir**: apaga o cadastro, os vínculos e os aceites. As respostas de pesquisa permanecem, sem identificação. |
| Portabilidade | O mesmo arquivo do **Baixar dados** (JSON). |
| Informação sobre compartilhamento | Ver seção 3 e a Política de Privacidade (`/privacidade`). |

Prazo de resposta: **[DECIDIR]** definir com o jurídico e registrar num procedimento interno.

## 6. Segurança que já existe

- HTTPS com HSTS; cabeçalhos de segurança; política de conteúdo em modo de observação.
- CPF protegido por hash com chave (pepper) no Vault; máscara na exibição.
- Cada cliente só acessa as obras ligadas ao cadastro dele.
- Limite de tentativas de login (por CPF/IP e por e-mail/IP).
- Validação de todos os dados recebidos; upload de fotos com conferência do conteúdo e remoção de EXIF/GPS.
- Auditoria só de inserção (nem o servidor consegue editar ou apagar o histórico pela API).
- Dependências sem vulnerabilidades conhecidas; verificação automática a cada mudança (CI).

## 7. Guarda da chave do CPF (importante)

A chave usada no hash fica no **Vault do Supabase** (`cpf_pepper`). **Não apague.** Sem ela, nenhum CPF já
cadastrado pode ser localizado (os clientes precisariam ser reimportados). Restaurar um backup do
**mesmo** projeto preserva a chave. Em uma migração para outro projeto, a chave precisa ser levada
junto: registrar no plano de recuperação (fase 7).

## 8. Incidente de segurança (resumo)

1. Conter (trocar chaves, revogar sessões, tirar o serviço do ar se preciso).
2. Levantar o que foi afetado, usando **Admin → Auditoria** e os logs da Vercel e do Supabase.
3. Avisar o encarregado e o jurídico. **[DECIDIR/CONFIRMAR]** a comunicação à ANPD e aos titulares tem
   prazo curto (a regulamentação atual fala em 3 dias úteis).
4. Registrar o que houve e o que foi corrigido.

O plano de recuperação completo entra na fase 7.
