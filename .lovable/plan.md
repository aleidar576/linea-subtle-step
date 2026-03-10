

## Diagnóstico da Cobrança Dupla

### O que aconteceu (cronologia reconstruída)

1. **09:54** — Stripe renovou automaticamente a mensalidade do plano (subscription_cycle) → webhook `invoice.payment_succeeded` → log "Mensalidade do plano renovada com sucesso", status mudou de `trialing` para `active`
2. **09:54** — Cron rodou, encontrou R$ 10,00 de taxas, criou invoice manual, finalizou e pagou com sucesso via `stripe.invoices.pay()` → zerou `taxas_acumuladas`
3. **11:11** — Stripe tentou cobrar a **mesma invoice manual** novamente por conta do `auto_advance: true` → como já estava paga/sem saldo, falhou → webhook `invoice.payment_failed` com `billing_reason: manual` → marcou `status_taxas: 'falha'` e `tentativas_taxas: 1`

### Causa raiz

O parâmetro **`auto_advance: true`** na criação da invoice diz ao Stripe: "tente cobrar automaticamente". Mas logo em seguida o código chama `finalizeInvoice()` + `pay()` manualmente. Resultado: **duas tentativas de cobrança na mesma invoice** — uma explícita (sucesso) e uma automática do Stripe (falha).

Isso acontece em **dois lugares** do código:
- `processarCronTaxas()` (linha ~370 de `stripe.js`)
- `pagarTaxasManual()` (linha ~440 de `stripe.js`)

### Correção

Mudar `auto_advance: true` para **`auto_advance: false`** nas duas funções, já que o código faz a cobrança explicitamente via `finalizeInvoice()` + `pay()`.

**Arquivo:** `lib/services/assinaturas/stripe.js`

1. Em `processarCronTaxas` — alterar `auto_advance: false` na criação da invoice
2. Em `pagarTaxasManual` — alterar `auto_advance: false` na criação da invoice

Duas linhas de mudança, sem impacto em nenhuma outra parte do sistema.

### Bug secundário (menor)

O webhook `invoice.payment_succeeded` registra "Mensalidade do plano renovada com sucesso" mesmo para invoices manuais de taxas. Deveria verificar o `billing_reason` e logar a mensagem correta. Posso corrigir isso também.

