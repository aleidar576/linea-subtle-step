## Fase 13: Faturamento Duplo + Auditoria de Eventos — ✅ CONCLUÍDO

### Arquivos Alterados

| Arquivo | Alteração |
|---------|-----------|
| `models/Lojista.js` | +3 campos: `taxas_acumuladas`, `data_vencimento_taxas`, `historico_assinatura` |
| `models/Plano.js` | +3 campos: `taxa_transacao_percentual`, `taxa_transacao_trial`, `taxa_transacao_fixa` |
| `api/loja-extras.js` | +escopo `cron-taxas` (cobrança semanal via Stripe Invoice) + push auditoria em todos os eventos webhook |
| `api/pedidos.js` | +acúmulo de taxa quando pedido marcado como pago |
| `vercel.json` | +bloco `crons` para execução diária às 3h UTC |
| `src/services/saas-api.ts` | +campos em `Plano` e `LojistaProfile` |
| `src/services/api.ts` | +campos em `AdminLojista` |
| `src/pages/AdminPlanos.tsx` | +inputs para taxa percentual, taxa trial e taxa fixa |
| `src/pages/painel/LojaAssinatura.tsx` | Separação visual: Mensalidade vs Taxas Acumuladas + badge trial |
| `src/pages/AdminLojistas.tsx` | Histórico real de eventos + taxas acumuladas no Raio-X |
| `README.md` | Documentação completa da arquitetura de faturamento duplo |

### Variável de Ambiente Necessária

| Variável | Descrição |
|----------|-----------|
| `CRON_SECRET` | Segredo para autenticar o Cron de cobrança semanal |
