

# Fase 4 — Strangler Fig: Extração do Microsserviço de Gateways

## Resumo

Extrair 7 escopos de gateways de pagamento do lojista do `api/loja-extras.js` (646 linhas) para um novo `api/gateways.js`. Três escopos são **públicos** (`gateways-disponiveis`, `gateway-loja`, `appmax-install`, `appmax-webhook`) e três são **autenticados** (`appmax-connect`, `salvar-gateway`, `desconectar-gateway`). O monólito perderá a dependência do model `Lojista` e cairá para ~330 linhas.

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `api/gateways.js` | **Criar** — novo microsserviço |
| `api/loja-extras.js` | **Editar** — remover 7 blocos + import `Lojista` |
| `src/services/saas-api.ts` | **Editar** — redirecionar `gatewaysApi` |
| `src/pages/painel/LojaGateways.tsx` | **Editar** — redirecionar chamadas diretas |
| `src/components/LojaLayout.tsx` | **Editar** — redirecionar fetch `gateway-loja` |
| `src/pages/AdminGateways.tsx` | **Editar** — atualizar URLs de integração exibidas |
| `vercel.json` | **Editar** — adicionar rewrite |

## Detalhamento

### 1. Criar `api/gateways.js`

Mesmo padrão: `bodyParser: false`, `getRawBody`, `verifyLojista`, `verifyOwnership`.

| Escopo | Método | Auth | Linhas origem |
|---|---|---|---|
| `gateways-disponiveis` | GET | Nenhum | 96-110 |
| `gateway-loja` | GET | Nenhum | 113-128 |
| `appmax-install` | POST | Nenhum (webhook) | 189-215 |
| `appmax-webhook` | POST | Nenhum (webhook) | 218-228 |
| `appmax-connect` | GET | Lojista | 245-336 |
| `salvar-gateway` | POST | Lojista | 341-369 |
| `desconectar-gateway` | POST | Lojista | 374-397 |

Imports: `connectDB`, `jwt`, models `Loja`, `Lojista`, `Setting`, e `getPaymentService` (inline no bloco appmax-webhook).

### 2. Limpar `api/loja-extras.js`

Remover:
- Linhas 96-128 (`gateways-disponiveis` + `gateway-loja`)
- Linhas 188-228 (`appmax-install` + `appmax-webhook`)
- Linhas 244-397 (`appmax-connect` + `salvar-gateway` + `desconectar-gateway`)
- Import linha 18: `const Lojista = require(...)` — verificado: não é usado nos blocos restantes (Cupons, Temas, Pixels, Páginas, Leads)

Resultado: `loja-extras.js` cairá de ~646 para ~330 linhas. Domínios restantes: Cupons, Temas, Pixels, Páginas, Leads + rotas públicas auxiliares.

### 3. Atualizar frontend (4 arquivos)

**`src/services/saas-api.ts`** — objeto `gatewaysApi` (linhas 1143-1153):
```
/loja-extras?scope=gateways-disponiveis  →  /gateways?scope=gateways-disponiveis
/loja-extras?scope=gateway-loja          →  /gateways?scope=gateway-loja
/loja-extras?scope=salvar-gateway        →  /gateways?scope=salvar-gateway
/loja-extras?scope=desconectar-gateway   →  /gateways?scope=desconectar-gateway
```

**`src/pages/painel/LojaGateways.tsx`** — 6 chamadas `authRequest` diretas:
```
/loja-extras?scope=salvar-gateway        →  /gateways?scope=salvar-gateway
/loja-extras?scope=appmax-connect        →  /gateways?scope=appmax-connect
/loja-extras?scope=gateways-disponiveis  →  /gateways?scope=gateways-disponiveis
/loja-extras?scope=desconectar-gateway   →  /gateways?scope=desconectar-gateway
```

**`src/components/LojaLayout.tsx`** — fetch direto (linha 698):
```
/loja-extras?scope=gateway-loja  →  /gateways?scope=gateway-loja
```

**`src/pages/AdminGateways.tsx`** — URLs de integração exibidas ao admin (linhas 306-308):
```
/loja-extras?scope=appmax-webhook   →  /gateways?scope=appmax-webhook
/loja-extras?scope=appmax-install   →  /gateways?scope=appmax-install
```

### 4. Atualizar `vercel.json`

Adicionar rewrite (o rewrite `/api/gateways` **não existe** ainda — o atual aponta para `api/gateways.js` que era placeholder):
```json
{ "source": "/api/gateways", "destination": "/api/gateways.js" }
```

**Nota**: Verificar se já existe — se sim, apenas confirmar que aponta para `api/gateways.js`.

## Impacto e riscos

- **Zero breaking change** no frontend — mesmos query params e response shapes
- **Checkout preservado** — `gateway-loja` continua público, `LojaLayout.tsx` apenas troca a URL
- **Webhooks Appmax** — URLs de webhook configuradas no painel Appmax precisarão ser atualizadas pelo admin para `/api/gateways?scope=appmax-webhook` e `/api/gateways?scope=appmax-install`
- **Admin visual** — As URLs exibidas em `AdminGateways.tsx` serão atualizadas automaticamente

