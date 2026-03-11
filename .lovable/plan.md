

# Fase 5 — Xeque-Mate: Decomposicao Final do Monolito

## Resumo

Dividir as 408 linhas restantes de `api/loja-extras.js` em dois microsservicos e deletar o arquivo original. Todas as 87 referencias no frontend estao concentradas em `src/services/saas-api.ts`.

## Arquivos afetados

| Arquivo | Acao |
|---|---|
| `api/marketing.js` | **Criar** — Cupons + Leads + Pixels |
| `api/storefront.js` | **Criar** — Temas + Paginas + Vitrine publica |
| `api/loja-extras.js` | **Deletar** |
| `src/services/saas-api.ts` | **Editar** — redirecionar todas as URLs |
| `vercel.json` | **Editar** — remover rewrite antigo, adicionar 2 novos |

## Detalhamento

### 1. Criar `api/marketing.js`

Infraestrutura padrao: `bodyParser: false`, `getRawBody`, `verifyLojista`, `verifyOwnership`, `connectDB`.

Models: `Cupom`, `Loja`, `Lead`, `TrackingPixel`.

| Escopo | Metodo | Auth | Dominio |
|---|---|---|---|
| `cupom-publico` | GET | Nenhum | Cupons |
| `cupons-popup` | GET | Nenhum | Cupons |
| `lead-newsletter` | POST | Nenhum | Leads |
| `cupons` | GET | Lojista | Cupons |
| `cupom` | POST/PUT/DELETE/PATCH | Lojista | Cupons |
| `pixels` | GET | Lojista | Pixels |
| `pixel` | POST/PUT/DELETE | Lojista | Pixels |
| `leads` | GET | Lojista | Leads |
| `leads-export` | GET | Lojista | Leads |
| `lead` | PUT/DELETE | Lojista | Leads |
| `leads-import` | POST | Lojista | Leads |

Nota: `leads` e `leads-export` fazem `require('../models/Cliente.js')` inline — manter esse padrao.

### 2. Criar `api/storefront.js`

Models: `Loja`, `Product`, `Pagina`, `Setting`, `Category` (inline require).

| Escopo | Metodo | Auth | Dominio |
|---|---|---|---|
| `categorias-publico` | GET | Nenhum | Vitrine |
| `global-domain` | GET | Nenhum | Vitrine |
| `category-products` | GET | Nenhum | Vitrine |
| `pagina-publica` | GET | Nenhum | Paginas |
| `tema` | GET/PUT | Lojista | Temas |
| `paginas` | GET | Lojista | Paginas |
| `pagina` | POST/PUT/DELETE | Lojista | Paginas |

Inclui a funcao `slugify` (necessaria para criacao de paginas).

### 3. Deletar `api/loja-extras.js`

Apos confirmar que todos os 18 escopos foram distribuidos, o arquivo sera deletado.

### 4. Atualizar `src/services/saas-api.ts`

Mapeamento completo de redirecionamento:

```text
MARKETING (api/marketing):
  cuponsApi.list           /loja-extras?scope=cupons        → /marketing?scope=cupons
  cuponsApi.validar        /loja-extras?scope=cupom-publico → /marketing?scope=cupom-publico
  cuponsApi.create         /loja-extras?scope=cupom         → /marketing?scope=cupom
  cuponsApi.update         /loja-extras?scope=cupom         → /marketing?scope=cupom
  cuponsApi.delete         /loja-extras?scope=cupom         → /marketing?scope=cupom
  cuponsApi.toggle         /loja-extras?scope=cupom         → /marketing?scope=cupom
  pixelsApi.list           /loja-extras?scope=pixels        → /marketing?scope=pixels
  pixelsApi.create         /loja-extras?scope=pixel         → /marketing?scope=pixel
  pixelsApi.update         /loja-extras?scope=pixel         → /marketing?scope=pixel
  pixelsApi.delete         /loja-extras?scope=pixel         → /marketing?scope=pixel
  leadsApi.subscribe       /loja-extras?scope=lead-newsletter → /marketing?scope=lead-newsletter
  leadsApi.list            /loja-extras?scope=leads         → /marketing?scope=leads
  leadsApi.update          /loja-extras?scope=lead          → /marketing?scope=lead
  leadsApi.delete          /loja-extras?scope=lead          → /marketing?scope=lead
  leadsApi.import          /loja-extras?scope=leads-import  → /marketing?scope=leads-import
  cuponsPopupApi.getBulk   /loja-extras?scope=cupons-popup  → /marketing?scope=cupons-popup

STOREFRONT (api/storefront):
  lojaPublicaApi.getCategorias  /loja-extras?scope=categorias-publico → /storefront?scope=categorias-publico
  lojaPublicaApi.getPagina      /loja-extras?scope=pagina-publica     → /storefront?scope=pagina-publica
  temasApi.get                  /loja-extras?scope=tema               → /storefront?scope=tema
  temasApi.update               /loja-extras?scope=tema               → /storefront?scope=tema
  paginasApi.list               /loja-extras?scope=paginas            → /storefront?scope=paginas
  paginasApi.create             /loja-extras?scope=pagina             → /storefront?scope=pagina
  paginasApi.update             /loja-extras?scope=pagina             → /storefront?scope=pagina
  paginasApi.delete             /loja-extras?scope=pagina             → /storefront?scope=pagina
  paginasApi.getPublic          /loja-extras?scope=pagina-publica     → /storefront?scope=pagina-publica
  getCategoryProducts           /loja-extras?scope=category-products  → /storefront?scope=category-products
```

Nota: `leadsApi.subscribe` usa `API_BASE_PUB` (fetch direto, nao `request`) — precisa trocar a URL la tambem.

### 5. Atualizar `vercel.json`

Remover linha 14: `{ "source": "/api/loja-extras", "destination": "/api/loja-extras.js" }`

Adicionar:
```json
{ "source": "/api/marketing", "destination": "/api/marketing.js" },
{ "source": "/api/storefront", "destination": "/api/storefront.js" }
```

## Contagem final de funcoes serverless

Apos a Fase 5, a pasta `api/` tera:
- `admins.js`, `auth-action.ts`, `categorias.js`, `cliente-auth.js`, `fretes.js`, `gateways.js`, `lojas.js`, `lojista.js`, `marketing.js`, `midia.js`, `pedidos.js`, `process-payment.js`, `products.ts`, `settings.js`, `storefront.js`, `tracking-webhook.js`, `assinaturas.js` = **17 arquivos** (dentro do limite Vercel com o Strategy Pattern consolidando rotas).

## Riscos

Zero breaking changes — mesmos query params e response shapes. Os escopos publicos (`cupom-publico`, `categorias-publico`, `global-domain`, `category-products`, `pagina-publica`, `lead-newsletter`, `cupons-popup`) continuam sem auth. Nenhum outro arquivo frontend referencia `loja-extras` alem de `saas-api.ts`.

