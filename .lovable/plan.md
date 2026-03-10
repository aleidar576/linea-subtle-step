

## Plano: Construtor de Navegação Visual (Menu Builder)

### Visão Geral

Implementar um sistema de menu configurável pelo lojista, armazenado como array em `Loja.configuracoes.menu_principal`, renderizado no header público como `NavigationMenu` (desktop) e `Sheet` (mobile). Sem alteração nos models Category/Page.

---

### 1. MODEL — `models/Loja.js`

Adicionar dentro de `configuracoes`:
```js
menu_principal: {
  type: [mongoose.Schema.Types.Mixed],
  default: [],
  // Cada item: { id, type: 'category'|'page'|'custom', reference_id, label, url, children: [...] }
}
```

---

### 2. TYPES — `src/services/saas-api.ts`

Nova interface + atualizar `Loja.configuracoes`:
```ts
export interface MenuItemConfig {
  id: string;
  type: 'category' | 'page' | 'custom';
  reference_id: string;
  label: string;
  url: string;
  children: MenuItemConfig[];
}
```

Adicionar `menu_principal?: MenuItemConfig[]` em `Loja.configuracoes`.

---

### 3. CONTEXT — `src/contexts/LojaContext.tsx`

Adicionar `menuPrincipal: MenuItemConfig[]` ao `LojaContextType`. Default `[]`.

### 4. LAYOUT — `src/components/LojaLayout.tsx`

- Ler `config.menu_principal` e passar no `ctxValue` como `menuPrincipal`.
- **Fallback**: se `menu_principal` vazio, buscar categorias ativas via `lojaPublicaApi.getCategorias(lojaId)` e montar menu automático.

---

### 5. ADMIN — Novo componente `src/components/admin/MenuBuilder.tsx` (~250 linhas)

Componente interativo com:

- **Estado**: `items: MenuItemConfig[]` (array recursivo)
- **"Adicionar Item"** → Dialog com 3 opções:
  - **Categoria**: Select com categorias do sistema. Ao selecionar, puxa subcategorias como `children` automaticamente. URL gerada: `/categoria/{slug}`.
  - **Página**: Select com páginas criadas. URL: `/pagina/{slug}`.
  - **Link Customizado**: Inputs para label e URL.
- **Renderização**: Cards aninhados com `ml-6` para filhos. Cada card mostra:
  - Input de "Label" (nome customizado)
  - Botões: "Adicionar Sub-item", "Mover Cima/Baixo", "Excluir"
  - Badge indicando tipo (Categoria/Página/Custom)
- **Aninhamento**: Máximo 2 níveis de profundidade.
- **Prop**: `value: MenuItemConfig[]`, `onChange: (items: MenuItemConfig[]) => void`

#### Funções internas:
- `addItem(parentId?: string)`: abre dialog, cria item com `crypto.randomUUID()` como id
- `removeItem(id: string)`: remove recursivamente
- `moveItem(id: string, direction: 'up' | 'down')`: troca posição no array
- `updateLabel(id: string, label: string)`: atualiza label
- `addChild(parentId: string)`: abre dialog para sub-item

---

### 6. ADMIN — `src/pages/painel/LojaTemas.tsx`

- Adicionar aba "Navegação" no `<TabsList>` (agora `grid-cols-8`):
  ```tsx
  <TabsTrigger value="navegacao"><Menu className="h-3 w-3" /> Navegação</TabsTrigger>
  ```
- Estado: `const [menuPrincipal, setMenuPrincipal] = useState<MenuItemConfig[]>([])`
- Init: carregar de `loja.configuracoes.menu_principal` no `useEffect`
- TabsContent: renderizar `<MenuBuilder value={menuPrincipal} onChange={setMenuPrincipal} categories={categories} pages={paginas} />`
- `handleSaveAll`: incluir `menu_principal: menuPrincipal` na chamada `lojasApi.update()`

---

### 7. LOJA PÚBLICA — Header Desktop (Linha 2)

No `LojaLayout.tsx`, após o `</header>` atual (linha 957), inserir **dentro** do `<header>` uma segunda barra:

