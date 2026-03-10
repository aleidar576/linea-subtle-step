

## UX Improvements: Back Button + Scroll Hint — ProductVideos.tsx

### Alterações no arquivo `src/components/loja/ProductVideos.tsx`

**1. Import**: Adicionar `ArrowLeft` e `ChevronsUp` ao import do lucide-react.

**2. Novo estado e ref**:
- `const [showHint, setShowHint] = useState(false);`
- `const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);`

**3. useEffect para hint**: Quando `activeIndex` se torna non-null e `videos.length > 1`, seta `showHint(true)` e agenda `setShowHint(false)` após 3s. Cleanup limpa o timeout.

**4. Dismiss hint no scroll**: No `reelsRef`, adicionar listener de scroll que chama `dismissHint()` imediatamente.

**5. UI no DialogContent**:

Adicionar botão ArrowLeft no canto superior esquerdo (mesmo estilo do X):
```tsx
<button onClick={handleClose}
  className="absolute top-6 left-6 z-[70] p-2 bg-black/40 rounded-full text-white backdrop-blur-md transition-opacity hover:opacity-80">
  <ArrowLeft className="w-5 h-5" />
</button>
```

Adicionar overlay de hint após o container de scroll:
```tsx
<div className={`absolute inset-0 z-[65] flex flex-col items-center justify-center pointer-events-none bg-black/20 backdrop-blur-sm transition-opacity duration-500 ${showHint ? 'opacity-100' : 'opacity-0'}`}>
  <ChevronsUp className="w-14 h-14 text-white/90 animate-pulse mb-3" />
  <p className="text-xl font-medium text-white text-center">Deslize para ver mais</p>
</div>
```

### Arquivo afetado
- `src/components/loja/ProductVideos.tsx` (único)

