

## Correcao: Captura do token/hash na resposta da Appmax

### Problema
A Appmax retorna `{"data":{"token":"..."}}` mas o codigo atual (linha 494) tenta ler apenas `authData.hash || authData.data?.hash`, ignorando o campo `token`.

### Alteracao

**Arquivo:** `api/loja-extras.js` -- linha 494

De:
```javascript
const hash = authData.hash || authData.data?.hash;
```

Para:
```javascript
const hash = authData.data?.token || authData.token || authData.hash || authData.data?.hash;
```

Essa unica linha resolve o problema. A URL de redirecionamento na linha 501 (`redirect_url: \`${redirectBase}/appstore/integration/${hash}\``) ja esta correta e usa `redirectBase` que vem das URLs configuradas no Admin.

Nenhuma outra alteracao necessaria.
