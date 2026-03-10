

## Refatorar Dropdown Desktop — Clean & Premium

### Arquivo: `src/components/LojaLayout.tsx` (linhas 1010-1022)

Substituir o bloco do `NavigationMenuContent` e seus links internos:

**De:**
```tsx
<NavigationMenuContent className="p-3 min-w-[200px]">
  <ul className="space-y-1">
    {item.children.map(child => (
      <li key={child.id}>
        <Link to={child.url} className="block px-3 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
          {child.label}
        </Link>
      </li>
    ))}
  </ul>
</NavigationMenuContent>
```

**Para:**
```tsx
<NavigationMenuContent className="p-2 w-[250px] bg-background border border-border shadow-md rounded-md">
  <ul className="grid w-full gap-1 p-0 m-0">
    {item.children.map(child => (
      <li key={child.id}>
        <Link
          to={child.url}
          className="block select-none rounded-md px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
        >
          {child.label}
        </Link>
      </li>
    ))}
  </ul>
</NavigationMenuContent>
```

Mudanças:
- Container: `p-2 w-[250px]` com `bg-background border border-border shadow-md rounded-md` para visual de cartão flutuante limpo
- Links: padding maior (`px-4 py-3`), `font-medium`, `select-none`, hover suave com `bg-accent` (cinza claro) em vez de fundo escuro
- Grid com `gap-1` para espaçamento uniforme entre itens

