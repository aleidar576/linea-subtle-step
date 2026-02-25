

## Plano: Protecao contra Estornos (charge.refunded)

### Contexto

O webhook Stripe em `api/loja-extras.js` ja trata 5 eventos. Falta o tratamento de estornos/chargebacks para revogar acesso premium imediatamente.

### Alteracao

**Arquivo unico: `api/loja-extras.js`**

Adicionar um novo bloco `if` para o evento `charge.refunded` logo apos o bloco `customer.subscription.deleted` (apos linha 278), seguindo o mesmo padrao dos handlers existentes:

```text
// === charge.refunded ===
if (event.type === 'charge.refunded') {
  const charge = event.data.object;
  const customerId = charge.customer;
  console.log(`[STRIPE-WEBHOOK] charge.refunded — customerId=${customerId}`);
  const lojista = await Lojista.findOne({ stripe_customer_id: customerId });
  if (lojista) {
    lojista.subscription_status = 'canceled';
    lojista.plano = 'free';
    lojista.plano_id = null;
    lojista.stripe_subscription_id = null;
    lojista.data_vencimento = null;
    lojista.cancel_at_period_end = false;
    lojista.cancel_at = null;
    await lojista.save();
    console.log(`[STRIPE-WEBHOOK] Estorno processado. Acesso premium revogado para customer: ${customerId} (${lojista.email})`);
  } else {
    console.warn(`[STRIPE-WEBHOOK] Nenhum lojista com stripe_customer_id=${customerId}`);
  }
}
```

### Detalhes Tecnicos

- O bloco segue o padrao identico ao `customer.subscription.deleted`: busca por `stripe_customer_id`, reseta todos os campos de assinatura para o estado "free" e limpa campos de cancelamento programado.
- Nenhum arquivo novo sera criado (continua nos 12 existentes).
- O `bodyParser` desativado e a funcao `parseBody` permanecem intactos.
- `vite.config.mts` nao sera alterado.
- A logica de reset e 100% derivada do banco (zero hardcode de IDs).

### Resumo

| Arquivo | Alteracao |
|---------|-----------|
| `api/loja-extras.js` | +1 handler `charge.refunded` (inserido apos linha 278) |

