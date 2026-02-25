
## Plano: Varredura Completa do Sistema de Pixels

---

### Auditoria - Problemas Encontrados

| # | Local | Problema | Gravidade |
|---|-------|----------|-----------|
| 1 | `LojaLayout.tsx` - `firePixelEvent()` (linha 79-83) | So dispara Facebook e TikTok. **Google Ads e GTM sao completamente ignorados** em todas as paginas da loja (ViewContent, AddToCart, InitiateCheckout, AddPaymentInfo) | CRITICO |
| 2 | `LojaLayout.tsx` - init pixels (linhas 578-584) | So inicializa Facebook e TikTok. **Google Ads e GTM nunca sao carregados** nas lojas dos lojistas | CRITICO |
| 3 | `LojaLayout.tsx` - `firePixelEvent()` | Nao respeita `events` do pixel (o lojista seleciona quais eventos disparar, mas todos sao disparados sempre) | MEDIO |
| 4 | `LojaLayout.tsx` - `firePixelEvent()` | Nao respeita `trigger_pages` do pixel (homepage, categorias, checkout, produtos) - dispara em todas as paginas | MEDIO |
| 5 | `api/create-pix.js` webhook (linha 22-44) | Quando PIX e pago, marca pedido como "pago" mas **NAO chama o tracking-webhook** para disparar Purchase via CAPI (Facebook/TikTok/Google Ads server-side) | CRITICO |
| 6 | `api/tracking-webhook.js` (linhas 197-200) | Busca pixels sem filtro de `loja_id` - dispara Purchase para TODOS os pixels de TODAS as lojas, nao apenas da loja do pedido | CRITICO |
| 7 | `LojaSucesso.tsx` | Pagina de sucesso nao dispara evento Purchase no client-side | MEDIO |
| 8 | `LojaCheckout.tsx` | Nao dispara Purchase apos confirmacao de pagamento do PIX (polling detecta pagamento mas nao dispara evento) | MEDIO |
| 9 | `models/WebhookLog.js` | Falta `loja_id` no log do webhook (campo existe no schema mas nunca e preenchido no handler) | BAIXO |

---

### Correcoes Planejadas

**Arquivo 1: `src/components/LojaLayout.tsx`**

A) Adicionar funcoes `initGoogleAds(conversionId)` e `initGTM(containerId)` (copiar logica do useTracking.tsx que ja tem implementacao completa).

B) Atualizar o `useEffect` de init (linha 578-584) para inicializar os 4 tipos de pixel: facebook, tiktok, google_ads, gtm.

C) Reescrever `firePixelEvent()` para:
   - Aceitar a lista de pixels como parametro (via contexto ou variavel de modulo)
   - Disparar para as 4 plataformas (FB, TT, GAds, GTM)
   - Respeitar os `events` configurados por pixel (so disparar se o evento esta na lista do pixel)
   - Respeitar os `trigger_pages` configurados (mapear rota atual para tipo de pagina)

D) Exportar funcao auxiliar `setActivePixels(pixels)` para que o LojaLayout injete os pixels no modulo apos carregar.

**Arquivo 2: `api/create-pix.js`**

A) Quando o webhook recebe status `paid` e marca o pedido como pago, buscar o `loja_id` do pedido e disparar o tracking-webhook internamente (chamar as funcoes de dispatch do Facebook CAPI, TikTok Events API e Google Ads, filtradas pelo `loja_id`).

B) Importar `TrackingPixel` e as funcoes de dispatch, ou fazer um fetch interno para `/api/tracking-webhook` com os dados do pedido.

**Arquivo 3: `api/tracking-webhook.js`**

A) Adicionar filtro por `loja_id` na busca de pixels ativos (linha 197). O body do webhook deve incluir `loja_id` para filtrar corretamente.

B) Preencher `loja_id` no WebhookLog.

**Arquivo 4: `src/pages/loja/LojaCheckout.tsx`**

A) Quando o polling detecta pagamento confirmado (antes do redirect para `/sucesso`), disparar `firePixelEvent('Purchase', {...})` com os dados da compra.

**Arquivo 5: `src/pages/loja/LojaSucesso.tsx`**

A) Ler dados da compra do `sessionStorage` (se disponivel) e disparar `firePixelEvent('Purchase', {...})` como fallback.

---

### Resumo de Impacto

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/LojaLayout.tsx` | Adicionar Google Ads + GTM, respeitar events/trigger_pages |
| `api/create-pix.js` | Disparar CAPI Purchase ao confirmar pagamento |
| `api/tracking-webhook.js` | Filtrar por loja_id |
| `src/pages/loja/LojaCheckout.tsx` | Disparar Purchase client-side ao confirmar pagamento |
| `src/pages/loja/LojaSucesso.tsx` | Disparar Purchase como fallback |

### O que NAO sera alterado
- `vite.config.mts`
- Nenhum arquivo novo na pasta `api/`
- `useTracking.tsx` (usado apenas no checkout demo, nao nas lojas dos lojistas)
- Painel do lojista (`LojaPixels.tsx`) - CRUD de pixels funciona corretamente
