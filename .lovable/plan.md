

# Remover "Exibir no Produto" duplicado da tela de Fretes

## Problema

Existem dois toggles "Exibir no Produto" controlando a mesma coisa:
- Um na tela `/fretes` (nivel global da regra)
- Outro na aba Frete do editor de produtos (nivel do vinculo produto-frete)

O do produto ja e o que realmente controla a exibicao na pagina publica. O global e redundante e confuso.

## Alteracoes

### 1. `models/Frete.js` — Remover campo do schema
- Remover a linha `exibir_no_produto: { type: Boolean, default: true }` do FreteSchema

### 2. `src/pages/painel/LojaFretes.tsx` — Remover coluna e switch
- Remover a coluna "Exibir no Produto" do `TableHeader`
- Remover a `TableCell` com o `Switch` inline na tabela
- Remover o campo "Exibir na pagina do Produto" com `Switch` do Dialog de criacao/edicao
- Remover o tipo `exibir_no_produto` do estado `form`

### 3. `src/services/saas-api.ts` — Limpar tipagem
- Remover `exibir_no_produto: boolean` da interface `RegraFrete` (a que modela o documento global do Frete)
- Manter intacto o `exibir_no_produto?: boolean` dentro de `fretes_vinculados[]` na interface `LojaProduct` (esse e o que fica)

### 4. `src/pages/loja/LojaProduto.tsx` — Nenhuma alteracao
- A logica da linha 284 ja usa `v.exibir_no_produto` do vinculo (produto), nao do frete global
- A linha 289 filtra por `f.exibir_no_produto !== false` — como o campo global deixara de existir, sera `undefined`, e `undefined !== false` e `true`, entao fretes sem vinculo continuarao aparecendo (comportamento correto)

## Arquivos que NAO serao tocados
- `models/Product.js` — o campo `exibir_no_produto` em `fretes_vinculados[]` permanece
- `src/pages/painel/LojaProdutos.tsx` — o switch por produto permanece intacto
- `src/pages/loja/LojaProduto.tsx` — logica ja funciona corretamente
- `api/loja-extras.js` — nenhuma referencia ao campo global
- `vite.config.mts` — nunca alterado

