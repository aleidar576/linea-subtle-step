
## Correcao: Token OAuth Appmax - URLSearchParams

### Problema
A API `/oauth2/token` da Appmax exige `application/x-www-form-urlencoded`, mas o codigo envia `application/json` em **dois arquivos**:

1. `api/loja-extras.js` (linhas 447-455) - fluxo de conexao `appmax-connect`
2. `lib/services/pagamentos/appmax.js` (linhas 54-62) - fluxo de pagamento `getToken()`

### Correcao

Nos dois arquivos, substituir:

```javascript
// DE (JSON - incorreto):
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
  grant_type: 'client_credentials',
  client_id: ...,
  client_secret: ...,
}),
```

```javascript
// PARA (URLSearchParams - correto):
const tokenParams = new URLSearchParams();
tokenParams.append('grant_type', 'client_credentials');
tokenParams.append('client_id', ...);
tokenParams.append('client_secret', ...);

// No fetch:
headers: {
  'Content-Type': 'application/x-www-form-urlencoded',
  'Accept': 'application/json',
},
body: tokenParams,
```

### Arquivos Afetados
- `api/loja-extras.js` - linhas 447-455
- `lib/services/pagamentos/appmax.js` - linhas 54-62

Nenhuma outra alteracao necessaria. O restante do fluxo permanece intacto.
