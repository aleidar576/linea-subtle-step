

# Revisao Geral — Fases 1-4 do Strangler Fig

## Resultado da auditoria

### Backend (`api/`) — OK
Todos os 4 microsserviços (`midia.js`, `fretes.js`, `assinaturas.js`, `gateways.js`) estao corretos e independentes. O `loja-extras.js` nao tem nenhum import orfao — so usa os models que precisa (Cupom, Loja, Product, TrackingPixel, Pagina, Setting, Lead). O `vercel.json` tem todos os rewrites e o cron atualizado. Nenhum problema encontrado no backend.

### Frontend — 1 problema encontrado

**`src/pages/AdminIntegracoes.tsx` (linhas 221, 226):** A URL do webhook Stripe exibida ao admin ainda aponta para `/api/loja-extras?scope=stripe-webhook` em vez de `/api/assinaturas?scope=stripe-webhook`. Isto e um bug da Fase 3 — a URL visual que o admin copia para colar no dashboard da Stripe esta desatualizada.

### Frontend — escopos restantes no `loja-extras` (NAO sao bugs)

Os seguintes escopos ainda estao corretamente apontando para `/api/loja-extras` porque **nao foram extraidos** (sao os dominios restantes: Cupons, Temas, Pixels, Paginas, Leads, categorias-publico, global-domain, category-products, cupons-popup):
- `cuponsApi` — `/loja-extras?scope=cupom*`
- `temasApi` — `/loja-extras?scope=tema`
- `pixelsApi` — `/loja-extras?scope=pixel*`
- `paginasApi` — `/loja-extras?scope=pagina*`
- `leadsApi` — `/loja-extras?scope=lead*`
- `lojaPublicaApi.getCategorias` — `/loja-extras?scope=categorias-publico`
- `platformApi.getDomain` — `/loja-extras?scope=global-domain`
- `categoryProductsApi` — `/loja-extras?scope=category-products`
- `cuponsPopupApi.getBulk` — `/loja-extras?scope=cupons-popup`

Estes estao **corretos** — esses escopos ainda existem em `loja-extras.js`.

## Plano de correcao

Um unico fix:

**Arquivo:** `src/pages/AdminIntegracoes.tsx` (linhas 221 e 226)

Substituir:
```
/api/loja-extras?scope=stripe-webhook
```
Por:
```
/api/assinaturas?scope=stripe-webhook
```

Isso alinha a URL visual com o microsserviço real, evitando que o admin configure o webhook Stripe com a URL errada.

