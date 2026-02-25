## Fase 14: Smart Retry + Regularização Manual de Taxas — ✅ CONCLUÍDO

### Arquivos Alterados

| Arquivo | Alteração |
|---------|-----------|
| `vercel.json` | Schedule do cron alterado para `0 12 * * *` (12h UTC = 09h BRT) |
| `models/Lojista.js` | +2 campos: `tentativas_taxas` (Number), `status_taxas` (enum ok/falha/bloqueado) |
| `api/loja-extras.js` | Smart retry no `cron-taxas` (3 tentativas, +24h, bloqueio) + novo escopo `pagar-taxas-manual` |
| `src/services/saas-api.ts` | +2 campos em `LojistaProfile` + método `pagarTaxasManual` em `stripeApi` |
| `src/pages/painel/LojaAssinatura.tsx` | Banners condicionais (amarelo/vermelho) + botão "Regularizar Pagamento Agora" |
| `README.md` | Documentação completa do Smart Retry, endpoint manual e campos de retry |

### Regras de Negócio

- Cron roda às 09h BRT (12h UTC) — horário comercial
- Máximo 3 tentativas automáticas com intervalo de 24h
- `status_taxas`: `ok` → `falha` → `bloqueado` (após 3 falhas)
- Lojistas `bloqueado` são ignorados pelo Cron — só pagam via botão manual
- `taxas_acumuladas` NUNCA é zerado em caso de falha
