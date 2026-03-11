

# Fase 1 -- Strangler Fig: Extração do Microsserviço de Mídia

## Resumo

Extrair 6 escopos de mídia do monólito `api/loja-extras.js` (1049 linhas) para um novo `api/midia.js`, e redirecionar as chamadas do frontend. O monólito ficará ~180 linhas mais leve e perderá a dependência do `@mux/mux-node`.

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `api/midia.js` | **Criar** -- novo microsserviço |
| `api/loja-extras.js` | **Editar** -- remover 6 blocos + import Mux |
| `src/services/saas-api.ts` | **Editar** -- redirecionar URLs |
| `vercel.json` | **Editar** -- adicionar rewrite |

## Detalhamento

### 1. Criar `api/midia.js`

Novo handler serverless com a mesma estrutura de autenticação (`verifyLojista`, `verifyOwnership`) e `bodyParser: false` + `getRawBody`. Gerenciará 6 escopos:

| Escopo | Método | Origem (linhas) |
|---|---|---|
| `upload` | POST | 826-862 (Bunny.net) |
| `midias` | GET | 668-683 (listagem agregada) |
| `midia` | DELETE | 686-701 (remoção de referências) |
| `mux-upload` | POST | 943-970 |
| `mux-status` | GET | 973-1003 |
| `mux-delete` | DELETE | 1007-1042 |

Os escopos `midias` e `midia` (listagem e remoção) são movidos junto porque pertencem ao mesmo domínio de mídia -- manter coesão de domínio.

Imports necessários: `mongoose`, `connectDB`, `jwt`, models `Loja` e `Product`, e `@mux/mux-node` (require inline, padrão já existente).

### 2. Limpar `api/loja-extras.js`

- Deletar linhas 666-701 (midias/midia)
- Deletar linhas 822-863 (upload Bunny)
- Deletar linhas 938-1042 (mux-upload/mux-status/mux-delete)
- Nenhum `require('@mux/mux-node')` no topo para remover (já é feito inline nos blocos que serão deletados)
- A linha final de fallback `return res.status(400)` permanece

### 3. Atualizar `src/services/saas-api.ts`

Trocar a base URL de 3 objetos API:

```
midiasApi:  /loja-extras?scope=midias|midia|upload  →  /midia?scope=midias|midia|upload
muxApi:     /loja-extras?scope=mux-*               →  /midia?scope=mux-*
```

Nenhuma mudança de assinatura, tipos ou hooks -- apenas substituição de string na URL.

### 4. Atualizar `vercel.json`

Adicionar rewrite:
```json
{ "source": "/api/midia", "destination": "/api/midia.js" }
```

## Impacto e riscos

- **Zero breaking change** no frontend: mesmos query params, mesmos response shapes
- **Zero mudança em hooks** (`useLojaExtras.tsx`, `ImageUploader.tsx`, `LojaProdutos.tsx`) -- eles consomem `midiasApi`/`muxApi` que são atualizados internamente
- O `loja-extras.js` cairá de ~1049 para ~870 linhas
- Dependência `@mux/mux-node` migra integralmente para `api/midia.js`

