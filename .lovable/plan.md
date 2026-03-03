

## Análise

O código **já implementa os 3 passos** corretamente em ambas as funções (`pagarTaxasManual` linhas 407-421 e `processarCronTaxas` linhas 332-343):

1. `stripe.invoiceItems.create(...)` ✅
2. `stripe.invoices.create({ customer, auto_advance: true })` ✅  
3. `stripe.invoices.pay(invoice.id)` ✅

O fluxo está correto no código. O problema real pode ser outro:

### Possível causa: Invoice sendo anexada à subscription existente

Quando um customer tem uma subscription ativa, `stripe.invoices.create()` pode estar criando a invoice **vinculada à subscription** em vez de uma invoice avulsa. Isso faz com que o `invoiceItem` pendente seja absorvido pela próxima fatura da subscription, em vez de gerar uma cobrança imediata independente.

### Correção necessária

Adicionar `collection_method: 'charge_automatically'` e **não vincular à subscription** passando explicitamente parâmetros que garantam uma invoice avulsa e independente. A Stripe API permite isso, mas o comportamento padrão pode puxar pending items para a subscription.

### Plano de implementação

**Arquivo:** `lib/services/assinaturas/stripe.js`

1. **`pagarTaxasManual`** (linhas 415-421): Na criação da invoice, adicionar `collection_method: 'charge_automatically'` e `pending_invoice_items_behavior: 'exclude'` para garantir que a invoice seja independente da subscription. Depois usar `stripe.invoices.finalizeInvoice(invoice.id)` antes de `stripe.invoices.pay()` para forçar a finalização:

```javascript
const invoiceItem = await stripe.invoiceItems.create({
  customer: lojista.stripe_customer_id,
  amount: amountCents,
  currency: 'brl',
  description: `Regularização manual de taxas — R$ ${lojista.taxas_acumuladas.toFixed(2)}`,
});

const invoice = await stripe.invoices.create({
  customer: lojista.stripe_customer_id,
  auto_advance: true,
  collection_method: 'charge_automatically',
  pending_invoice_items_behavior: 'include',
});

await stripe.invoices.finalizeInvoice(invoice.id);
const paidInvoice = await stripe.invoices.pay(invoice.id);
```

2. **`processarCronTaxas`** (linhas 339-343): Aplicar a mesma correção — adicionar `collection_method` e `finalizeInvoice` antes do `pay`.

3. Adicionar logs para confirmar o `invoice.status` após cada etapa (draft → open → paid).

### Detalhes técnicos

- `pending_invoice_items_behavior: 'include'` garante que os items pendentes recém-criados sejam incluídos nessa invoice
- `collection_method: 'charge_automatically'` força cobrança automática no cartão
- `finalizeInvoice()` transiciona de `draft` para `open`, permitindo o `pay()`
- Sem o `finalizeInvoice`, a invoice pode ficar em `draft` e o `pay()` pode não processar corretamente

