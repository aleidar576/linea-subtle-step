

## Fase 2: Shoppertainment — Exibição de Vídeos na Página Pública do Produto

### 1. Instalação

Adicionar `@mux/mux-player-react` ao `package.json`.

### 2. Novo Componente: `src/components/loja/ProductVideos.tsx`

Componente que recebe `videos` (array de `{ playback_id, asset_id }`) e `layout` (`'stories' | 'carousel' | 'auto'`). Retorna `null` se `videos` estiver vazio.

**Regra do vídeo unico (length === 1):** Ignora layout. Renderiza `<MuxPlayer>` em destaque com `aspect-ratio: 9/16`, `max-h-[600px]`, `preload="none"`, `poster` via thumbnail estática do Mux.

**Layout Stories (length > 1, layout === 'stories' ou 'auto'):** Container horizontal scrollavel com bolinhas (`w-20 h-20 rounded-full`). Cada bolinha usa `animated.webp` do Mux como preview. Ao clicar, abre `<Dialog>` fullscreen com `<MuxPlayer autoPlay>`.

**Layout Carousel (length > 1, layout === 'carousel'):** Container horizontal scrollavel com cards verticais (`w-[250px]`). Cada card embute `<MuxPlayer>` com `preload="none"`, `muted`, e `poster` thumbnail. O player nativo exibe o botao de play sobre o poster.

Estado interno: `activeVideoIndex` para controlar qual video esta aberto no Dialog (modo stories).

### 3. Ponto de Injecao em `LojaProduto.tsx`

Entre a linha 653 (`<BlockDivider />` apos "Sobre o Produto") e a linha 655 (`BLOCO 6: Avaliacoes`), inserir:

```tsx
{product.videos?.length > 0 && (
  <>
    <ProductVideos videos={product.videos} layout={product.video_layout || 'auto'} />
    <BlockDivider />
  </>
)}
```

Import do componente no topo do arquivo.

### 4. Arquivos

| Arquivo | Acao |
|---|---|
| `package.json` | Adicionar `@mux/mux-player-react` |
| `src/components/loja/ProductVideos.tsx` | Criar componente com 3 variantes |
| `src/pages/loja/LojaProduto.tsx` | Import + inserir entre linhas 653-655 |

