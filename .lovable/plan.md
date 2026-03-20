

## Refatoração: Eliminar Flash Fantasma + Tokenizar 14 Arquivos Críticos

### Resumo
Duas frentes: (1) sincronizar os fallbacks do `index.css` e `SaaSBrand.tsx` com a paleta oficial para eliminar o flash de cores ao carregar; (2) substituir ~206 ocorrências de cores hardcoded nos 14 arquivos críticos do SaaS/Painel por tokens semânticos.

---

### FRENTE 1 — Fim do Flash Fantasma

**Problema:** `index.css` usa emerald/slate como default → `SaaSBrand.tsx` retorna cyan/pink como fallback → banco retorna a paleta real. Resultado: 2 trocas visuais perceptíveis.

**Solução:** Alinhar ambos à paleta oficial do cliente.

#### 1.1 — `src/index.css`
Alterar `:root` e `.dark` para usar a paleta oficial em HSL:

| Variável | Valor Atual (emerald/slate) | Novo Valor (paleta oficial) |
|---|---|---|
| `--primary` (ambos) | `160 84% 39%` | `191 100% 50%` |
| `--accent` (ambos) | `160 84% 39%` | `191 100% 50%` |
| `--ring` (ambos) | `160 84% 39%` | `191 100% 50%` |
| `.dark --background` | `222 47% 4%` | `192 47% 7%` |
| `.dark --foreground` | `210 40% 96%` | `0 0% 98%` |
| `.dark --card` | `217 33% 8%` | `192 47% 9%` |
| `.dark --border` | `217 33% 18%` | `192 47% 11%` |
| `:root --background` | `0 0% 100%` | `0 0% 100%` (sem mudança) |
| `:root --foreground` | `222 47% 11%` | `240 6% 3%` |

Todas as variáveis derivadas (card, popover, muted, secondary, sidebar-*) serão recalculadas proporcionalmente. O `--sidebar-primary`, `--sidebar-ring` também mudam para `191 100% 50%`.

#### 1.2 — `src/components/SaaSBrand.tsx`
Alterar os fallbacks nas linhas 50-55:

| Fallback | Valor Atual | Novo Valor |
|---|---|---|
| `corPrimaria` | `#3CC7F5` | `#00D1FF` |
| `corSecundaria` | `#EE49FD` | `#E44F30` |
| `fundoDark` | `#1E1E2E` | `#09090B` |
| `fundoLight` | `#FFFFFF` | `#FFFFFF` (sem mudança) |
| `textoLight` | `#F3F4F6` | `#FAFAFA` |
| `textoDark` | `#111827` | `#09090B` |

---

### FRENTE 2 — Tokenização dos 14 Arquivos Críticos

Regra de substituição semântica para todos os status:
- **Sucesso/Ativo** (green/emerald) → `bg-primary/15 text-primary`
- **Atenção/Pendente** (amber/orange/yellow) → `bg-secondary/15 text-secondary`
- **Erro/Bloqueado** (red) → já usa `bg-destructive/10 text-destructive` (manter)
- **Neutro/Inativo** (gray/slate) → `bg-muted text-muted-foreground`
- **Info/Trial** (blue) → `bg-primary/10 text-primary` (usar primary como info)

#### Arquivo por arquivo:

**1. `AdminEstatisticas.tsx`**
- Linha 18: `text-green-500` → `text-primary`
- Linha 20: `text-chart-1` → `text-primary` (ou manter se chart tokens existem)
- Linha 21: `text-chart-2` → `text-primary`
- Linha 56: `fill="#10b981"` → `fill="hsl(var(--primary))"`

**2. `LojaAssinatura.tsx`**
- STATUS_MAP (linhas 29-34): `bg-blue-500/10 text-blue-600` → `bg-primary/10 text-primary`; `bg-green-500/10 text-green-600` → `bg-primary/15 text-primary`
- Linha 142: `bg-orange-500/10 text-orange-600 border-orange-300` → `bg-secondary/15 text-secondary border-secondary/20`
- Linhas 200, 294, 343: `bg-orange-500/10`, `border-orange-300`, `text-orange-600/700` → `bg-secondary/15`, `border-secondary/20`, `text-secondary`
- Linha 302: `border-orange-400 text-orange-700 hover:bg-orange-500/10` → `border-secondary/30 text-secondary hover:bg-secondary/10`
- Linhas 365, 371, 380, 423, 456: `border-green-500`, `bg-green-500`, `text-green-500`, `hover:bg-green-600` → `border-primary`, `bg-primary`, `text-primary`, `hover:bg-primary/90`, `text-primary-foreground`

