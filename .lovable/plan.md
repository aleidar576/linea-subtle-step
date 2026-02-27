
# Implementacao Appmax Completa (Plano Corrigido com 4 Exigencias)

## Visao Geral

Implementar o fluxo de pagamento Appmax de ponta a ponta: servico backend, roteamento dinamico, webhook, checkout multi-metodo com parcelamento, campo SKU no produto, e renomeacao do endpoint de pagamento.

---

## Estrutura de Arquivos

```text
lib/services/pagamentos/appmax.js         (novo - motor de pagamento Appmax)
lib/services/pagamentos/index.js          (editar - ativar roteamento appmax)
api/process-payment.js                    (novo - substitui create-pix.js)
api/create-pix.js                         (manter como redirect/alias para nao quebrar webhooks existentes)
api/loja-extras.js                        (editar - novo scope appmax-webhook)
models/Product.js                         (editar - adicionar campo sku)
src/pages/loja/LojaCheckout.tsx           (editar - checkout multi-metodo)
src/pages/painel/LojaProdutos.tsx         (editar - campo SKU na aba Basico)
src/contexts/LojaContext.tsx              (editar - expor metodos suportados)
src/components/LojaLayout.tsx             (editar - carregar metodos do gateway)
src/services/saas-api.ts                  (editar - apontar para process-payment)
src/pages/CheckoutPage.tsx                (editar - apontar polling para process-payment)
src/pages/painel/LojaGateways.tsx         (editar - webhook URL atualizada)
vercel.json                               (editar - adicionar rota process-payment)
```

---

## 1. Campo SKU no Produto

### Model (`models/Product.js`)
- Adicionar campo `sku: { type: String, default: '' }` no ProductSchema, logo apos o campo `slug`

### Editor (`src/pages/painel/LojaProdutos.tsx`)
- Na aba "Basico", Card "Informacoes Gerais", adicionar input "SKU (Codigo de Referencia)" logo abaixo do campo "Nome"
- Placeholder: `Ex: PROD-001`
- Campo opcional, sem validacao obrigatoria

### API Products (`api/products.ts`)
- Garantir que o campo `sku` seja aceito no POST/PUT (ja aceita campos genericos via spread, mas confirmar)

---

## 2. Backend: Motor de Pagamento Appmax (`lib/services/pagamentos/appmax.js`)

Seguir o padrao Strategy identico ao `sealpay.js`, exportando `{ getStatus, handleWebhook, createPayment }`.

### `getToken(lojistaId)`
- Busca `Lojista` por ID, extrai `gateways_config.appmax.client_id` e `client_secret`
- Busca URLs globais do Setting `gateways_ativos` (sandbox vs prod, conforme toggle do admin)
- POST para `{authUrl}/oauth2/token` com `grant_type: client_credentials`
- Retorna `{ access_token, apiUrl }`

### `createPayment({ amount, method, customer, shipping, items, card_token, installments, loja_id })`
- Carrega Loja -> Lojista para obter credenciais
- Chama `getToken(lojista._id)`
- Monta payload API v3 Appmax:
  - `customer`: firstname, lastname, email, telephone, cpf
  - `cart.products[]`: name, qty, price_unit, **sku** (usa `item.sku || item.product_id` como fallback obrigatorio)
  - `payment.method`: `credit_card` | `pix` | `boleto`
  - `payment.card_token`: token do SDK (se cartao)
  - `payment.installments`: numero de parcelas (1-12, obrigatorio para cartao)
  - `billing` e `shipping`: endereco
- POST para `{apiUrl}/v3/order` com Bearer Token
- Normaliza resposta:

```text
{
  success: true,
  method: 'pix' | 'credit_card' | 'boleto',
  txid: string (order_id da Appmax),
  qrcode?: string,
  pix_code?: string,
  pdf_url?: string,
  status?: string,
}
```

### `getStatus(txid)`
- Verifica DB primeiro (padrao sealpay)
- Fallback: GET `{apiUrl}/v3/order/{txid}` com token

### `handleWebhook({ body, req })`
- **Exigencia 3**: Mapeia status oficiais da API v3 Appmax:
  - `approved` / `authorized` -> `pago`
  - `declined` / `refused` -> `recusado`
  - `refunded` -> `estornado`
  - `chargeback` -> `chargeback`
  - `processing` / `pending` -> manter `pendente`
- Atualiza Pedido + dispara CAPI Purchase (mesmo padrao sealpay)

---

## 3. Ativar Roteamento (`lib/services/pagamentos/index.js`)

```javascript
const sealpay = require('./sealpay.js');
const appmax = require('./appmax.js');

function getPaymentService(gatewayId) {
  switch (gatewayId) {
    case 'appmax': return appmax;
    case 'sealpay':
    default: return sealpay;
  }
}
```

---

## 4. Renomear Endpoint: `api/process-payment.js`

