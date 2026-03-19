

## Plano: Adicionar seção "Limitações" ao formulário de planos

### Contexto
O formulário atual tem apenas `vantagens: string[]`. Precisamos adicionar `limitacoes: string[]` com UX idêntica.

### Mudanças

**1. `src/pages/AdminPlanos.tsx`**
- Adicionar `limitacoes: string[]` ao `PlanoForm` interface e ao `emptyForm`
- No `openEdit`, carregar `p.limitacoes || []`
- Adicionar helpers: `addLimitacao`, `removeLimitacao`, `updateLimitacao` (espelhando os de vantagens)
- No Dialog, após a seção "Vantagens", adicionar seção "Limitações do Plano" com lista dinâmica idêntica
- Na tabela, adicionar coluna "Limitações" mostrando o count

**2. `models/Plano.js`**
- Adicionar campo `limitacoes: { type: [String], default: [] }` ao schema

### Detalhes da UI (seção nova no Dialog)
Renderizada logo abaixo da seção de Vantagens, com label "Limitações do Plano (Recursos NÃO inclusos)", botão "+ Adicionar Limitação", e inputs removíveis -- mesma estrutura visual das vantagens.

