

## Injetor Dinâmico de Branding — CSS Variables em Runtime

### Contexto Atual
- `tailwind.config.ts` **já usa** o padrão `hsl(var(--primary))` — não precisa ser alterado
- `index.css` define valores HSL estáticos para `:root` e `.dark`
- `useSaaSBrand()` já expõe as cores de branding como hex (`#3CC7F5`, etc.)
- `ThemeProvider` já gerencia dark/light via classe `.dark` no `<html>`

### Estratégia
Não alterar o Tailwind config nem o `index.css`. Criar um componente injetor que sobrescreve as CSS variables em runtime via `document.documentElement.style.setProperty()`, convertendo hex → HSL. As variáveis do shadcn (`--primary`, `--background`, `--foreground`, etc.) continuam funcionando normalmente — apenas seus valores são substituídos dinamicamente.

### Alterações

**1. `src/components/BrandingInjector.tsx` (novo)**

Componente que:
- Consome `useSaaSBrand()` para obter as 6 cores hex
- Consome `useTheme()` para saber se é dark ou light
- Função utilitária `hexToHSL(hex)` → retorna string `"H S% L%"` (sem `hsl()`, compatível com o padrão do Tailwind)
- `useEffect` que injeta as variáveis no `:root`:

```text
Mapeamento por tema:

Dark mode:
  --primary          ← corPrimaria (HSL)
  --primary-foreground ← calculado (branco ou escuro baseado na luminosidade)
  --background       ← fundoDark (HSL)
  --foreground       ← textoLight (HSL)
  --card             ← fundoDark levemente ajustado (+4% lightness)
  --card-foreground  ← textoLight (HSL)
  --accent           ← corPrimaria (HSL)
  --accent-foreground ← primary-foreground
  --ring             ← corPrimaria (HSL)
  --sidebar-primary  ← corPrimaria (HSL)
  --sidebar-ring     ← corPrimaria (HSL)

Light mode:
  --primary          ← corPrimaria (HSL)
  --background       ← fundoLight (HSL)
  --foreground       ← textoDark (HSL)
  --card             ← fundoLight levemente ajustado
  --card-foreground  ← textoDark (HSL)
  --accent           ← corPrimaria (HSL)
  --ring             ← corPrimaria (HSL)
  --sidebar-primary  ← corPrimaria (HSL)
  --sidebar-ring     ← corPrimaria (HSL)
```

- Cleanup no unmount: remove as propriedades para não vazar para `LojaPublicaApp`
- Renderiza `null` (componente invisível)

**2. `src/App.tsx`**

- Importar `BrandingInjector`
- Inserir dentro de `SaaSApp`, **após** `ThemeProvider` e dentro dele (precisa de acesso ao tema):

```tsx
<ThemeProvider>
  <BrandingInjector />
  <AuthProvider>
    ...
```

- **Não** inserir em `LojaPublicaApp` — loja pública usa seu próprio sistema de cores

### O que NÃO muda
- `tailwind.config.ts` — já está correto
- `index.css` — os valores estáticos servem como fallback antes do fetch
- `LojaPublicaApp` — cores da loja pública permanecem intocadas
- Componentes shadcn — continuam usando `bg-primary`, `text-foreground` etc. normalmente

### Arquivos
- `src/components/BrandingInjector.tsx` (novo)
- `src/App.tsx` (adicionar componente)

