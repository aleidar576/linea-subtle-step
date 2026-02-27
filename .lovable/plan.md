
Objetivo imediato: corrigir definitivamente o erro `Missing form parameter: grant_type` na autenticação OAuth da Appmax, trocando apenas o formato do body de token em 2 pontos, sem alterar nenhuma outra lógica.

Estado atual auditado:
- `api/loja-extras.js` (`appmax-connect`) ainda usa:
  - `Content-Type: application/json`
  - `body: JSON.stringify(...)`
- `lib/services/pagamentos/appmax.js` (`getToken`) ainda usa:
  - `Content-Type: application/json`
  - `body: JSON.stringify(...)`

Plano de execução (replace literal, sem mudanças extras):

1) Arquivo `api/loja-extras.js`
- Local: bloco do `fetch(`${authUrl}/oauth2/token`...)` dentro de `scope === 'appmax-connect'`.
- Substituir exatamente o bloco JSON atual por:
  - `const tokenParams = new URLSearchParams();`
  - `append('grant_type', 'client_credentials')`
  - `append('client_id', APPMAX_CLIENT_ID)`
  - `append('client_secret', APPMAX_CLIENT_SECRET)`
  - `headers` com:
    - `'Content-Type': 'application/x-www-form-urlencoded'`
    - `'Accept': 'application/json'`
  - `body: tokenParams`

2) Arquivo `lib/services/pagamentos/appmax.js`
- Local: função `getToken(lojista)`, no `fetch(`${authUrl}/oauth2/token`...)`.
- Substituir exatamente o bloco JSON atual por:
  - `const tokenParams = new URLSearchParams();`
  - `append('grant_type', 'client_credentials')`
  - `append('client_id', appmaxCreds.client_id)`
  - `append('client_secret', appmaxCreds.client_secret)`
  - `headers` com:
    - `'Content-Type': 'application/x-www-form-urlencoded'`
    - `'Accept': 'application/json'`
  - `body: tokenParams`

3) Verificação pós-edição (sem refactor adicional)
- Confirmar que os dois `fetch` de `/oauth2/token` não têm mais `JSON.stringify`.
- Confirmar que em ambos existe:
  - `URLSearchParams`
  - `grant_type=client_credentials`
  - `Content-Type: application/x-www-form-urlencoded`
- Não tocar em outros `fetch` do arquivo (authorize, webhooks, etc.).

Resultado esperado
- Appmax passa a receber `grant_type` como form parameter válido.
- Erro `invalid_request / Missing form parameter: grant_type` deixa de ocorrer nesses dois fluxos (conexão no painel e token para pagamentos).

Se você aprovar, eu executo exatamente esses dois replaces literais e te devolvo a confirmação final com os trechos resultantes para auditoria.
