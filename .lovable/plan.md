## ✅ Correção Definitiva: Dual-Mode Auth Appmax (IMPLEMENTADO)

### Problema
Header `Authorization: Bearer {token}` bloqueado pelo Firewall (Vercel/AWS WAF) — erro "Invalid key=value pair (missing equal-sign)".

### Solução Implementada
Função `appmaxFetch()` com fallback automático:

1. **Modo 1 (primário)**: `access-token` no body JSON (POST) ou query param (GET) — sem header Authorization
2. **Modo 2 (fallback)**: Se modo 1 retorna 401/403, retenta com header `Authorization: Bearer {token}`

### Arquivos alterados
- `lib/services/pagamentos/appmax.js` — adicionada `appmaxFetch()`, refatoradas `createPayment` e `getStatus`
- `src/services/api.ts` — skipAuth para `/process-payment`
- `src/pages/painel/LojaGateways.tsx` — limpeza de URL após OAuth

### Status: PRONTO PARA DEPLOY