```tsx
{/* Nav bar - Desktop only */}
{menuItems.length > 0 && (
  <div className="hidden md:block border-t border-border">
    <div className="container">
      <NavigationMenu>
        <NavigationMenuList>
          {menuItems.map(item => (
            item.children.length > 0 ? (
              <NavigationMenuItem key={item.id}>
                <NavigationMenuTrigger>{item.label}</NavigationMenuTrigger>
                <NavigationMenuContent className="p-4 min-w-[200px]">
                  {item.children.map(child => (
                    <Link key={child.id} to={child.url} className="block px-3 py-2 rounded hover:bg-accent text-sm">
                      {child.label}
                    </Link>
                  ))}
                </NavigationMenuContent>
              </NavigationMenuItem>
            ) : (
              <NavigationMenuItem key={item.id}>
                <Link to={item.url}>
                  <NavigationMenuLink className={navigationMenuTriggerStyle()}>
                    {item.label}
                  </NavigationMenuLink>
                </Link>
              </NavigationMenuItem>
            )
          ))}
        </NavigationMenuList>
      </NavigationMenu>
    </div>
  </div>
)}
```

---

### 8. LOJA PÚBLICA — Menu Hambúrguer Mobile

No `LojaLayout.tsx`, adicionar botão hambúrguer na Linha 1 (antes da logo, visível só mobile):

```tsx
<button onClick={() => setMobileMenuOpen(true)} className="md:hidden flex h-9 w-9 items-center justify-center rounded-full bg-secondary">
  <Menu className="h-5 w-5" />
</button>
```

E o Sheet:
```tsx
<Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
  <SheetContent side="left" className="w-[280px] p-0">
    <SheetHeader className="p-4 border-b">
      <SheetTitle>{displayName}</SheetTitle>
    </SheetHeader>
    <nav className="p-4 space-y-1">
      {menuItems.map(item => (
        item.children.length > 0 ? (
          <div key={item.id}>
            <div className="flex items-center justify-between">
              <Link to={item.url} onClick={() => setMobileMenuOpen(false)}
                className="flex-1 py-3 px-2 text-sm font-medium">
                {item.label}
              </Link>
              <Collapsible>
                <CollapsibleTrigger className="p-2">
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  {item.children.map(child => (
                    <Link key={child.id} to={child.url} onClick={() => setMobileMenuOpen(false)}
                      className="block py-2 px-6 text-sm text-muted-foreground">
                      {child.label}
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        ) : (
          <Link key={item.id} to={item.url} onClick={() => setMobileMenuOpen(false)}
            className="block py-3 px-2 text-sm font-medium">
            {item.label}
          </Link>
        )
      ))}
    </nav>
  </SheetContent>
</Sheet>
```

---

### 9. FALLBACK (Menu vazio)

Se `menuPrincipal` estiver vazio, o `LojaLayout` monta automaticamente itens a partir das categorias ativas:
```ts
const menuItems = useMemo(() => {
  if (ctxValue.menuPrincipal.length > 0) return ctxValue.menuPrincipal;
  // Fallback: categorias ativas como menu
  return fallbackCategories.map(cat => ({
    id: cat._id, type: 'category' as const, reference_id: cat._id,
    label: cat.nome, url: `/categoria/${cat.slug}`, children: []
  }));
}, [ctxValue.menuPrincipal, fallbackCategories]);
```

---

### Arquivos Afetados (6)

| Arquivo | Ação |
|---------|------|
| `models/Loja.js` | +menu_principal field |
| `src/services/saas-api.ts` | +MenuItemConfig interface, +campo em Loja |
| `src/contexts/LojaContext.tsx` | +menuPrincipal no context |
| `src/components/admin/MenuBuilder.tsx` | **NOVO** — construtor visual |
| `src/pages/painel/LojaTemas.tsx` | +aba Navegação com MenuBuilder |
| `src/components/LojaLayout.tsx` | +NavigationMenu desktop, +Sheet mobile, +hamburger, +fallback |

