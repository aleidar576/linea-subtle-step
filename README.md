# 🛍️ PANDORA — SaaS Multi-Loja com PIX Nativo

Plataforma SaaS de e-commerce multi-tenant com **Host-Based Routing**, checkout com **PIX nativo via SealPay**, recuperação de carrinho abandonado e painel administrativo completo. Cada lojista possui sua loja pública acessível via subdomínio ou domínio customizado.

---

## ⚠️ ALERTA CRÍTICO: LIMITE DE SERVERLESS FUNCTIONS DA VERCEL

> **O projeto atingiu o limite máximo de 12/12 Serverless Functions no plano Hobby da Vercel.**
>
> **🚫 NENHUM arquivo novo pode ser criado na pasta `/api/`.** Qualquer adição resultará em erro de deploy.
>
> Para adicionar nova funcionalidade backend, você DEVE consolidar a lógica em um dos 12 arquivos existentes usando query params ou métodos HTTP diferentes.

### Lista dos 12 Arquivos (FINAL — não adicionar mais nenhum)

| # | Arquivo | Descrição |
|---|---|---|
| 1 | `api/admins.js` | CRUD de administradores, gestão de lojistas, impersonation, métricas |
| 2 | `api/auth-action.ts` | Ações de autenticação (login, registro, reset) + Master Password |
| 3 | `api/categorias.js` | Categorias de produtos por loja |
| 4 | `api/create-pix.js` | Geração de cobranças PIX via SealPay |
| 5 | `api/loja-extras.js` | Dados complementares da loja (banners, configs) |
| 6 | `api/lojas.js` | CRUD de lojas + domínios customizados |
| 7 | `api/lojista.js` | Perfil e gestão do lojista |
| 8 | `api/pedidos.js` | Gestão de pedidos e status |
| 9 | `api/pixels.ts` | Pixels de rastreamento (Facebook, TikTok) |
| 10 | `api/products.ts` | CRUD consolidado de produtos (slug, toggle, listagem) |
| 11 | `api/settings.js` | Configurações globais do SaaS + SealPay key + teste de mensagens |
| 12 | `api/tracking-webhook.js` | Webhook de rastreamento de entregas |

---

## 🎨 Branding Dinâmico

O sistema de branding é configurável via **Admin > Configurações > Identidade Visual**:

| Setting Key | Descrição | Default |
|---|---|---|
| `saas_name` | Nome da plataforma exibido em todo o SaaS | PANDORA |
| `saas_auth_subtitle` | Subtítulo nas telas de autenticação | Plataforma de E-commerce |
| `saas_icon_name` | Nome do ícone Lucide (kebab-case) | boxes |
| `saas_logo_url` | URL de logo customizado (substitui ícone + usado como favicon) | — |

O componente `SaaSBrand.tsx` exporta:
- `useSaaSBrand()` — hook com cache via React Query
- `<SaaSLogo />` — componente de logo dinâmico
- `<DynamicIcon />` — renderiza qualquer ícone Lucide por nome
- `useFaviconUpdater()` — atualiza o favicon do navegador dinamicamente

---

## 🏗️ Arquitetura: Host-Based Routing

O roteamento é decidido no `src/App.tsx` com base no **hostname** da requisição:

```
┌─────────────────────────────────────────────┐
│              Requisição HTTP                │
│         hostname = window.location          │
└──────────────────┬──────────────────────────┘
                   │
          isSaaSHost(hostname)?
                   │
          ┌────────┴────────┐
          │ SIM             │ NÃO
          ▼                 ▼
     <SaaSApp />      <LojaPublicaApp />
  (Landing, Painel,   (Loja do cliente,
   Admin, Demo)        subdomínio/domínio)
```

### Regras do `isSaaSHost()`

| Hostname | Resultado | Motivo |
|---|---|---|
| `localhost` / `127.0.0.1` | ✅ SaaS | Desenvolvimento local |
| `*.vercel.app` / `*.lovable.app` | ✅ SaaS | Preview de deploy |
| `VITE_SAAS_DOMAIN` | ✅ SaaS | Domínio principal (env var) |
| `www.VITE_SAAS_DOMAIN` | ✅ SaaS | Variante www |
| `app.VITE_SAAS_DOMAIN` | ✅ SaaS | Subdomínio do painel |
| Qualquer outro hostname | ❌ Loja | Subdomínio ou domínio customizado de cliente |

---

## 🌐 Configuração de DNS na Vercel

### Passo 1: Domínio Principal

1. No painel da Vercel, vá em **Settings → Domains**
2. Adicione `servicoseg.shop` (ou seu domínio)
3. Configure no seu provedor de DNS:
   - **Tipo:** `A` — **Valor:** `76.76.21.21`
   - **Tipo:** `AAAA` — **Valor:** `2606:4700:20::681a:b63` (opcional, IPv6)
4. Adicione `www.servicoseg.shop` com redirect para o domínio raiz

### Passo 2: Wildcard para Lojas

1. No seu provedor de DNS, crie:
   - **Tipo:** `CNAME` — **Nome:** `*` — **Valor:** `cname.vercel-dns.com`
2. Na Vercel, adicione o domínio wildcard: `*.servicoseg.shop`
3. Cada loja acessará automaticamente via `nomedloja.servicoseg.shop`

### Passo 3: Domínios Customizados de Clientes

Para clientes que desejam usar seu próprio domínio (ex: `www.lojacliente.com.br`):

