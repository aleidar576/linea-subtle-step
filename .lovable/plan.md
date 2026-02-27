
# Implementacao Appmax — CONCLUÍDA ✅

## Status: Todos os 5 pontos implementados

### 1. Motor de Pagamento (`lib/services/pagamentos/appmax.js`) ✅
- OAuth2 token via `getToken(lojista)` com sandbox/prod dinâmico
- `createPayment()` suporta PIX, credit_card e boleto
- SKU obrigatório com fallback: `item.sku || item.product_id`
- Installments (1-12) obrigatório para cartão
- `getStatus()` com DB-first + fallback API
- `handleWebhook()` com mapeamento rigoroso v3: approved→pago, declined→recusado, etc.

### 2. Roteamento Strategy (`lib/services/pagamentos/index.js`) ✅
- Factory ativada: `case 'appmax': return appmax`

### 3. Endpoint Renomeado (`api/process-payment.js`) ✅
- Roteamento dinâmico por `loja_id → gateway_ativo`
- `api/create-pix.js` mantido como alias
- `vercel.json` atualizado com nova rota

### 4. Webhook Appmax (`api/loja-extras.js`) ✅
- Scope público `appmax-webhook` antes do auth gate
- Delega para `appmaxService.handleWebhook()`

### 5. Checkout Multi-Método (`src/pages/loja/LojaCheckout.tsx`) ✅
- Injeção dinâmica do script `appmax.min.js`
- RadioGroup para PIX / Cartão / Boleto
- Formulário de cartão com máscaras + Select de parcelas (1-12x)
- Tokenização PCI via `window.Appmax.tokenize()`
- Fluxo unificado `handlePayment()` com tratamento por método
- Polling para PIX + Boleto, redirect direto para cartão aprovado

### 6. Campo SKU ✅
- `models/Product.js`: campo `sku` adicionado
- `src/pages/painel/LojaProdutos.tsx`: input na aba Básico
- `src/services/saas-api.ts`: tipo `sku` adicionado a `LojaProduct`

### 7. Referências Frontend Atualizadas ✅
- `CheckoutPage.tsx`: polling → `process-payment`
- `api.ts`: `paymentsApi.createPix` → `/process-payment`
- `LojaGateways.tsx`: webhook URL + sandbox test URL
