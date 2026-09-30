# Prompt de testes para o Claude no Chrome

Este arquivo tem duas partes:

1. **Antes de rodar (para você):** o que preencher e o que fazer com o resultado.
2. **O prompt (para colar no Claude no Chrome):** tudo entre `INÍCIO DO PROMPT` e `FIM DO PROMPT`.

> Este arquivo **não contém senhas nem CPFs**. Você preenche os campos `{{...}}` na hora de colar.

---

## 1. Antes de rodar

Preencha na hora de colar:

| Campo | O que colocar |
|---|---|
| `{{CPF_CLIENTE_A}}` | CPF do primeiro cliente de teste (o que começa com "S…") |
| `{{CPF_CLIENTE_B}}` | CPF do segundo cliente de teste (o que começa com "V…") |
| `{{SENHA_ADMIN_TESTE}}` | Senha do admin de teste `teste.admin@alfaeng.test` |

Prepare também:

- Abra, em abas separadas e **já logado com a sua conta**, o painel da **Vercel** e o do **Supabase** (links dentro do prompt). O Claude no Chrome usa a sua sessão.
- Tenha em mãos uma **foto HEIC de iPhone**, um **arquivo de texto renomeado para `.jpg`**, uma **foto grande (mais de 4 MB)** e o **CSV de exemplo** do fim do prompt. Essas partes envolvem escolher arquivos no computador e são feitas por você (bloco G).
- Reserve cerca de 40 a 60 minutos.

**Quando terminar:** cole aqui na conversa a resposta final do Claude no Chrome (o bloco `RELATORIO_JSON` e o `RESUMO`). Eu analiso, separo o que é falha de código, de configuração ou de plano, e corrijo.

---

## 2. O prompt

INÍCIO DO PROMPT

