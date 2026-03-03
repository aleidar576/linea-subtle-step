

## Diagnóstico dos 2 problemas

### Problema 1: Status muda de `trialing` para `active` ao pagar taxas manualmente

**Causa raiz:** Quando `pagarTaxasManual` cria uma invoice avulsa e a paga via `stripe.invoices.pay()`, o Stripe dispara o webhook `invoice.payment_succeeded`. No handler desse evento (linha 132-136), a condição só protege o caso `billing_reason === 'subscription_create'`. Para invoices avulsas de taxas, o `billing_reason` será `manual` — caindo no `else` que seta `subscription_status = 'active'`.

**Correção em `lib/services/assinaturas/stripe.js`**, handler `invoice.payment_succeeded` (linhas 130-137):

Expandir a condição para também preservar `trialing` quando a invoice NÃO é de subscription (invoices avulsas de taxas não devem alterar o status da assinatura):

```javascript
if (lojista) {
  // Só mudar para 'active' se for renovação real da assinatura
  if (lojista.subscription_status === 'trialing' && billingReason !== 'subscription_cycle') {
    console.log(`[STRIPE-WEBHOOK] ℹ️ Invoice não-subscription durante trial — mantendo 'trialing'`);
  } else if (billingReason === 'manual') {
    console.log(`[STRIPE-WEBHOOK] ℹ️ Invoice manual (taxas) — não altera subscription_status`);
  } else {
    lojista.subscription_status = 'active';
  }
}
```

Lógica: só seta `active` quando `billing_reason === 'subscription_cycle'` (renovação real do plano). Invoices manuais e de criação nunca alteram o status.

### Problema 2: Pagamento manual não aparece no Stripe

**Causa provável:** O valor em centavos pode estar sendo `0` se `taxas_acumuladas` no banco era `0` ou muito pequeno. Ou o `stripe.invoices.pay()` pode estar falhando silenciosamente (o catch no `api/loja-extras.js` retorna erro genérico "Cartão recusado").

**Correção em `lib/services/assinaturas/stripe.js`**, função `pagarTaxasManual` (linhas 385-423):

- Adicionar logs detalhados antes de cada chamada Stripe para rastrear o fluxo
- Validar que `amountCents > 0` antes de prosseguir
- Garantir que a invoice criada realmente contém o item (log do invoice.id)

```javascript
console.log(`[PAGAR-TAXAS-MANUAL] Lojista: ${lojista.email}, taxas: R$${lojista.taxas_acumuladas}, centavos: ${amountCents}, customer: ${lojista.stripe_customer_id}`);

if (amountCents <= 0) {
  return { error: 'Valor de taxas inválido para cobrança', httpStatus: 400 };
}

// ... invoiceItems.create + invoices.create + invoices.pay com logs
console.log(`[PAGAR-TAXAS-MANUAL] ✅ Invoice ${invoice.id} criada e paga`);
```

Também melhorar o catch em `api/loja-extras.js` para logar o erro real (atualmente só loga `err.message` mas retorna mensagem genérica).

### Ação manual necessária
Corrigir `subscription_status` no MongoDB de volta para `"trialing"` (foi alterado para `active` pelo bug).

