

## Reels View Imersivo — ProductVideos.tsx

### Resumo
Refatorar o Dialog do layout Stories para uma experiência fullscreen TikTok/Reels com scroll magnético vertical, controle inteligente de reprodução via IntersectionObserver, e navegação automática ao vídeo clicado.

### Alterações no arquivo `src/components/loja/ProductVideos.tsx`

**1. Imports adicionais**
- `useEffect, useRef, useCallback` do React
- `X` do `lucide-react`

**2. Novos estados e refs**
- `currentPlayingIndex: number | null` — controla qual vídeo está tocando
- `reelsRef: useRef<HTMLDivElement>` — referência ao container de scroll
- `slideRefs: useRef<(HTMLDivElement | null)[]>` — array de refs para cada slide (para IntersectionObserver)

**3. IntersectionObserver (play/pause inteligente)**
- `useEffect` que cria um observer com `threshold: 0.8` no `reelsRef.current`
- Observa cada slide via `slideRefs`
- Quando um slide entra em 80%+ de visibilidade → `setCurrentPlayingIndex(index)`
- Cleanup: disconnect no unmount e quando modal fecha

**4. Controle do MuxPlayer via ref**
- Criar array de refs para os players: `playerRefs: useRef<(any | null)[]>`
- `useEffect` reativo a `currentPlayingIndex`: itera os players, chama `.play()` no ativo e `.pause()` nos demais
- Remove `autoPlay="any"` de todos — o play é controlado programaticamente

**5. Scroll inicial com scrollIntoView**
- `useEffect` que roda quando `activeIndex` muda para non-null:
  ```
  reelsRef.current?.children[activeIndex]?.scrollIntoView({ behavior: 'instant' })
  ```
- Também seta `currentPlayingIndex = activeIndex` para iniciar reprodução

**6. Dialog fullscreen**
Substituir o `DialogContent` atual (linhas 61-69) por:

```tsx
<DialogContent className="max-w-none w-screen h-screen max-h-screen p-0 m-0 border-none bg-black rounded-none gap-0 [&>button]:hidden">
  <button onClick={() => setActiveIndex(null)}
    className="absolute top-6 right-6 z-[60] p-2 bg-black/40 rounded-full text-white backdrop-blur-md">
    <X className="w-5 h-5" />
  </button>

  <div ref={reelsRef}
    className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory"
    style={{ scrollbarWidth: 'none' }}>
    {videos.map((v, i) => (
      <div key={v.playback_id}
        ref={el => { slideRefs.current[i] = el }}
        className="h-[100dvh] w-full snap-start snap-always relative flex items-center justify-center bg-black">
        <MuxPlayer
          ref={el => { playerRefs.current[i] = el }}
          playbackId={v.playback_id}
          loop
          muted={false}
          className="w-full h-full object-cover"
          style={{ '--media-object-fit': 'cover', '--controls': 'none' } as any}
        />
      </div>
    ))}
  </div>
</DialogContent>
```

**7. Cleanup ao fechar**
- No `onOpenChange` do Dialog, além de `setActiveIndex(null)`, setar `setCurrentPlayingIndex(null)` e pausar todos os players

### Arquivos afetados
- `src/components/loja/ProductVideos.tsx` (único)