1. O endpoint `api/lojas.js` registra o domínio via **Vercel API** automaticamente
2. O cliente configura um `CNAME` apontando para `cname.vercel-dns.com`
3. A Vercel provê SSL automaticamente

---

## 🔑 Variáveis de Ambiente

Configure **todas** as variáveis abaixo no painel da Vercel (**Settings → Environment Variables**):

| Variável | Obrigatória | Descrição |
|---|---|---|
| `MONGODB_URI` | ✅ Sim | URI de conexão ao MongoDB Atlas |
| `JWT_SECRET` | ✅ Sim | Segredo para assinar tokens JWT de autenticação |
| `VITE_SAAS_DOMAIN` | ✅ Sim | Domínio principal do SaaS, **sem** `https://`, **sem** `www` |
| `VERCEL_PROJECT_ID` | ✅ Sim | ID do projeto na Vercel (usado pela API de domínios customizados) |
| `VERCEL_ACCESS_TOKEN` | ✅ Sim | Token de acesso da Vercel com permissão de escrita |
| `MASTER_PASSWORD` | ⚠️ Opcional | Senha mestre para acesso de suporte a qualquer conta. **⚠️ NUNCA commite no código.** Configure apenas nas env vars da Vercel |
| `VITE_SUPABASE_URL` | ⚙️ Auto | Gerada automaticamente pelo Lovable Cloud |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ⚙️ Auto | Gerada automaticamente pelo Lovable Cloud |
| `VITE_SUPABASE_PROJECT_ID` | ⚙️ Auto | Gerada automaticamente pelo Lovable Cloud |

> **Nota:** As variáveis `VITE_*` são expostas no bundle do frontend (prefixo `VITE_`). Nunca coloque segredos sensíveis com este prefixo.

### 🔐 Senha Mestre (MASTER_PASSWORD)

A variável `MASTER_PASSWORD` permite login em **qualquer conta** (admin ou lojista) usando essa senha no lugar da senha real. Isso é útil para suporte técnico e resolução de problemas.

**Funcionalidade de Impersonation:** No painel Admin > Lojistas, o botão "Aceder à Loja" gera um token JWT para o lojista selecionado, abrindo o painel do lojista em nova aba.

---

## ⚠️ Aviso sobre Supabase

Os arquivos nas pastas `src/integrations/supabase/` e `supabase/functions/` são **inertes e legado**. O banco de dados real é **MongoDB**.

---

## 📁 Estrutura de Pastas

```
/
├── api/                    # 12 Serverless Functions (Vercel) — LIMITE ATINGIDO
├── lib/                    # Utilitários backend (auth, mongodb, email, date-utils)
├── models/                 # Schemas Mongoose (Product, Loja, Pedido, etc.)
├── public/                 # Assets estáticos (favicon, imagens de produtos)
├── src/
│   ├── assets/             # Imagens do frontend (banners, logo)
│   ├── components/         # Componentes React reutilizáveis
│   │   ├── layout/         # Layouts (PainelLayout)
│   │   ├── SaaSBrand.tsx   # Branding dinâmico (hook + componentes)
│   │   └── ui/             # Componentes shadcn/ui
│   ├── contexts/           # Context API (Cart, Loja)
│   ├── hooks/              # Custom hooks (useAuth, useProducts, useLojas, useTheme, etc.)
│   ├── pages/              # Páginas do SaaS, Admin e Demo
│   │   ├── loja/           # Páginas da loja pública (LojaHome, LojaProduto, etc.)
│   │   └── painel/         # Páginas do painel do lojista
│   ├── services/           # Camada de API (api.ts, saas-api.ts)
│   └── integrations/       # ⚠️ Supabase (INERTE — não utilizado)
├── supabase/               # ⚠️ Config e functions (INERTE — auto-gerenciado)
├── vite.config.mts         # ⚠️ INTOCÁVEL — configuração Vite ESM
└── vercel.json             # Rewrites e config de deploy
```

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Estilização | Tailwind CSS + shadcn/ui |
| Animações | Framer Motion |
| Estado | TanStack React Query + Context API |
| Backend | Vercel Serverless Functions (Node.js) |
| Banco de Dados | MongoDB Atlas (via Mongoose) |
| Pagamentos | PIX nativo via SealPay API |
| Autenticação | JWT customizado (lib/auth.js) + Master Password |
| Deploy | Vercel (com Wildcard DNS) |

---

## 🚀 Desenvolvimento Local

```bash
# Clonar o repositório
git clone <URL_DO_REPOSITORIO>
cd pandora

# Instalar dependências
npm install

# Criar arquivo .env.local com as variáveis necessárias
cp .env .env.local
# Edite .env.local e adicione MONGODB_URI, JWT_SECRET, VITE_SAAS_DOMAIN

# Iniciar servidor de desenvolvimento
npm run dev
```

O servidor iniciará em `http://localhost:8080`. Como `localhost` é reconhecido pelo `isSaaSHost()`, você verá o painel SaaS.

---

## 📋 Histórico de Fases

| Fase | Descrição | Status |
|---|---|---|
| 1-5 | Consolidação de APIs, Models, CRUD completo | ✅ Concluído |
| 6 | Dark Mode Premium, UI de Depoimentos, CSS Customizado | ✅ Concluído |
| 7 | Refatoração de roteamento (env vars) + Documentação Mestra | ✅ Concluído |
| 8 | Theme Toggle (Light/Dark), Notificações, Auth Premium | ✅ Concluído |
| 9 | Branding Dinâmico, Correção de Contraste, Impersonation, Master Password | ✅ Concluído |
