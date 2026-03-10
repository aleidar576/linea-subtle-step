

## Refatorar Menu Mobile — UX/UI

### Arquivo: `src/components/LojaLayout.tsx`

**1. Import (linha 6):** Substituir `ChevronDown` por `Plus, Minus`

```tsx
import { ..., Menu, Plus, Minus } from 'lucide-react';
```

**2. Menu mobile (linhas 1046-1095):** Reescrever o bloco `<Sheet>` inteiro:

- Largura maior: `w-[300px]`
- Items com `border-b border-border/50`
- Link com `flex-1 py-4 pl-4 text-base font-semibold text-foreground`
- CollapsibleTrigger com `px-6 py-4` (hitbox gigante) e ícones `Plus`/`Minus` com `strokeWidth={2.5}` alternados via `group-data-[state=open]:hidden` / `hidden group-data-[state=open]:block`
- Subcategorias com `py-3 pl-8 text-base font-medium text-foreground` (sem cinza)
- Items sem filhos: `py-4 pl-4 text-base font-semibold text-foreground border-b border-border/50`

Estrutura JSX conforme solicitado pelo usuário, usando `<Collapsible className="group">` para controlar ícones via data-attributes do Radix.

