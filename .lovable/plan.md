

## Plano: Refatoracao UX/UI da Pagina de Categoria

### 1. Menu de Navegacao Desktop - Active State Minimalista

**Arquivo:** `src/components/ui/navigation-menu.tsx`

Alterar `navigationMenuTriggerStyle` (linha 37-38):
- Remover `rounded-md bg-background hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[active]:bg-accent/50 data-[state=open]:bg-accent/50`
- Substituir por estilo limpo: fundo transparente, hover sutil com `border-b-2`, estado ativo com `font-semibold border-b-2 border-primary`

**Arquivo:** `src/components/LojaLayout.tsx` (linhas 1024-1031)

Detectar rota ativa via `useLocation` e aplicar classe `font-semibold border-b-2 border-primary` no link correspondente, removendo o estilo de "pilula".

---

### 2. Sidebar Fixa Desktop + Sheet Mobile

**Novo arquivo:** `src/components/loja/CategoryFilters.tsx`

Extrair todo o conteudo de filtro (subcategorias, variacoes, faixa de preco, botoes Limpar/Aplicar) do Sheet atual em `LojaCategoria.tsx` (linhas 363-437) para um componente reutilizavel:

```text
<CategoryFilters
  subcategories={subcategories}
  allVariations={allVariations}
  priceRange={priceRange}
  draftSubcats / draftVariations / draftPriceRange  (state)
  setDraftSubcats / setDraftVariations / setDraftPriceRange (setters)
  onApply={() => ...}
  onClear={() => ...}
  formatPrice={formatPrice}
/>
```

**Arquivo:** `src/pages/loja/LojaCategoria.tsx`

Alterar o layout principal (atualmente `<div className="container py-4">`) para:

```text
<div className="container py-4 lg:flex lg:gap-6">
  {/* Desktop sidebar - hidden on mobile */}
  <aside className="hidden lg:block w-64 shrink-0">
    <div className="sticky top-20">
      <h2 className="font-semibold mb-4">Filtros</h2>
      <CategoryFilters ... />
    </div>
  </aside>

  {/* Main content */}
  <div className="flex-1 min-w-0">
    {/* Breadcrumbs, title, quick filters, controls, grid */}
    {/* Botao "Filtrar" com classe lg:hidden */}
  </div>
</div>

{/* Sheet mobile - only renders on mobile */}
<Sheet ...>
  <SheetContent>
    <CategoryFilters ... />
  </SheetContent>
</Sheet>
```

O botao "Filtrar" recebe `className="lg:hidden"` para sumir no desktop.

---

### 3. Dual Range Slider + Inputs de Preco

**Arquivo:** `src/components/ui/slider.tsx`

O componente atual renderiza apenas 1 `<Thumb>`. Radix `@radix-ui/react-slider` renderiza automaticamente um Thumb por valor no array, mas o componente precisa declarar os Thumbs. Alterar para renderizar dinamicamente com base nos valores:

```tsx
<SliderPrimitive.Root ...>
  <SliderPrimitive.Track>
    <SliderPrimitive.Range />
  </SliderPrimitive.Track>
  <SliderPrimitive.Thumb className="..." />
  <SliderPrimitive.Thumb className="..." />
</SliderPrimitive.Root>
```

Nota: Radix ignora Thumbs extras se so 1 valor for passado, entao 2 Thumbs fixos eh seguro.

**Dentro de `CategoryFilters`** (novo componente):

Abaixo do Slider, adicionar dois `<Input type="number">` sincronizados:

```text
[Slider dual-thumb ====o=========o====]
[ R$ Min |______|]   [ R$ Max |______|]
```

- Input Min: `value={draftPriceRange[0] / 100}`, onChange converte para centavos e atualiza `draftPriceRange[0]`
- Input Max: `value={draftPriceRange[1] / 100}`, onChange converte para centavos e atualiza `draftPriceRange[1]`
- Slider e inputs compartilham o mesmo state, ficando sincronizados bidirecionalmente

---

### Resumo de Arquivos

| Arquivo | Acao |
|---------|------|
| `src/components/ui/navigation-menu.tsx` | Estilo minimalista no trigger |
| `src/components/LojaLayout.tsx` | Active state por rota no menu desktop |
| `src/components/loja/CategoryFilters.tsx` | **Novo** - componente de filtros extraido |
| `src/pages/loja/LojaCategoria.tsx` | Layout grid responsivo + usar CategoryFilters |
| `src/components/ui/slider.tsx` | Adicionar segundo Thumb para dual range |

