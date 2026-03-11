

# Fase 3 — Strangler Fig: Extração do Microsserviço de Assinaturas

## Resumo

Extrair 5 escopos de assinatura/faturamento Stripe do monólito `api/loja-extras.js` (~740 linhas) para um novo `api/assinaturas.js`. O monólito perderá a dependência de `getSubscriptionService`, `Lojista`, `Plano` e `stripe`. O cron da Vercel será redirecionado.

## Arquivos afetados

| Arquivo | Ação |
|---|---|
| `api/assinaturas.js` | **Criar** — novo microsserviço |
| `api/loja-extras.js` | **Editar** — remover 5 blocos + imports |
| `src/services/saas-api.ts` | **Editar** — redirecionar 3 URLs |
| `vercel.json` | **Editar** — rewrite + atualizar cron path |

## Detalhamento

### 1. Criar `api/assinaturas.js`

Mesmo padrão dos microsserviços anteriores: `bodyParser: false`, `getRawBody`, `verifyLojista`. Gerenciará:

| Escopo | Método | Auth | Linhas origem |
|---|---|---|---|
| `cron-taxas` | GET | CRON_SECRET | 77-92 |
| `pagar-taxas-manual` | POST | Lojista | 95-108 |
| `stripe-checkout` | POST | Lojista | 125-137 |
| `stripe-webhook` | POST | Nenhum (sig Stripe) | 140-162 |
| `stripe-portal` | POST | Lojista | 165-177 |

Imports: `connectDB`, `jwt`, `getSubscriptionService` de `lib/services/assinaturas`. O `require('stripe')` inline fica dentro do bloco `stripe-webhook` (padrão existente).

**Atenção crítica**: O `stripe-webhook` exige raw body sem JSON parse. A estrutura do handler deve ler rawBody antes do parse condicional, exatamente como o monólito faz hoje (linhas 111-122).

### 2. Limpar `api/loja-extras.js`

Remover:
- Linhas 74 (`const stripeService = ...`) 
- Linhas 77-177 (5 blocos: `cron-taxas`, `pagar-taxas-manual`, raw body read, `stripe-checkout`, `stripe-webhook`, `stripe-portal`)
- Import linha 22: `const { getSubscriptionService } = require(...)` 
- Imports que se tornarem órfãos: `Lojista` (linha 18) e `Plano` (linha 19) — verificar se são usados em outros escopos restantes

**Nota**: `Lojista` é usado no bloco `appmax-install` (linha 292), `appmax-connect` (linha 349), `salvar-gateway` (linha 439), `desconectar-gateway` (linha 473). Portanto **`Lojista` NÃO pode ser removido**. `Plano` precisa ser verificado — se não é usado fora dos blocos Stripe, será removido.

O bloco de leitura de rawBody (linhas 111-122) ainda é necessário para os escopos restantes que recebem POST (cupons, gateways, leads, etc.), então **permanece**.

Atualizar comentário do cabeçalho.

Resultado: `loja-extras.js` cairá de ~740 para ~635 linhas.

### 3. Atualizar `src/services/saas-api.ts`

Trocar 3 URLs no objeto `stripeApi` (linhas 679-688):

```
/loja-extras?scope=stripe-checkout     → /assinaturas?scope=stripe-checkout
/loja-extras?scope=stripe-portal       → /assinaturas?scope=stripe-portal
/loja-extras?scope=pagar-taxas-manual  → /assinaturas?scope=pagar-taxas-manual
```

O webhook Stripe (`stripe-webhook`) é chamado diretamente pela Stripe, não pelo frontend — será atualizado no dashboard do Stripe pelo lojista após o deploy (ou via variável `STRIPE_WEBHOOK_URL`). Mas a URL no `vercel.json` cron precisa mudar.

### 4. Atualizar `vercel.json`

Adicionar rewrite:
```json
{ "source": "/api/assinaturas", "destination": "/api/assinaturas.js" }
```

**Atualizar cron** (linha 22):
```json
{ "path": "/api/assinaturas?scope=cron-taxas", "schedule": "0 12 * * *" }
```

## Ponto de atenção pós-deploy

O endpoint do webhook Stripe configurado no dashboard da Stripe (ex: `https://seudominio.com/api/loja-extras?scope=stripe-webhook`) precisará ser atualizado para `https://seudominio.com/api/assinaturas?scope=stripe-webhook`. Isso é uma configuração manual no painel Stripe, não no código. Recomendo manter temporariamente um fallback no `loja-extras.js` que redirecione o webhook antigo, ou atualizar o Stripe primeiro.

