
# Blindagem Financeira do Modo Amigo - 3 Camadas

## Resumo
Proteger lojistas VIP (`modo_amigo: true`) contra qualquer cobranca Stripe, atuando em 3 pontos criticos do fluxo financeiro.

---

## 1. Cron de Taxas (`api/loja-extras.js`, linha ~90)

Adicionar `modo_amigo: { $ne: true }` na query do `Lojista.find()` que busca lojistas com taxas pendentes.

**Antes:**
```javascript
const lojistas = await Lojista.find({
  taxas_acumuladas: { $gt: 0 },
  data_vencimento_taxas: { $lte: now },
  stripe_customer_id: { $ne: null },
  status_taxas: { $ne: 'bloqueado' },
});
```

**Depois:**
```javascript
const lojistas = await Lojista.find({
  taxas_acumuladas: { $gt: 0 },
  data_vencimento_taxas: { $lte: now },
  stripe_customer_id: { $ne: null },
  status_taxas: { $ne: 'bloqueado' },
  modo_amigo: { $ne: true },
});
```

---

## 2. Acumulo de Taxas (`api/pedidos.js`, linhas ~249-275)

Dentro do bloco `if (novoStatus === 'pago' && pedido.total > 0)`, apos buscar o `lojistaDoc`, verificar `lojistaDoc.modo_amigo === true`. Se for VIP, pular todo o calculo e salvar zero taxas.

**Alteracao:** Adicionar `if (lojistaDoc.modo_amigo) { ... skip ... }` antes do calculo da taxa, com log informativo.

---

## 3. Toggle Modo Amigo com Cancelamento Stripe (`api/admins.js`, linhas ~160-165)

Expandir o handler `action === 'tolerancia'` para:

**Cenario A (Ativando VIP, `modo_amigo: true`):**
- Se o lojista tem `stripe_subscription_id`, cancelar a assinatura via `stripe.subscriptions.cancel()`
- Limpar `stripe_subscription_id` e `stripe_price_id` (manter `stripe_customer_id`)
- Zerar `taxas_acumuladas` para evitar cobracas residuais
- Registrar evento no `historico_assinatura`

**Cenario B (Revogando VIP, `modo_amigo: false`):**
- Apenas salvar `modo_amigo: false`
- NAO recriar assinatura (lojista tera que assinar manualmente)
- Os middlewares existentes (`lib/auth.js`, `api/lojas.js`) bloqueiam automaticamente

---

## Arquivos Modificados

| Arquivo | Alteracao |
|---|---|
| `api/loja-extras.js` | +1 filtro na query do cron |
| `api/pedidos.js` | +guard `modo_amigo` no acumulo de taxas |
| `api/admins.js` | Cancelamento Stripe ao ativar VIP, limpeza de taxas |
