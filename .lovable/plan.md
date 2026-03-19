

## Adicionar `subtitulo` e `textoDestaque` aos Planos

### Resumo
Dois novos campos de string nos planos: `subtitulo` (descrição curta) e `textoDestaque` (frase de ancoragem com parser `[[NomePlano]]` → texto em cor primária/bold).

### Alterações

**1. `models/Plano.js` — Adicionar campos ao schema (linhas 9-10)**
- `subtitulo: { type: String, default: '' }`
- `textoDestaque: { type: String, default: '' }`

**2. `src/services/saas-api.ts` — Adicionar à interface `Plano` (linha ~693)**
- `subtitulo: string;`
- `textoDestaque: string;`

**3. `src/pages/AdminPlanos.tsx` — Formulário de edição**
- Adicionar `subtitulo` e `textoDestaque` à interface `PlanoForm` e ao `emptyForm`
- Em `openEdit`, mapear os novos campos
- No modal, após o input "Nome", dois novos inputs:
  - "Subtítulo do Plano" (placeholder: "Ex: Ideal para profissionais...")
  - "Frase de Ancoragem" (placeholder: "Ex: Tudo do plano [[Starter]] mais:")

**4. `src/pages/painel/LojaAssinatura.tsx` — Renderização nos cards**
- Criar helper `parseAnchor(text)`: split por `\[\[([^\]]+)\]\]`, renderiza matches em `text-primary font-bold`
- Abaixo do nome do plano (linha ~373): se `subtitulo` existir, renderizar `<p className="text-sm text-muted-foreground mt-1">`
- Acima da lista de vantagens (linha ~410): se `textoDestaque` existir, renderizar com ícone `CornerDownRight` + `parseAnchor(texto)`
- Importar `CornerDownRight` do lucide-react

### Arquivos alterados
- `models/Plano.js`
- `src/services/saas-api.ts`
- `src/pages/AdminPlanos.tsx`
- `src/pages/painel/LojaAssinatura.tsx`

