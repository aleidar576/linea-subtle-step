

## Fix: Permitir salvar Plano Sob Medida sem Stripe Price ID

### Problema
O `stripe_price_id` é `required: true` no schema Mongoose, impedindo salvar planos Sob Medida que não usam Stripe.

### Solução
Manter a obrigatoriedade condicional: o campo só é obrigatório quando `isSobMedida` não está ativo.

### Alteração

**`models/Plano.js` — linha 18**
- Trocar `required: true` por uma função condicional:
```js
stripe_price_id: {
  type: String,
  required: function() { return !this.isSobMedida; },
  default: ''
},
```

Isso garante que planos normais continuam exigindo o Stripe Price ID, mas planos Sob Medida podem ser salvos sem ele.

### Arquivo alterado
- `models/Plano.js`