```
Você é um testador de QA e de segurança. Vai testar o "Portal do Cliente Alfa" (Alfa Engenharia) em PRODUÇÃO, usando o navegador, e também inspecionar os painéis da Vercel e do Supabase. O resultado será lido por outro desenvolvedor (uma IA) que vai corrigir o que você encontrar, então PRECISÃO e FORMATO DA SAÍDA importam mais do que texto bonito.

=====================================================================
0. REGRAS INEGOCIÁVEIS
=====================================================================
- Painéis Vercel e Supabase: SOMENTE LEITURA. Não edite, não salve, não clique em Deploy/Redeploy, Pause, Delete, Reset, Rotate, Restore, Upgrade, nem em nada que peça pagamento. Não use o SQL Editor. Na Table Editor, não edite células.
- NUNCA revele valores de segredos: senhas, chaves de API (anon, service_role, publishable), SESSION_SECRET, tokens, valor de cookies. Nas variáveis de ambiente da Vercel, liste só os NOMES (não clique em "mostrar valor"). Única exceção: pode ler o valor de NEXT_PUBLIC_SUPABASE_URL, que é público.
- Privacidade: em qualquer texto que você escrever, mascare CPF (mostre só os 2 últimos dígitos: ***.***.***-XX) e e-mail (3 primeiras letras + "***").
- Só altere dados dentro dos testes descritos abaixo. NÃO mexa nas fotos, etapas ou textos da obra real "Marina Península". NÃO envie convites de usuário. NÃO exclua nada além do que o roteiro manda.
- Se aparecerem dados reais de clientes além dos 2 clientes de teste, pare de expor esses dados e reporte apenas a contagem.
- Não invente resultados. Se não conseguir executar um passo (ex.: escolher arquivo no computador, ver DevTools), marque NAO_TESTADO e diga o motivo.
- Se o site sair do ar, aparecer uma tela de pagamento/cobrança, ou uma ação destrutiva for a única forma de continuar: PARE e reporte.

=====================================================================
1. CONTEXTO DO SISTEMA
=====================================================================
- Site: {{URL_PRODUCAO}} = https://portal-cliente-alfa-zeta.vercel.app
- Painel Vercel: https://vercel.com/alfaeng/portal-cliente-alfa
- Painel Supabase (projeto de produção): https://supabase.com/dashboard/project/sodsudxlbyuqxzusswny
- Stack: Next.js 15 + React 19 + Supabase (Postgres, Auth, Storage).
- Área do cliente: login só com CPF (sem senha). Cookie de sessão "alfa_cliente_session" (7 dias). Cada cliente só pode ver os empreendimentos ligados ao seu cadastro.
- Área /admin: login por e-mail e senha (Supabase Auth). A verificação em duas etapas (QR code) está DESLIGADA de propósito: NÃO deve aparecer tela de QR/código.
- Limites de tentativas (rate limit): login de admin = 5 tentativas por e-mail e 20 por IP a cada 15 min; login de cliente = 5 por CPF e 20 por IP a cada 15 min. ATENÇÃO: cada tentativa conta, inclusive as corretas. Se aparecer "Muitas tentativas" antes do bloco H, aguarde 15 minutos, registre como observação e continue.
- Deploy esperado em produção: commit começando com 7529ab3 (fase 4).

=====================================================================
2. DADOS DE TESTE
=====================================================================
- Admin de teste: e-mail teste.admin@alfaeng.test | senha {{SENHA_ADMIN_TESTE}}
- Cliente A: CPF {{CPF_CLIENTE_A}}
- Cliente B: CPF {{CPF_CLIENTE_B}}
- Obra real (não mexer): "Marina Península", slug marina-peninsula, com ~16 fotos.
- Obra de teste (você vai criar e depois apagar): "ZZ Teste QA", bairro "Teste", slug esperado zz-teste-qa.
- CPF matematicamente válido que NÃO existe na base: 111.444.777-35
- CPF matematicamente inválido: 000.000.000-00
- CPF válido para cadastro manual de teste: 529.982.247-25

=====================================================================
3. ORDEM DE EXECUÇÃO
=====================================================================
Bloco A (visitante) -> D1 (admin: preparação) -> B (cliente A) -> C (cliente B) -> D2 (admin: validações) -> E (Vercel) -> F (Supabase) -> G (só listar: quem faz é o humano) -> LIMPEZA -> H (limites de tentativa, sempre por último).
Use janela anônima/limpa para os blocos de visitante e de cliente, e faça logout entre um perfil e outro.

=====================================================================
4. TESTES
=====================================================================
Para cada teste registre: resultado (PASS, FAIL, PARCIAL, BLOQUEADO, NAO_TESTADO), o que esperava, o que obteve (mensagem EXATA da tela), a URL final, o status HTTP quando visível, e erros de console.

--- BLOCO A: VISITANTE (sem login) ---
A01  Abrir a home "/". Esperado: carrega (200), sem erro visual. Anotar o tempo de carregamento aproximado e quaisquer erros de console.
A02  Abrir "/portal". Esperado: redireciona para "/".
A03  Abrir "/portal/marina-peninsula". Esperado: redireciona para "/" (sem mostrar a obra).
A04  Abrir "/admin", "/admin/obras", "/admin/clientes", "/admin/usuarios", "/admin/pesquisa". Esperado: todos redirecionam para "/admin/login".
A05  Abrir "/api/export/excel" e "/api/export/pdf" sem login. Esperado: NÃO baixa arquivo (redirecionamento ou erro). Anotar o comportamento e o status.
A06  Abrir "/admin/mfa" sem login. Esperado: redireciona para "/admin/login".
A07  Abrir "/rota-que-nao-existe". Esperado: página 404 amigável, sem stack trace nem detalhes internos.
A08  CABEÇALHOS HTTP de "/" e de "/admin/login" (DevTools > Network > primeira requisição > Response Headers, se conseguir). Esperado presentes: Strict-Transport-Security, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy, Permissions-Policy, Cross-Origin-Opener-Policy, Content-Security-Policy-Report-Only. Esperado AUSENTE: X-Powered-By. Copie o valor de cada um no campo "cabecalhos_http" da saída.
A09  CSP (modo relatório): abra o console (DevTools) em "/", "/admin/login" e, depois, nas páginas de cliente e admin dos outros blocos. Liste TODA violação de CSP ("[Report Only] Refused to ...") com: página, diretiva violada e recurso bloqueado. Isso decide se podemos ligar o bloqueio. Se não houver nenhuma, diga "nenhuma violação".
A10  Login de cliente com "000.000.000-00". Esperado: "CPF inválido. Confira os números digitados."
A11  Login de cliente com "111.444.777-35" (válido mas inexistente). Esperado: "Não foi possível entrar com esse CPF. Verifique os números ou fale com a Alfa." Anotar a mensagem exata.
A12  Clique em "Não consigo entrar" e anote para onde leva (não precisa preencher nada).

--- BLOCO D1: ADMIN, PREPARAÇÃO ---
D01  Em /admin/login, entrar com a senha ERRADA. Esperado: "E-mail ou senha incorretos." (sem indicar qual dos dois errou).
D02  Entrar com o admin de teste (e-mail e senha corretos). Esperado: vai para /admin/obras; menu com Obras, Clientes, Pesquisa, Usuários; NÃO aparece tela de QR code nem de código.
D03  Em Obras, criar empreendimento "ZZ Teste QA", bairro "Teste", avanço 10. Esperado: abre a edição; existem 11 etapas padrão (Alvenarias, Contrapiso, ... Paisagismo) todas em 0%. Anotar o slug se visível.
D04  Em Clientes: ver a coluna "Empreendimentos". Editar o Cliente A e marcar SOMENTE "Marina Península"; salvar. Editar o Cliente B e marcar SOMENTE "ZZ Teste QA"; salvar. Esperado: a coluna passa a mostrar o vínculo de cada um. (Identifique A e B pela inicial do nome; A começa com "S", B com "V".)
D05  Em Obras, editar "ZZ Teste QA": texto = "Teste QA", avanço = 25, etapa "Alvenarias" = 40. Salvar. Esperado: "Alterações salvas."

--- BLOCO B: CLIENTE A (janela limpa) ---
B01  Login com o CPF do Cliente A. Esperado: vai para /portal, "Olá, <primeiro nome>", lista SOMENTE "Marina Península".
B02  Abrir "Marina Península". Esperado: avanço geral, etapas com percentual acima de 0, galeria com fotos. Confirme que as imagens realmente carregam (não ficam quebradas). Abrir uma foto ampliada, navegar com as setas, fechar com ESC.
B03  Abrir /portal/zz-teste-qa (obra do Cliente B). Esperado: página "não encontrado" (404). FALHA GRAVE se mostrar os dados da obra.
B04  Pesquisa: no /portal deve haver o banner da pesquisa com a pergunta ativa. Clicar 5 estrelas. Esperado: "Obrigado pela sua resposta." Recarregar a página. Esperado: continua mostrando o agradecimento (não pede a nota de novo).
B05  Cookie: verificar (DevTools > Application > Cookies) o cookie "alfa_cliente_session": HttpOnly, Secure, SameSite=Lax? Em "console", "document.cookie" NÃO deve listar esse cookie. Se não conseguir ver, NAO_TESTADO.
B06  Clicar em Sair. Esperado: volta à home. Abrir /portal. Esperado: redireciona para "/". Usar o botão Voltar do navegador: não deve exibir dados do portal.

--- BLOCO C: CLIENTE B (janela limpa) ---
C01  Login com o CPF do Cliente B. Esperado: lista SOMENTE "ZZ Teste QA".
C02  Abrir a obra "ZZ Teste QA". Esperado: avanço 25%, texto "Teste QA", apenas a etapa Alvenarias (40%) visível (etapas em 0% ficam ocultas).
C03  Abrir /portal/marina-peninsula. Esperado: 404. FALHA GRAVE se mostrar a obra.
C04  Mantenha a sessão do Cliente B aberta. Em OUTRA janela (pode ser normal, com o admin de teste logado), vá em Clientes > Editar no Cliente B, DESMARQUE a obra e salve. Volte à janela do Cliente B e recarregue o portal. Esperado: "Ainda não há nenhum empreendimento vinculado ao seu cadastro. Fale com a Alfa para mais informações." Depois, no admin, MARQUE de novo "ZZ Teste QA" para o Cliente B.
C05  Cliente B responde à pesquisa (5 estrelas). Esperado: agradecimento. Sair.

--- BLOCO D2: ADMIN, VALIDAÇÕES ---
(Logue de novo como admin de teste. Lembre do limite de 5 tentativas por e-mail em 15 min.)
D10  Em "ZZ Teste QA": avanço geral = 150. Salvar. Esperado: erro dizendo que não pode passar de 100 (nada é salvo).
D11  Avanço geral = -5. Esperado: erro. (Se o navegador bloquear o valor, tente forçar pelo console/DevTools alterando o input; se não der, PARCIAL e diga por quê.)
D12  Etapa "Alvenarias" = 101. Esperado: erro "Confira os percentuais das etapas...".
D13  Texto da atualização com mais de 2000 caracteres (cole um texto longo). Esperado: erro citando o limite de 2000 caracteres.
D14  XSS: texto da atualização = <script>alert(1)</script><img src=x onerror=alert(2)>  Salvar. Abrir a obra no portal como Cliente B. Esperado: o texto aparece como TEXTO literal; nenhum alerta/janela é executado. FALHA CRÍTICA se algo executar. Depois volte o texto para "Teste QA".
D15  Clientes > "Adicionar cliente manualmente": (a) e-mail "abc" -> esperado "E-mail inválido."; (b) telefone "abc" -> esperado erro de telefone; (c) CPF 000.000.000-00 -> esperado "CPF inválido"; (d) nome com 121+ caracteres -> esperado erro de 120 caracteres; (e) cadastro válido: nome "ZZ Cliente Teste", CPF 529.982.247-25, e-mail e telefone em branco -> esperado sucesso; (f) repetir o mesmo CPF -> esperado "Já existe um cliente cadastrado com esse CPF."
D16  Excluir o cliente "ZZ Cliente Teste" (botão Excluir, confirmar). Esperado: some da lista.
D17  Pesquisa: em /admin/pesquisa deve aparecer a campanha ativa com respostas (as 2 dadas nos testes B04 e C05). Testar "Exportar Excel" e "Exportar PDF" (ou os links /api/export/excel e /api/export/pdf logado). Esperado: baixa arquivo .xlsx e .pdf (status 200, tipo de conteúdo correto). Se conseguir ler o conteúdo, confirme que existem as abas "Respostas" e "Resumo". 
D18  Ainda em /admin/pesquisa: usar "Limpar respostas" NA CAMPANHA ATIVA (ela tinha 0 respostas antes dos testes). Esperado: volta para 0 respostas. (Isto remove só as respostas de teste.)
D19  Usuários: abrir a página (só olhar). NÃO convidar ninguém. Tentar excluir o PRÓPRIO usuário de teste. Esperado: bloqueado com "Você não pode excluir o seu próprio acesso."
D20  Clicar em Sair. Esperado: vai a /admin/login; voltar no navegador não mostra o painel.

--- BLOCO E: VERCEL (somente leitura) ---
E01  Deployments > produção: o mais recente está READY? Qual o commit (7 primeiros caracteres)? Há warnings ou erros no log de build? Liste-os.
E02  Logs de runtime das últimas 24h (filtro Errors/Fatal e Warnings): liste erros agrupados por mensagem e rota, com contagem aproximada.
E03  Settings > Environment Variables: liste SÓ os nomes, o tipo (Sensitive/Plain) e os ambientes de cada uma. Confirme a presença de: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (deve ser Sensitive), SESSION_SECRET (Sensitive), NEXT_PUBLIC_SITE_URL. Sinalize CPF_LOGIN_INTERNAL_KEY (obsoleta, pode ser removida). Sinalize se ADMIN_MFA_OBRIGATORIO existe. Confirme se o valor de NEXT_PUBLIC_SUPABASE_URL contém "sodsudxlbyuqxzusswny".
E04  Settings: plano da conta (Hobby/Pro), branch de produção, Deployment Protection, domínios, região das Functions, Node.js version, Firewall/WAF/Attack Challenge (ligado ou não), Web Analytics/Speed Insights (ligados ou não).

--- BLOCO F: SUPABASE (somente leitura) ---
F01  Advisors (Security Advisor e Performance Advisor): liste cada alerta com nome, nível e objeto afetado. (Já são esperados: proteção contra senha vazada desligada e 2 funções auxiliares da RLS executáveis por usuários logados.)
F02  Authentication > Sign In/Providers e Policies/Settings: informe: proteção contra senha vazada (ligada?), tamanho mínimo de senha, exigência de confirmação de e-mail, SMTP (padrão do Supabase ou próprio?), validade do OTP, validade do JWT, configurações de sessão (tempo máximo / inatividade, se aparecerem), MFA TOTP habilitado?, Site URL, lista de Redirect URLs, limites de taxa (Rate Limits), CAPTCHA (ligado?).
F03  Authentication > Users: quantos usuários existem, com e-mail mascarado e data do último login. Confirme que o admin de teste existe.
F04  Storage: para os buckets "obras" e "logos": público? limite de tamanho? tipos permitidos (esperado: jpeg, png, webp, heic, heif e limite de 10 MB)?
F05  Database > Tables: para as tabelas usuarios_admin, clientes, empreendimentos, empreendimento_etapas, fotos, campanhas_pesquisa, respostas_pesquisa, cliente_empreendimentos e rate_limit: RLS está ATIVA? Quantas linhas? (a rate_limit terá linhas dos testes). Alguma tabela sem RLS? Liste as policies de cada tabela (só os nomes).
F06  Database > Backups: plano do projeto (Free/Pro), existem backups diários? PITR está ativo? Data do último backup.
F07  Logs (API, Auth, Postgres, Storage) da última hora: liste erros 4xx/5xx e mensagens de erro relevantes (sem expor tokens).
F08  Project Settings: plano, região, e se o projeto pode ser PAUSADO por inatividade (comum no plano Free). Network restrictions / SSL enforcement: estado.

--- BLOCO G: TESTES QUE O HUMANO FAZ (você só registra NAO_TESTADO e deixa a lista) ---
G01  Enviar 3 fotos JPEG comuns na obra "ZZ Teste QA".
G02  Enviar 1 foto HEIC de iPhone. Deve aparecer no portal e abrir no Chrome.
G03  Enviar um arquivo de texto renomeado para .jpg. Deve ser recusado com "Formato não aceito...".
G04  Enviar uma foto com mais de 4 MB (deve ser reduzida no navegador e aceita).
G05  Baixar uma foto enviada e conferir se não tem GPS/EXIF.
G06  Importar o CSV de exemplo abaixo em Clientes > Importar. Esperado: 2 clientes importados; vínculo com "ZZ Teste QA"; aviso "Empreendimento não encontrado ... Inexistente".
G07  Abrir o Excel exportado da pesquisa e conferir que nenhuma célula é tratada como fórmula.

CSV de exemplo (salvar como teste.csv):
cpf,nome,email,telefone,empreendimento
529.982.247-25,ZZ Cliente CSV,csv@teste.invalid,(98) 99999-0000,ZZ Teste QA;Inexistente
390.533.447-05,=1+1,email-invalido,abc,

=====================================================================
5. LIMPEZA (antes do bloco H)
=====================================================================
L01  Logado como admin de teste: excluir a obra "ZZ Teste QA" (Obras > Excluir). Confirmar que sumiu e que o vínculo do Cliente B foi embora com ela.
L02  Excluir quaisquer clientes de teste criados (nomes começando com "ZZ", ou "=1+1"). NÃO exclua os 2 clientes originais.
L03  Confirmar que "Marina Península" continua com as mesmas fotos e que o Cliente A continua vinculado a ela.
L04  Sair (logout).

=====================================================================
6. BLOCO H: LIMITES DE TENTATIVA (por último)
=====================================================================
H01  Na tela de login do cliente, tentar 7 vezes seguidas o CPF 111.444.777-35 (válido, inexistente). Esperado: em algum momento aparece "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente." e continua aparecendo até o fim. Como o teste A11 já usou 1 tentativa, o bloqueio deve aparecer, no máximo, na 5ª tentativa desta série (antes, se ainda estiver na janela de 15 min). Anote o número da tentativa em que apareceu pela primeira vez.
H02  Na tela /admin/login, tentar 7 vezes seguidas com o e-mail do admin de teste e senha ERRADA. Esperado: o bloqueio "Muitas tentativas seguidas..." aparece em algum momento (no máximo na 5ª tentativa desta série, pois logins anteriores dentro dos últimos 15 min também contam) e continua até o fim. Anote o número da tentativa em que apareceu pela primeira vez. (Isso trava o admin de teste por 15 min; é esperado.)

=====================================================================
7. FORMATO OBRIGATÓRIO DA RESPOSTA FINAL
=====================================================================
Sua resposta final deve ter EXATAMENTE duas partes, nesta ordem:

PARTE 1 — um único bloco de código JSON (válido, sem comentários, sem vírgula sobrando, sem segredos, textos curtos), com o título "RELATORIO_JSON" na linha acima dele, neste formato:

~~~json
{
  "meta": {
    "inicio": "AAAA-MM-DD HH:MM",
    "fim": "AAAA-MM-DD HH:MM",
    "navegador": "",
    "url_base": "",
    "commit_em_producao": "",
    "observacoes_gerais": ""
  },
  "resumo": { "total": 0, "pass": 0, "fail": 0, "parcial": 0, "bloqueado": 0, "nao_testado": 0 },
  "testes": [
    {
      "id": "A01",
      "titulo": "",
      "resultado": "PASS | FAIL | PARCIAL | BLOQUEADO | NAO_TESTADO",
      "esperado": "",
      "obtido": "",
      "evidencia": { "url_final": "", "status_http": "", "texto_na_tela": "", "console": "" },
      "severidade": "critica | alta | media | baixa | info | null",
      "observacao": ""
    }
  ],
  "cabecalhos_http": {
    "pagina_home": { "Strict-Transport-Security": "", "X-Content-Type-Options": "", "X-Frame-Options": "", "Referrer-Policy": "", "Permissions-Policy": "", "Cross-Origin-Opener-Policy": "", "Content-Security-Policy-Report-Only": "", "X-Powered-By": "ausente | valor" },
    "pagina_admin_login": {}
  },
  "csp_violacoes": [ { "pagina": "", "diretiva": "", "recurso_bloqueado": "" } ],
  "vercel": {
    "deploy_estado": "", "commit": "", "warnings_build": [], "erros_runtime_24h": [],
    "variaveis": [ { "nome": "", "tipo": "Sensitive | Plain", "ambientes": [] } ],
    "plano": "", "regiao_functions": "", "firewall": "", "deployment_protection": "", "node": ""
  },
  "supabase": {
    "advisors": [ { "tipo": "seguranca | performance", "nome": "", "nivel": "", "objeto": "" } ],
    "auth": { "senha_vazada_protecao": "", "senha_minima": "", "confirmar_email": "", "smtp": "", "jwt_expiracao": "", "sessao_inatividade_ou_timebox": "", "mfa_totp": "", "site_url": "", "redirect_urls": [], "captcha": "" },
    "usuarios": { "total": 0, "admin_teste_existe": true },
    "storage": [ { "bucket": "", "publico": true, "limite_tamanho": "", "tipos_permitidos": [] } ],
    "tabelas": [ { "nome": "", "rls": true, "linhas": 0, "policies": [] } ],
    "backups": { "plano": "", "backup_diario": "", "pitr": "", "ultimo_backup": "" },
    "logs_erros_1h": [],
    "projeto": { "plano": "", "regiao": "", "pausa_por_inatividade": "" }
  },
  "achados_extras": [ { "titulo": "", "descricao": "", "severidade": "critica | alta | media | baixa | info", "onde": "" } ],
  "estado_final_dados": { "obra_zz_existe": false, "clientes_zz_existem": false, "marina_fotos": 0, "cliente_a_vinculado_marina": true, "respostas_pesquisa_ativa": 0 },
  "limitacoes": [ "o que você não conseguiu verificar e por quê" ]
}
~~~

PARTE 2 — um "RESUMO" em português, no máximo 15 linhas, para uma pessoa não técnica: o que está funcionando, o que falhou (do mais grave ao menos grave), e o que você não conseguiu testar.

Regras da saída: inclua TODOS os testes dos blocos A, B, C, D1, D2, E, F, G, L e H, mesmo os NAO_TESTADO. Para cada FAIL, "obtido" deve trazer a mensagem/comportamento exato observado. Não escreva nada fora dessas duas partes.
```

FIM DO PROMPT
