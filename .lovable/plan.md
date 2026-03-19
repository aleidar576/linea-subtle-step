

## Remover espaço entre vantagens e desvantagens nos cards

### Problema
A lista de vantagens tem `flex-1` que empurra as desvantagens para o fundo do card, criando um gap visual nos cards com menos itens.

### Solução
Remover `flex-1` da `<ul>` de vantagens (linha 432). O card já está em `flex flex-col` — sem `flex-1`, as desvantagens ficam coladas logo abaixo das vantagens. O card continua esticando para igualar a altura dos irmãos via grid, mas o espaço extra fica no final (abaixo de tudo), não no meio.

### Alteração

**`src/pages/painel/LojaAssinatura.tsx` — linha 432**
- De: `<ul className="space-y-4 flex-1">`
- Para: `<ul className="space-y-4">`

### Arquivo alterado
- `src/pages/painel/LojaAssinatura.tsx`

