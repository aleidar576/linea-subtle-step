

## Refatoração do `DynamicIcon` em `SaaSBrand.tsx`

### Problema
O `dynamicIconImports` gera ~1.500 `import()` dinâmicos que o Rollup transforma em micro-chunks individuais.

### Mudanças exatas

**Arquivo:** `src/components/SaaSBrand.tsx`

1. **Remover imports** (linhas 1-6):
   - Remover `lazy`, `Suspense` de react
   - Remover `dynamicIconImports from 'lucide-react/dynamicIconImports'`
   - Manter `icons` e `LucideProps` de `lucide-react`

2. **Substituir o componente `DynamicIcon`** (linhas 75-93):
   - Eliminar toda a lógica de `lazy()`, `Suspense`, e lookup por kebab-case
   - Usar lookup direto no objeto estático `icons` com conversão para PascalCase
   - Fallback para `icons.Boxes` se o nome não for encontrado

### Código resultante do `DynamicIcon`

```tsx
export const DynamicIcon = ({ name, ...props }: DynamicIconProps) => {
  // Convert kebab-case or lowercase to PascalCase for icons lookup
  const pascalName = name
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('') as keyof typeof icons;

  const LucideIcon = icons[pascalName];
  if (!LucideIcon) return <icons.Boxes {...props} />;
  return <LucideIcon {...props} />;
};
```

### Resultado esperado
- Eliminação dos ~1.500 micro-chunks de ícones do build
- O tree-shaking do `manualChunks` agrupará o `icons` object no chunk `vendor-icons`
- Zero impacto funcional: o componente continua renderizando qualquer ícone por nome

