

# Fix: Flash da tela de bloqueio de gateway no checkout

## Problema

O `gatewayAtivo` e inicializado como `null` no `LojaLayout.tsx` (linha 667), e a busca ao endpoint `gateway-loja` e assincrona (linhas 676-680). Porem, o contexto `isLoading` ja e `false` quando o `LojaProvider` e montado (linha 871).

Resultado: o `LojaCheckout.tsx` ve `gatewayAtivo === null` antes do fetch terminar e renderiza a tela de bloqueio. Segundos depois, o fetch completa, atualiza o estado, e a tela some. Isso causa o "flash" indesejado.

## Solucao

Adicionar um estado `gatewayLoading` no `LojaLayout.tsx` que comeca como `true` e so vira `false` apos o fetch do gateway completar (sucesso ou erro). No `LojaCheckout.tsx`, usar esse estado para mostrar um loading enquanto o gateway ainda esta sendo consultado, em vez de mostrar a tela de bloqueio.

## Alteracoes

### 1. `src/contexts/LojaContext.tsx`

Adicionar `gatewayLoading: boolean` a interface `LojaContextType`.

### 2. `src/components/LojaLayout.tsx`

- Criar estado `const [gatewayLoading, setGatewayLoading] = useState(true)`.
- No `useEffect` do fetch do gateway (linhas 675-681), chamar `setGatewayLoading(false)` no `.then` e no `.catch`.
- Passar `gatewayLoading` no objeto do `LojaProvider` value.

### 3. `src/pages/loja/LojaCheckout.tsx`

- Extrair `gatewayLoading` do `useLoja()`.
- No bloco de bloqueio (linha 656), mudar a condicao para: se `gatewayLoading`, mostrar um spinner de carregamento; so mostrar a tela de bloqueio se `!gatewayLoading && !gatewayAtivo`.

