

## Problema

Em `src/App.tsx` linhas 173-174, ambas as rotas `/admin/integracoes` e `/admin/gateways` apontam para `AdminGateways`. A página `AdminIntegracoes` (que contém as integrações gerais do sistema — Resend, Bunny.net, Stripe Webhooks) existe no código mas não está sendo importada nem roteada.

## Correção (1 arquivo: `src/App.tsx`)

1. **Adicionar import** do `AdminIntegracoes`:
```tsx
import AdminIntegracoes from './pages/AdminIntegracoes';
```

2. **Corrigir as rotas** (linhas 173-174):
```tsx
<Route path="integracoes" element={<AdminIntegracoes />} />
<Route path="gateways" element={<AdminGateways />} />
```

Isso restaura a separação correta: `/admin/integracoes` → página de integrações gerais (upload Bunny, Resend, Stripe webhook) e `/admin/gateways` → página de gateways de pagamento.

