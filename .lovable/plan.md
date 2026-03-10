

## Correções no Vídeo Único — ProductVideos.tsx

### Alterações

**1. Título** (linha 27): Trocar `<h3>` com emoji por `<h2 className="text-xl font-bold text-foreground mb-4">Vídeo do Produto</h2>`.

**2. Container do vídeo** (linha 28): Remover a `div` wrapper com `max-h-[600px]` e `aspectRatio` inline. O MuxPlayer será filho direto do container principal.

**3. MuxPlayer** (linhas 29-33): Aplicar `className="w-full aspect-[9/16] rounded-xl overflow-hidden"` e `style={{ '--media-object-fit': 'cover', backgroundColor: 'transparent' }}`. Remover o estilo inline antigo.

**4. Emojis nos outros layouts** (linhas 44, 79): Trocar `🎥 Vídeos` por `Vídeos` com a mesma classe `text-xl font-bold` para consistência.

### Resultado

O bloco de vídeo único ficará:

```tsx
<div className="px-3 md:px-0 py-4">
  <h2 className="text-xl font-bold text-foreground mb-4">Vídeo do Produto</h2>
  <MuxPlayer
    playbackId={v.playback_id}
    preload="none"
    poster={`${MUX_IMG}/${v.playback_id}/thumbnail.jpg`}
    className="w-full aspect-[9/16] rounded-xl overflow-hidden"
    style={{ '--media-object-fit': 'cover', backgroundColor: 'transparent' }}
  />
</div>
```

Arquivo afetado: `src/components/loja/ProductVideos.tsx` apenas.

