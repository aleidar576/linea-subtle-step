

## Diagnóstico: Loja Pública em Branco

### Causa Raiz: Violação das Rules of Hooks

No `LojaLayout.tsx`, os hooks adicionados na última alteração (`useEffect` linha 900 e `useMemo` linha 908) estão posicionados **depois** dos early returns (linhas 739, 748, 758).

React exige que hooks sejam sempre chamados na mesma ordem e quantidade em cada render. Quando `isLoading=true`, o componente retorna na linha 739 sem executar esses 2 hooks. Quando `isLoading` muda para `false`, React tenta executar 2 hooks extras — isso causa um crash silencioso que deixa a página em branco.

O admin e o painel do lojista funcionam porque usam `SaaSApp`, não `LojaPublicaApp`/`LojaLayout`.

### Correção (1 arquivo)

**`src/components/LojaLayout.tsx`** — Mover o `useEffect` (fallback categories) e o `useMemo` (menuItems) para **antes** dos early returns, junto com os outros hooks (após linha 728, antes da linha 739).

Os hooks precisam estar antes de qualquer `if (...) return`. A lógica interna já tem guards (`if (!loja?._id) return`), então funcionará corretamente mesmo quando `loja` é null.

| Linha atual | Conteúdo | Ação |
|-------------|----------|------|
| 900-906 | `useEffect` fallback categories | Mover para antes da linha 739 |
| 908-918 | `useMemo` menuItems | Mover para antes da linha 739 |

Nenhum outro arquivo precisa ser alterado.