### Novo arquivo (`api/process-payment.js`)
- Copia logica do `create-pix.js` mas com roteamento dinamico:
- Recebe `loja_id` do body, busca `Loja` -> `Lojista` -> `gateway_ativo`
- Chama `getPaymentService(gateway_ativo)` ao inves de hardcoded `'sealpay'`
- Para Appmax, passa campos extras: `method`, `card_token`, `installments`, `shipping`, `items`
- Mantém todos os scopes existentes (`status`, `webhook`) com roteamento dinamico (busca gateway pelo txid do pedido)

### Manter `api/create-pix.js` como alias
- Redireciona para `process-payment.js` internamente (para nao quebrar webhooks SealPay ja configurados que apontam para `/api/create-pix?scope=webhook`)

### `vercel.json`
- Adicionar rewrite: `{ "source": "/api/process-payment", "destination": "/api/process-payment.js" }`
- Manter rewrite existente de `create-pix` apontando para o alias

### Frontend: Atualizar todas as chamadas
- `LojaCheckout.tsx`: `/api/create-pix` -> `/api/process-payment`
- `CheckoutPage.tsx`: `/api/create-pix?scope=status` -> `/api/process-payment?scope=status`
- `src/services/api.ts`: rota `/create-pix` -> `/process-payment`
- `LojaGateways.tsx`: webhook URL e sandbox test URL

---

## 5. Webhook Appmax (`api/loja-extras.js`)

Novo scope publico (sem auth), antes do gate de autenticacao:

```text
POST /api/loja-extras?scope=appmax-webhook
Body: { order_id, status, ... }
```

- Busca Pedido por `pagamento.appmax_order_id` ou `pagamento.txid`
- Delega para `appmaxService.handleWebhook(body, req)`
- Retorna 200

---

## 6. Frontend: Checkout Multi-Metodo (`LojaCheckout.tsx`)

### 6a. Injecao Dinamica do Script Appmax
- `useEffect` que injeta `https://cdn.appmax.com.br/js/appmax.min.js` apenas se `gatewayAtivo === 'appmax'`

### 6b. Estado de metodo de pagamento
- Novo state `paymentMethod: 'pix' | 'credit_card' | 'boleto'` (default: primeiro metodo suportado)
- Novo state para dados do cartao: `cardData: { number, name, expiry, cvv }`
- Novo state para parcelas: `installments: number` (default: 1)

### 6c. UI da Etapa Payment
- Se `gatewayAtivo === 'sealpay'`: comportamento atual (apenas PIX, sem mudancas)
- Se `gatewayAtivo === 'appmax'` (ou qualquer gateway multi-metodo):
  - Renderizar radio buttons/tabs filtrados por `metodosSuportados`:
    - **PIX**: icone + label, mesmo fluxo visual (QR Code)
    - **Cartao de Credito**: formulario com inputs mascarados:
      - Numero do Cartao: mascara `0000 0000 0000 0000`
      - Nome no Cartao: texto livre
      - Validade: mascara `MM/AA`
      - CVV: 3-4 digitos
      - **Select de Parcelas** (1x a 12x): `<Select>` com opcoes calculadas (`valor / parcelas`)
    - **Boleto**: botao simples "Gerar Boleto"

### 6d. Fluxo Unificado `handlePayment`
- Refatorar `handleGeneratePix` para `handlePayment(method)`:
  1. Se cartao: tokenizar via `window.Appmax.tokenize()` -> obter `card_token`
  2. POST `/api/process-payment` com `{ method, card_token?, installments?, loja_id, amount, customer, shipping, items }`
  3. Resposta PIX: setar `pixData` (QR code + polling)
  4. Resposta Boleto: abrir PDF em nova aba + mostrar link
  5. Resposta Cartao aprovado: redirecionar direto para `/sucesso`
  6. Resposta Cartao recusado: exibir toast de erro
  7. Criar pedido (mesmo fluxo atual) com `pagamento.metodo` dinamico

### 6e. Polling de Status
- Atualizar URL de polling de `create-pix?scope=status` para `process-payment?scope=status`
- Polling ativo apenas para PIX e Boleto (cartao aprovado nao precisa polling)

---

## 7. Contexto da Loja (expor metodos suportados)

### LojaContext.tsx
- Ja possui `metodosSuportados: string[]` -- nenhuma mudanca necessaria

### LojaLayout.tsx
- Ja calcula `metodosSuportados` via `getGatewayById(gatewayAtivo).metodos` -- nenhuma mudanca necessaria

---

## 8. Sequencia de Implementacao

1. Adicionar campo `sku` ao Model Product + UI no editor de produtos
2. Criar `lib/services/pagamentos/appmax.js` (motor completo)
3. Ativar roteamento em `lib/services/pagamentos/index.js`
4. Criar `api/process-payment.js` com roteamento dinamico
5. Transformar `api/create-pix.js` em alias/redirect
6. Atualizar `vercel.json` com nova rota
7. Adicionar scope `appmax-webhook` em `api/loja-extras.js`
8. Refatorar `LojaCheckout.tsx` com multi-metodo, cartao, boleto e parcelamento
9. Atualizar todas as referencias frontend (`CheckoutPage.tsx`, `saas-api.ts`, `LojaGateways.tsx`)
