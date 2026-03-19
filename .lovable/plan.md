# Plano de Evolução — PANDORA SaaS

## Strangler Fig — Decomposição do Monólito ✅ COMPLETA

O monólito `api/loja-extras.js` (408+ linhas) foi completamente decomposto em 6 microsserviços especializados usando o padrão **Strangler Fig**. O arquivo original foi deletado.

### Fases Concluídas

| Fase | Microsserviço | Escopos Migrados | Status |
|---|---|---|---|
| SF-1 | `api/midia.js` | midias, midia, upload, mux-upload, mux-status, mux-delete | ✅ |
| SF-2 | `api/fretes.js` | fretes, frete, fretes-publico, calcular-frete | ✅ |
| SF-3 | `api/assinaturas.js` | stripe-checkout, stripe-portal, stripe-webhook, cron-taxas, pagar-taxas-manual | ✅ |
| SF-4 | `api/gateways.js` | gateways-disponiveis, gateway-loja, salvar-gateway, desconectar-gateway, appmax-connect, appmax-install, appmax-webhook | ✅ |
| SF-5 | `api/marketing.js` | cupons, cupom, cupom-publico, cupons-popup, leads, lead, lead-newsletter, leads-import, leads-export, pixels, pixel | ✅ |
| SF-5 | `api/storefront.js` | tema, paginas, pagina, pagina-publica, categorias-publico, global-domain, category-products | ✅ |
| **Final** | **`api/loja-extras.js` DELETADO** | — | ✅ |

### Correções Aplicadas na Revisão

- URL do webhook Stripe em `AdminIntegracoes.tsx`: `/api/loja-extras?scope=stripe-webhook` → `/api/assinaturas?scope=stripe-webhook` ✅
- Frontend `saas-api.ts`: Todas as 26+ referências redirecionadas para os novos microsserviços ✅
- `vercel.json`: Rewrite do loja-extras removido, marketing + storefront adicionados ✅
- `README.md`: Documentação completamente atualizada com arquitetura de 17 microsserviços ✅

### Strangler Fig 2 — Decomposição de `api/pedidos.js` ✅ COMPLETA

O monólito `api/pedidos.js` (567 linhas) foi decomposto em 4 microsserviços + core reduzido (~270 linhas).

| Microsserviço | Escopos Migrados | Permissão |
|---|---|---|
| `api/crm.js` | clientes, cliente, criar-cliente, redefinir-senha-cliente | Autenticado |
| `api/carrinhos.js` | carrinho (POST/PATCH), carrinhos (GET) | Público + Autenticado |
| `api/etiquetas.js` | gerar-etiqueta, cancelar-etiqueta | Autenticado |
| `api/relatorios.js` | relatorios | Autenticado |
| `api/pedidos.js` (core) | pedido (POST público, GET/PATCH auth), pedidos (GET auth) | Misto |

### Arquitetura Final (21 Serverless Functions)

```
api/
├── admins.js           # Admin
├── assinaturas.js      # Stripe (SF-3)
├── auth-action.ts      # Autenticação
├── carrinhos.js        # Carrinhos Abandonados (SF2-2)
├── categorias.js       # Categorias
├── cliente-auth.js     # Auth clientes
├── crm.js              # CRM/Clientes (SF2-1)
├── etiquetas.js        # Fulfillment/Etiquetas (SF2-3)
├── fretes.js           # Logística (SF-2)
├── gateways.js         # Pagamentos (SF-4)
├── lojas.js            # Lojas
├── lojista.js          # Perfil lojista
├── marketing.js        # Cupons+Leads+Pixels (SF-5)
├── midia.js            # Bunny.net+Mux (SF-1)
├── pedidos.js          # Core Checkout+Pedidos
├── process-payment.js  # Processamento
├── products.ts         # Produtos
├── relatorios.js       # Relatórios (SF2-4)
├── settings.js         # Config globais
├── storefront.js       # Temas+Páginas+Vitrine (SF-5)
└── tracking-webhook.js # Rastreamento
```

---

## Diagnóstico da Cobrança Dupla ✅ RESOLVIDO

### Causa raiz
`auto_advance: true` na criação de invoices manuais causava tentativa duplicada de cobrança pelo Stripe.

### Correção aplicada
`auto_advance: false` em `processarCronTaxas()` e `pagarTaxasManual()` em `lib/services/assinaturas/stripe.js`.

---

## Features Implementadas

### Páginas de Categoria ✅
- Banner, filtros, ordenação, paginação, layout responsivo configurável

### Construtor de Navegação Visual (Menu Builder) ✅
- Drag & drop, até 2 níveis de nesting, fallback para categorias ativas

### Shoppertainment — Video Commerce (Mux) ✅
- Upload direto, polling de status, exclusão com confirmação, layouts stories/carousel/auto
