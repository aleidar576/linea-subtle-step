

# Fase 2 — Strangler Fig: Extração do Microsserviço de Fretes

## Resumo

Extrair 6 escopos de logística/frete do monólito `api/loja-extras.js` (~863 linhas) para um novo `api/fretes.js`. Dois escopos são **públicos** (sem auth) e quatro são **autenticados** (lojista). O monólito perderá a dependência de `getShippingService` e do model `Frete`.

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `api/fretes.js` | **Criar** — novo microsserviço |
| `api/loja-extras.js` | **Editar** — remover 6 blocos + imports não usados |
| `src/services/saas-api.ts` | **Editar** — redirecionar URLs |
| `vercel.json` | **Editar** — adicionar rewrite |

## Detalhamento

### 1. Criar `api/fretes.js`

Novo handler com a mesma estrutura de auth (`verifyLojista`, `verifyOwnership`) + `bodyParser: false` + `getRawBody`. Gerenciará:

| Escopo | Método | Auth | Linhas origem |
|---|---|---|---|
| `fretes-publico` | GET | Nenhum | 226-230 |
| `calcular-frete` | POST | Nenhum | 232-310 |
| `fretes` | GET | Lojista | 583-586 |
| `frete` | POST | Lojista | 588-595 |
| `frete` | PUT | Lojista | 597-604 |
| `frete` | DELETE | Lojista | 606-615 |

Imports necessários: `mongoose`, `connectDB`, `jwt`, models `Frete`, `Loja`, `Product`, e `getShippingService` de `lib/services/fretes`.

Estrutura do handler:
1. CORS OPTIONS
2. connectDB
3. Escopos públicos (`fretes-publico`, `calcular-frete`) — sem verificação de token
4. Escopos autenticados (`fretes`, `frete`) — com `verifyLojista` + `verifyOwnership`
5. Fallback 400

### 2. Limpar `api/loja-extras.js`

- Deletar linhas 225-310 (bloco público: `fretes-publico` + `calcular-frete`)
- Deletar linhas 580-615 (bloco autenticado: `fretes` GET + `frete` POST/PUT/DELETE)
- Remover imports não mais usados:
  - `const Frete = require('../models/Frete.js');` (linha 11)
  - `const { getShippingService } = require('../lib/services/fretes');` (linha 24)
- Atualizar comentário do cabeçalho (remover "Fretes")

Resultado: `loja-extras.js` cairá de ~863 para ~740 linhas.

### 3. Atualizar `src/services/saas-api.ts`

Trocar URLs em dois locais:

**`fretesApi` (linhas 917-925):**
```
/loja-extras?scope=fretes  →  /fretes?scope=fretes
/loja-extras?scope=frete   →  /fretes?scope=frete
```

**`lojaPublicaApi` (linhas 1103-1104 e 1119-1122):**
```
/loja-extras?scope=fretes-publico   →  /fretes?scope=fretes-publico
/loja-extras?scope=calcular-frete   →  /fretes?scope=calcular-frete
```

Nenhuma mudança de assinatura, tipos ou hooks.

### 4. Atualizar `vercel.json`

Adicionar rewrite:
```json
{ "source": "/api/fretes", "destination": "/api/fretes.js" }
```

## Impacto e riscos

- **Zero breaking change** — mesmos query params, mesmos response shapes
- **Checkout público preservado** — `calcular-frete` e `fretes-publico` continuam sem auth
- **Hooks intactos** — `useFretes`, `useCreateFrete`, etc. consomem `fretesApi` que é atualizado internamente
- **Página LojaFretes.tsx** — sem alteração (usa hooks que usam `fretesApi`)
- **LojaCheckout.tsx / LojaProduto.tsx** — sem alteração (usam `lojaPublicaApi.calcularFrete` / `getFretes`)

