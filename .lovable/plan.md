## Fase 15: Ecossistema de Gateways (Admin + Lojista + Checkout) — ✅ CONCLUÍDO

### Arquitetura

- Lista de gateways 100% estática em `src/config/gateways.ts` (zero CRUD no backend)
- Controle de visibilidade via `Setting` (key: `gateways_ativos`) gerenciado pelo Admin
- Credenciais por lojista nos campos `gateway_ativo` e `gateways_config` do Model `Lojista`
- Sheet lateral (shadcn/ui) modular com switch por `id_gateway`

### Arquivos Alterados/Criados

| Arquivo | Ação |
|---------|------|
| `src/config/gateways.ts` | **Novo** — Constantes estáticas dos gateways |
| `models/Lojista.js` | +2 campos: `gateway_ativo`, `gateways_config` |
| `api/settings.js` | +2 escopos: GET/PATCH `gateways-plataforma` |
| `api/loja-extras.js` | +4 escopos: `gateways-disponiveis`, `gateway-loja`, `salvar-gateway`, `desconectar-gateway` |
| `src/services/saas-api.ts` | +2 campos em `LojistaProfile` + `gatewaysApi` |
| `src/pages/AdminGateways.tsx` | **Novo** — Tela admin com toggles |
| `src/pages/painel/LojaGateways.tsx` | **Novo** — Layout Vega (grid 1/3+2/3) + Sheet |
| `src/components/AdminLayout.tsx` | +1 nav item "Gateways" |
| `src/components/layout/PainelLayout.tsx` | Menu renomeado: Integrações → Gateways |
| `src/App.tsx` | Rotas atualizadas (admin + lojista) |
| `src/pages/painel/PainelInicio.tsx` | Checklist atualizado para `gateway_ativo` |
| `src/contexts/LojaContext.tsx` | +2 campos: `gatewayAtivo`, `metodosSuportados` |
| `src/components/LojaLayout.tsx` | Fetch gateway ativo no contexto público |
| `src/pages/loja/LojaCheckout.tsx` | Overlay de bloqueio total quando `gatewayAtivo` é nulo |

### Regras Respeitadas

- `vite.config.mts` NÃO alterado
- Pasta `api/` permanece com 12 arquivos
- Sheet lateral usado para configuração do lojista
- Todos os campos da SealPay migrados para dentro do Sheet
- Checkout bloqueado completamente quando gateway_ativo é nulo

## Fase 16: OAuth Appmax (Instalação de Aplicativo) — ✅ CONCLUÍDO

### Arquitetura

- Fluxo OAuth completo via 2 novos scopes em `api/loja-extras.js` (sem novo arquivo)
- `appmax-connect` (GET, autenticado): obtém Bearer Token e gera URL de autorização
- `appmax-install` (POST, público/webhook): recebe credenciais da Appmax e salva no Lojista
- Frontend Admin exibe URLs de integração read-only no Dialog de edição da Appmax
- Frontend Lojista exibe estado conectado/desconectado com botão de ação

### Variáveis de Ambiente Necessárias (Vercel)

- `APPMAX_APP_ID`
- `APPMAX_CLIENT_ID`
- `APPMAX_CLIENT_SECRET`

### Arquivos Alterados

| Arquivo | Alteração |
|---------|-----------|
| `api/loja-extras.js` | +2 scopes: `appmax-connect` (GET auth), `appmax-install` (POST público) |
| `src/pages/AdminGateways.tsx` | Seção condicional de URLs de integração no Dialog (apenas para Appmax) |
| `src/pages/painel/LojaGateways.tsx` | `AppmaxPlaceholder` → `AppmaxConfig` com estado conectado/desconectado |

### Regras Respeitadas

- `vite.config.mts` NÃO alterado
- Pasta `api/` permanece com 12 arquivos
- `crypto.randomUUID()` nativo (sem dependência externa)
- `markModified('gateways_config')` para Mixed fields no Mongoose
