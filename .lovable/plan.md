

## Diagnóstico: Página de Categoria em Branco

### Causa Raiz: Build Quebrado

O app inteiro está falhando por causa de um **erro de TypeScript** em `src/components/admin/MenuBuilder.tsx` linha 265:

```
Type '{ variant: any; }' is not assignable to type 'BadgeProps'.
Property 'variant' does not exist on type 'BadgeProps'.
```

O componente `Badge` aceita `variant` via `VariantProps`, mas o TypeScript não reconhece quando passado com `as any`. Como o build falha, **nenhuma página** carrega — nem a categoria, nem o "página não encontrada".

### Sobre suas duas perguntas

1. **"Página não encontrada" não aparece** → Porque o build inteiro está quebrado. A lógica de fallback (linha 159-165 de `LojaCategoria.tsx`) está correta, mas nunca executa.

2. **URL e slug estão corretos** → Sim, `/categoria/geladeiras` bate com a rota `/categoria/:categorySlug` no `App.tsx` (linha 199). O backend também busca por `slug: category_slug` corretamente. Não há problema de roteamento.

---

### Correção (1 arquivo)

**`src/components/admin/MenuBuilder.tsx` linha 265** — Remover `as any` e tipar corretamente:

```tsx
// De:
<Badge variant={typeBadge.variant as any} className="text-[10px] shrink-0">

// Para:
<Badge className={cn(badgeVariants({ variant: typeBadge.variant as 'default' | 'secondary' | 'outline' | 'destructive' }), "text-[10px] shrink-0")}>
```

Ou mais simples — já que `typeBadge.variant` já retorna os valores corretos (`'default'`, `'secondary'`, `'outline'`), basta importar `badgeVariants` e usar inline no className, eliminando a prop `variant` completamente.

Isso desbloqueará o build e tanto a categoria quanto o "não encontrada" voltarão a funcionar.

