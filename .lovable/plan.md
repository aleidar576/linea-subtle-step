

## Correção: Header Authorization malformado nas chamadas Appmax

### Problema
O `access_token` retornado pela Appmax pode vir aninhado em `{"data":{"access_token":"..."}}` (assim como o campo `token` na conexão). Se `tokenData.access_token` for `undefined`, o header vira `Authorization: Bearer undefined`, causando o erro "Invalid key=value pair (missing equal-sign) in Authorization header".

### Alterações (1 arquivo)

**Arquivo:** `lib/services/pagamentos/appmax.js`

#### 1. Função `getToken` (linha 74) — Captura resiliente do access_token

De:
```javascript
return { access_token: tokenData.access_token, apiUrl };
```

Para:
```javascript
const access_token = String(
  tokenData.access_token || tokenData.data?.access_token || tokenData.token || tokenData.data?.token || ''
);
if (!access_token) {
  console.error('[APPMAX] Token vazio após parsing:', JSON.stringify(tokenData));
  throw new Error('Token de acesso Appmax vazio');
}
return { access_token, apiUrl };
```

Isso garante que o token é extraído independentemente do formato de resposta e sempre é uma string limpa.

#### 2. Função `createPayment` (linhas 161-164) — Headers completos + sanitização

De:
```javascript
headers: {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${access_token}`,
},
```

Para:
```javascript
headers: {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': `Bearer ${String(access_token).trim()}`,
},
```

#### 3. Função `getStatus` (linha 242) — Headers completos + sanitização

De:
```javascript
headers: { Authorization: `Bearer ${access_token}` },
```

Para:
```javascript
headers: {
  'Authorization': `Bearer ${String(access_token).trim()}`,
  'Accept': 'application/json',
},
```

### O que NÃO muda
- Frontend (`LojaCheckout.tsx`, `CheckoutPage.tsx`, `api.ts`) — não enviam Authorization, estão corretos.
- `getToken` OAuth flow (URLSearchParams) — já corrigido anteriormente, não será tocado.
- Nenhum outro arquivo será alterado.

