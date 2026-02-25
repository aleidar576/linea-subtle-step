

## Plano: Correcao UTM no Checkout de Loja + Exibicao nos Pedidos

---

### Problemas Encontrados

| Local | Problema | Gravidade |
|-------|----------|-----------|
| `LojaCheckout.tsx` - `buildCartData()` (linha 354) | `utms: {}` hardcoded vazio - UTMs NUNCA sao salvos no carrinho abandonado | CRITICO |
| `LojaCheckout.tsx` - `pedidosApi.create()` (linha 429) | `utms: {}` hardcoded vazio - UTMs NUNCA sao salvos no pedido | CRITICO |
| `LojaCheckout.tsx` - `handleGeneratePix()` (linha 402) | Chamada ao `/api/create-pix` nao envia `tracking` (utm, src, fbp, fbc) para a SealPay | CRITICO |
| `LojaPedidos.tsx` - Sheet de detalhes do pedido (linhas 438-460) | Nao exibe UTMs nos detalhes do pedido | MEDIO |
| `LojaPedidos.tsx` - Sheet de carrinho abandonado (linhas 551-561) | Ja exibe UTMs corretamente | OK |
| `CheckoutPage.tsx` (checkout demo/principal) | Ja envia UTMs corretamente em tudo | OK |
| Pedido criado ao gerar PIX com status `pendente` | Ja implementado em ambos checkouts | OK |

---

### Correcoes Planejadas

**Arquivo 1: `src/pages/loja/LojaCheckout.tsx`**

A) Importar `getSavedUtmParams` de `@/hooks/useUtmParams` (nao precisa do hook inteiro, apenas a funcao pura que le do sessionStorage).

B) Em `buildCartData()` (linha 354): trocar `utms: {}` por `utms: getSavedUtmParams()`.

C) Em `pedidosApi.create()` (linha 429): trocar `utms: {}` por `utms: getSavedUtmParams()`.

D) Em `handleGeneratePix()` (linhas 402-411): adicionar campos `tracking`, `fbp`, `fbc`, `user_agent` no body do fetch para `/api/create-pix`, usando `getSavedUtmParams()` e cookies do Facebook.

**Arquivo 2: `src/pages/painel/LojaPedidos.tsx`**

A) Na Sheet de detalhes do pedido (apos a secao "Observacoes Internas", antes do fechamento `</div>`), adicionar uma secao "UTMs" identica a que ja existe no carrinho abandonado. Exibira todas as chaves UTM do pedido (padrao e personalizadas) de forma dinamica.

---

### O que NAO sera alterado

- `vite.config.mts`
- Nenhum arquivo novo na pasta `api/`
- Logica do backend (`api/pedidos.js`) ja salva `utms` corretamente do body recebido
- `CheckoutPage.tsx` ja funciona corretamente
- Carrinho abandonado no painel ja exibe UTMs

### Resultado esperado

- UTMs (Meta, TikTok, personalizadas) serao capturadas e salvas em pedidos e carrinhos abandonados da loja
- UTMs serao enviadas para a SealPay ao gerar PIX
- Lojista podera ver UTMs nos detalhes de cada pedido e de cada carrinho abandonado
- UTMs personalizadas (qualquer `utm_*`) serao exibidas junto com as padrao