**3. `LojaPedidos.tsx`**
- STATUS_MAP (linhas 18-28): Refatorar inteiro:
  - `pendente` → `bg-secondary/15 text-secondary`
  - `em_analise` → `bg-primary/10 text-primary`
  - `pago` → `bg-primary/15 text-primary`
  - `recusado` → `bg-destructive/10 text-destructive`
  - `estornado` → `bg-muted text-muted-foreground`
  - `chargeback` → `bg-destructive/15 text-destructive border border-destructive/20`
  - `enviado` → `bg-primary/10 text-primary`
  - `entregue` → `bg-primary/15 text-primary`
  - `cancelado` → `bg-destructive/10 text-destructive`
- Linha 33: fallback `bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400` → `bg-muted text-muted-foreground`

**4. `PedidoDetailModal.tsx`**
- STATUS_MAP (linhas 22-29): Mesma lógica do LojaPedidos acima (duplicado).

**5. `PainelInicio.tsx`**
- Linha 113: `text-green-500` → `text-primary`
- Linha 150: `bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20` → usar Badge variant `success`

**6. `AdminLojistas.tsx`**
- Linhas 208, 330: `bg-green-500/10 text-green-600` → `bg-primary/15 text-primary`
- `bg-blue-500/10 text-blue-600` → `bg-primary/10 text-primary`
- `bg-yellow-500/10 text-yellow-600` → `bg-secondary/15 text-secondary`
- Linhas 325, 343-344: `bg-orange-500/10 text-orange-600 border-orange-300` → `bg-secondary/15 text-secondary border-secondary/20`; `text-orange-700` → `text-secondary`
- Linha 486: `bg-yellow-500/10 text-yellow-600` → `bg-secondary/15 text-secondary`

**7. `AdminSetup.tsx`**
- Linha 50: `bg-amber-500/10` → `bg-secondary/10`
- Linha 51: `text-amber-500` → `text-secondary`
- Linha 71: `bg-green-500/10` → `bg-primary/10`
- Linha 72: `text-green-500` → `text-primary`

**8. `LojaProdutos.tsx`**
- Linha 1131: `text-amber-500` → `text-secondary`
- Linha 1177: `text-emerald-500` → `text-primary`
- Linha 1437: `text-amber-400 fill-amber-400` → `text-secondary fill-secondary` (star ratings)
- Linha 1878: `text-emerald-500` → `text-primary`
- Linha 2137: `text-emerald-500` → `text-primary`
- Linha 2159: `bg-zinc-950 text-green-400` → `bg-background text-primary` (JSON preview)

**9. `LojaIntegracoes.tsx`**
- Linha 169: `bg-emerald-500/15 text-emerald-600 border-emerald-500/30` → `bg-primary/15 text-primary border-primary/30`

**10. `LojaPerfil.tsx`**
- Linha 319: `text-green-500` → `text-primary`

**11–14. `AdminForgotPassword.tsx`, `AdminResetPassword.tsx`, `ChatWidget.tsx`, `LojaConfiguracoes.tsx`**
- Buscar e substituir quaisquer `green-500`, `emerald-500`, `amber-500`, `orange-500` restantes pelo token semântico correspondente.

---

### Arquivos alterados (total: ~16)

| # | Arquivo | Tipo de mudança |
|---|---|---|
| 1 | `src/index.css` | Valores CSS das variáveis |
| 2 | `src/components/SaaSBrand.tsx` | Fallbacks hex |
| 3 | `src/pages/AdminEstatisticas.tsx` | Tokenizar ícones e chart fill |
| 4 | `src/pages/painel/LojaAssinatura.tsx` | STATUS_MAP + badges + CTA |
| 5 | `src/pages/painel/LojaPedidos.tsx` | STATUS_MAP completo |
| 6 | `src/components/pedido/PedidoDetailModal.tsx` | STATUS_MAP duplicado |
| 7 | `src/pages/painel/PainelInicio.tsx` | Checklist + badge Ativa |
| 8 | `src/pages/AdminLojistas.tsx` | Badges de status |
| 9 | `src/pages/AdminSetup.tsx` | Ícones de status |
| 10 | `src/pages/painel/LojaProdutos.tsx` | Validações e previews |
| 11 | `src/pages/painel/LojaIntegracoes.tsx` | Badge ativo/inativo |
| 12 | `src/pages/painel/LojaPerfil.tsx` | Ícone copy |
| 13 | `src/pages/AdminForgotPassword.tsx` | Resíduos se houver |
| 14 | `src/pages/AdminResetPassword.tsx` | Resíduos se houver |
| 15 | `src/components/ChatWidget.tsx` | Resíduos se houver |
| 16 | `src/pages/painel/LojaConfiguracoes.tsx` | Resíduos se houver |

