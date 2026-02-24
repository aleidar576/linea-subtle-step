

## Refatoracao Visual da Secao de Cupons (Cart + Checkout)

Refatoracao puramente visual (CSS/Tailwind + icones lucide-react) nos dois arquivos que contem a secao de cupons: `LojaCart.tsx` e `LojaCheckout.tsx`. Nenhuma logica de negocio sera alterada.

---

### 1. Gatilho (Accordion Toggle)

**Antes:** Icone `Gift`, texto "Tem cupom? Resgate aqui!", fonte `text-sm font-medium text-foreground`, borda tracejada grossa.

**Depois:**
- Icone: `Ticket` (lucide-react) no lado esquerdo, cor `text-muted-foreground`
- Texto: "Possui um cupom de desconto?" em `text-xs text-muted-foreground`
- Remover `font-medium` e `justify-center`, usar `justify-start`
- Container: borda `border border-border/60 rounded-lg` (sem `dashed`, mais sutil)
- Seta `ChevronDown` permanece no lado direito com `ml-auto`

---

### 2. Campo de Input + Botao

**Antes:** Botao com `className="rounded-lg font-bold text-xs px-4"` (variante default = fundo escuro primario).

**Depois:**
- Layout `flex flex-row gap-2` (ja existe, manter)
- Input: `flex-1` com `placeholder="Codigo do cupom"` (ja existe, garantir que nao corta)
- Botao: trocar para `variant="outline"` com `className="shrink-0 px-4 text-xs font-semibold"` para nao competir com o CTA principal
- Adicionar `mt-3` no container do formulario para respiro

---

### 3. Lista de Cupons Aplicados

**Antes:** Pilula cinza com texto "remover" solto, cor `text-primary` para o valor.

**Depois:**
- Cada cupom: `flex items-center justify-between py-2` (sem bg, sem borda individual)
- Esquerda: `Tag` icon `h-3.5 w-3.5 text-muted-foreground` + codigo em `text-sm font-bold text-foreground`
- Direita: valor em `text-sm font-semibold text-green-600` + botao `Trash2` icon `h-4 w-4 text-muted-foreground hover:text-destructive` (sem texto "remover")
- Separador entre cupons: `border-b border-border/50` (exceto ultimo)
- Remover `rounded-lg bg-muted/50 border border-border px-3` do wrapper individual

---

### 4. Espacamento e Respiro

- Container interno (quando aberto): `px-4 pb-4 pt-3 space-y-3` (adicionar `pt-3`)
- Separador visual entre o toggle e o formulario: adicionar `border-t border-border/50` no topo do conteudo expandido

---

### Arquivos Afetados

| Arquivo | Alteracao |
|---|---|
| `src/pages/loja/LojaCart.tsx` | Refatorar secao de cupons (linhas 159-210) com novo design |
| `src/pages/loja/LojaCheckout.tsx` | Refatorar `couponSectionJSX` (linhas 462-515) com o mesmo design |

Ambos os arquivos recebem exatamente o mesmo tratamento visual. A importacao de `Ticket` sera adicionada, e `Gift` sera removida se nao for usada em outro lugar do arquivo.

### Icones (lucide-react)

- Adicionar: `Ticket`
- Manter: `Tag`, `Trash2`, `ChevronDown`, `Loader2`
- Remover (se nao usado em outro lugar): `Gift` do LojaCheckout

---

### Regras

- Zero alteracao em logica de negocio, calculo de desconto ou chamadas de API
- Zero alteracao em `vite.config.mts`
- Apenas classes Tailwind, icones lucide-react e estrutura JSX da secao de cupons

