

## Refatoração CSS: Dark Wrappers, BrandingInjector, Landing Page e Contraste

### Resumo
4 etapas: remover `<div className="dark">` de 8 arquivos de auth, completar o BrandingInjector com variáveis faltantes (sidebar-background, border, input, secondary), tokenizar a LandingPage, e garantir contraste.

### Etapa 1 — Remover wrappers `<div className="dark">` (8 arquivos)

Remover o wrapper `<div className="dark">` de todos estes arquivos, mantendo apenas o conteúdo interno. O `ThemeProvider` já controla a classe `.dark` no `<html>`, então esses wrappers locais criam conflito de herança CSS.

- **`src/pages/AdminLogin.tsx`** (linha 44): remover `<div className="dark">` e seu fechamento (linha 106). Também remover `theme="dark"` do `SaaSLogo`.
- **`src/pages/LojistaLogin.tsx`** (linha 82): remover wrapper e fechamento (linha 152). Remover `theme="dark"` do `SaaSLogo`.
- **`src/pages/LojistaRegistro.tsx`** (linha 54): remover wrapper e fechamento (linha 110). Remover `theme="dark"` do `SaaSLogo`.
- **`src/pages/AdminSetup.tsx`** (linhas 47, 64, 70, 84, 89, 158): remover todos os 3 wrappers `<div className="dark">` e seus fechamentos.
- **`src/pages/AdminForgotPassword.tsx`** (linhas 38, 71, 76, 124): remover 2 wrappers.
- **`src/pages/AdminResetPassword.tsx`** (linhas 23, 37, 64, 81, 86, 156): remover 3 wrappers.
- **`src/pages/RedefinirSenha.tsx`** (linha 52, 107): remover 1 wrapper.
- **`src/pages/VerificarEmail.tsx`** (linha 60, 127): remover 1 wrapper.

Adicionalmente, substituir textos hardcoded `text-slate-100`, `text-slate-200`, `text-slate-400` por tokens semânticos (`text-foreground`, `text-foreground`, `text-muted-foreground`) em todos esses arquivos para que respondam ao tema.

### Etapa 2 — Completar BrandingInjector (`src/components/BrandingInjector.tsx`)

Adicionar as variáveis CSS faltantes ao `INJECTED_VARS` e à lógica de injeção:

- `--sidebar-background` ← mesmo valor de `--background`
- `--sidebar-foreground` ← mesmo valor de `--foreground`
- `--sidebar-border` ← mesmo valor de `--border`
- `--border` ← derivado do background (dark: +14% lightness; light: -9% lightness)
- `--input` ← mesmo valor de `--border`
- `--secondary` ← derivado do background (dark: +10% lightness; light: -4% lightness)
- `--secondary-foreground` ← derivado do foreground (dark: shift -14%; light: como está)

Isso elimina o "vazamento" visual onde bordas e inputs mantinham cores estáticas do index.css enquanto o background mudava.

### Etapa 3 — Tokenizar LandingPage (`src/pages/LandingPage.tsx`)

Substituições de classes hardcoded:

| Hardcoded | Token semântico |
|---|---|
| `bg-slate-950` | `bg-background` |
| `text-slate-100` | `text-foreground` |
| `text-slate-300` | `text-muted-foreground` |
| `text-slate-400` | `text-muted-foreground` |
| `text-slate-500` | `text-muted-foreground` |
| `border-slate-800` | `border-border` |
| `bg-slate-900` | `bg-card` |
| `bg-slate-900/50`, `bg-slate-900/30` | `bg-card/50`, `bg-card/30` |
| `bg-slate-800` | `bg-muted` |
| `bg-emerald-500` | `bg-primary` |
| `hover:bg-emerald-400` | `hover:bg-primary/90` |
| `text-emerald-400` | `text-primary` |
| `text-emerald-500/20` | `text-primary/20` |
| `bg-emerald-500/10` | `bg-primary/10` |
| `bg-emerald-500/20` | `bg-primary/20` |
| `border-emerald-500/30` | `border-primary/30` |
| `border-emerald-500/40` | `border-primary/40` |
| `fill-emerald-400` | `fill-primary` |
| `from-emerald-400 to-cyan-400` | Usar inline style com CSS vars: `style={{ backgroundImage: 'linear-gradient(to right, hsl(var(--primary)), hsl(var(--secondary, var(--primary))))' }}` |
| `text-white` nos botões | `text-primary-foreground` |
| `border-slate-700` | `border-border` |
| `hover:bg-slate-800` | `hover:bg-muted` |
| `from-slate-900 to-slate-800` | `from-card to-muted` |
| `from-emerald-500/5` | `from-primary/5` |
| `bg-slate-950/80` | `bg-background/80` |

A LandingPage é sempre dark (ela faz parte do SaaSApp onde o ThemeProvider default é dark). Os tokens resolverão para as cores dark do branding.

### Etapa 4 — Contraste (`hexToHSL` e `isLightColor`)

A função `isLightColor` atual usa threshold de 55%. Isso é adequado. Verificar que o `primaryFg` calcula corretamente:
- Se lightness > 55% → foreground escuro (`220 13% 10%`)
- Se lightness <= 55% → foreground branco (`0 0% 100%`)

Nenhuma alteração necessária na lógica — apenas confirmar que está funcionando corretamente.

### Arquivos alterados
1. `src/pages/AdminLogin.tsx` — remover dark wrapper + tokenizar slates
2. `src/pages/LojistaLogin.tsx` — remover dark wrapper + tokenizar slates
3. `src/pages/LojistaRegistro.tsx` — remover dark wrapper + tokenizar slates
4. `src/pages/AdminSetup.tsx` — remover dark wrappers + tokenizar slates
5. `src/pages/AdminForgotPassword.tsx` — remover dark wrappers + tokenizar slates
6. `src/pages/AdminResetPassword.tsx` — remover dark wrappers + tokenizar slates
7. `src/pages/RedefinirSenha.tsx` — remover dark wrapper + tokenizar slates
8. `src/pages/VerificarEmail.tsx` — remover dark wrapper + tokenizar slates
9. `src/components/BrandingInjector.tsx` — adicionar sidebar-background/foreground, border, input, secondary
10. `src/pages/LandingPage.tsx` — substituir todas as cores hardcoded por tokens

