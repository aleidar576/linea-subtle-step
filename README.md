# 🛍️ PANDORA — SaaS Multi-Loja com PIX, Stripe, Pixels e UTMs

Plataforma SaaS de e-commerce multi-tenant com **Host-Based Routing**, checkout com **PIX nativo via SealPay**, **assinaturas recorrentes via Stripe**, **pixels de rastreamento multi-plataforma** (Facebook, TikTok, Google Ads, GTM), **UTMs completos**, recuperação de carrinho abandonado, **e-mails transacionais via Resend**, **CDN de imagens via Bunny.net** e painel administrativo completo. Cada lojista possui sua loja pública acessível via subdomínio ou domínio customizado.

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
| 4 | `api/create-pix.js` | Geração de cobranças PIX via SealPay + disparo CAPI Purchase ao confirmar pagamento |
| 5 | `api/loja-extras.js` | Stripe Checkout/Portal/Webhooks + Cupons + Fretes + Mídias + Temas + Pixels + Páginas + Leads + Upload Bunny.net |
| 6 | `api/lojas.js` | CRUD de lojas + domínios customizados |
| 7 | `api/lojista.js` | Perfil e gestão do lojista |
| 8 | `api/pedidos.js` | Gestão de pedidos e status |
| 9 | `api/pixels.ts` | Pixels de rastreamento (Facebook, TikTok, Google Ads, GTM) |
| 10 | `api/products.ts` | CRUD consolidado de produtos (slug, toggle, listagem) |
| 11 | `api/settings.js` | Configurações globais do SaaS + SealPay key + teste Resend + upload admin Bunny.net |
| 12 | `api/tracking-webhook.js` | Webhook de rastreamento de entregas + CAPI server-side filtrado por loja_id |

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

## 💳 Sistema de Assinaturas (Stripe) + Faturamento Duplo

### Arquitetura de Faturamento Duplo

O sistema utiliza **dois ciclos de cobrança independentes**:

| Ciclo | Frequência | Mecanismo | Campo no Lojista |
|---|---|---|---|
| **Mensalidade** | Mensal | Stripe Subscription (automático) | `data_vencimento` |
| **Taxas de Transação** | Semanal (7 dias) | Cron Vercel + Stripe Invoice avulsa | `data_vencimento_taxas`, `taxas_acumuladas` |

### Fluxo de Taxas de Transação

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Pedido pago │────▶│ Calcula taxa %   │────▶│ Acumula em          │
│  (PATCH)     │     │ + fixa do plano  │     │ taxas_acumuladas    │
└──────────────┘     └──────────────────┘     └────────┬────────────┘
                                                       │ (a cada 7 dias)
                                              ┌────────▼────────────┐
                                              │ Cron Vercel (3h UTC)│
                                              │ scope=cron-taxas    │
                                              └────────┬────────────┘
                                                       │
                                              ┌────────▼────────────┐
                                              │ Stripe InvoiceItem  │
                                              │ + Invoice.pay()     │
                                              └────────┬────────────┘
                                                       │
                                              ┌────────▼────────────┐
                                              │ Zera acumulado,     │
                                              │ +7 dias no ciclo    │
                                              └─────────────────────┘
```

### Campos de Taxa no Model Plano

| Campo | Tipo | Descrição | Default |
|---|---|---|---|
| `taxa_transacao_percentual` | Number | Taxa % aplicada a lojistas `active` | 1.5 |
| `taxa_transacao_trial` | Number | Taxa % aplicada durante o trial | 2.0 |
| `taxa_transacao_fixa` | Number | Valor fixo (R$) somado por transação | 0 |

> **Zero hardcode**: Todos os valores de taxa são configuráveis pelo Admin na tela de Gestão de Planos.

### Cron de Cobrança Semanal

Configurado em `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/loja-extras?scope=cron-taxas",
    "schedule": "0 3 * * *"
  }]
}
```

- Roda diariamente às 3h UTC
- Só processa lojistas onde `taxas_acumuladas > 0` E `data_vencimento_taxas <= agora`
- Protegido por `CRON_SECRET` (variável de ambiente)
- Em caso de falha, o valor NÃO é zerado (retenta no próximo ciclo)

### Auditoria de Eventos (historico_assinatura)

Todos os eventos relevantes do Stripe são registrados no array `historico_assinatura` do Lojista:

| Evento Stripe | Log Registrado |
|---|---|
| `checkout.session.completed` | Assinatura ativada (Checkout concluído). |
| `invoice.payment_succeeded` | Mensalidade do plano renovada com sucesso. |
| `invoice.payment_failed` | Falha no pagamento da fatura (Mensalidade ou Taxas). |
| `customer.subscription.updated` | Assinatura atualizada (Alteração de plano ou status). |
| `customer.subscription.deleted` | Assinatura cancelada definitivamente. |
| `charge.refunded` | Estorno processado. Acesso premium revogado imediatamente. |
| `cobranca_taxas_sucesso` | Cobrança semanal de taxas processada e paga: R$ X,XX |
| `cobranca_taxas_falha` | Falha na cobrança semanal de taxas: R$ X,XX |

O histórico é visível no painel Admin (Lojistas > Detalhes > Raio-X da Assinatura).

### Fluxo Completo de Assinatura

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Lojista se  │────▶│ Escolhe plano no │────▶│ Stripe Checkout  │
│  registra    │     │ painel /assinatura│     │ (trial 7 dias)   │
└──────────────┘     └──────────────────┘     └────────┬────────┘
                                                       │
                              ┌─────────────────────────┘
                              ▼
                    ┌──────────────────┐
                    │  Webhook recebe  │
                    │  session.completed│
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │ subscription_status│
                    │   = "trialing"    │
                    └────────┬─────────┘
                             │ (após 7 dias)
                    ┌────────▼─────────┐
                    │ invoice.payment   │
                    │   _succeeded      │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐     ┌──────────────────┐
                    │  status = "active"│────▶│ Stripe Portal    │
                    │  (plano ativo)    │     │ (gerenciar/cancel)│
                    └──────────────────┘     └──────────────────┘
```

### Eventos Webhook Tratados

| Evento Stripe | Ação no Sistema |
|---|---|
| `checkout.session.completed` | Cria assinatura, salva IDs Stripe, define status `trialing`, inicializa ciclo de taxas |
| `customer.subscription.updated` | Atualiza status, cancel_at_period_end, current_period_end + log auditoria |
| `customer.subscription.deleted` | Define `canceled`, limpa campos Stripe + log auditoria |
| `invoice.payment_succeeded` | Atualiza para `active`, registra `data_vencimento` + log auditoria |
| `invoice.payment_failed` | Define `past_due`, envia e-mail de falha + log auditoria |
| `charge.refunded` | Revoga acesso premium imediatamente, reset para free + log auditoria |

### Cancelamento Programado

Quando o lojista solicita cancelamento pelo Stripe Portal, o sistema recebe `cancel_at_period_end: true`:

| Comportamento | Detalhe |
|---|---|
| Badge | Muda de verde "Ativa" para laranja "Cancelamento Programado" |
| Aviso | Exibe data limite: "Sua assinatura será encerrada em DD/MM/AAAA" |
| Próxima cobrança | Linha **ocultada** (não haverá nova cobrança) |
| Retomada | Se o lojista clicar "Não cancelar" no Portal, webhook atualiza `cancel_at_period_end: false` |
| Auto-refresh | `visibilitychange` listener recarrega dados ao retornar do Portal |

### Campos no Model Lojista

| Campo | Tipo | Descrição |
|---|---|---|
| `plano` | String | Nome do plano ativo |
| `plano_id` | ObjectId | Referência ao model Plano |
| `stripe_customer_id` | String | ID do cliente no Stripe |
| `stripe_subscription_id` | String | ID da assinatura no Stripe |
| `subscription_status` | String | `trialing`, `active`, `past_due`, `canceled`, `incomplete` |
| `cancel_at_period_end` | Boolean | Se o cancelamento está agendado |
| `cancel_at` | Date | Data em que a assinatura será encerrada |
| `data_vencimento` | Date | Data da próxima cobrança mensal |
| `taxas_acumuladas` | Number | Valor em R$ acumulado de taxas de transação |
| `data_vencimento_taxas` | Date | Próximo débito do ciclo semanal de taxas |
| `historico_assinatura` | Array | Log de eventos de assinatura `[{ evento, data, detalhes }]` |

---

## 📡 Sistema de Pixels e Rastreamento

### Plataformas Suportadas

| Plataforma | Client-Side | Server-Side (CAPI) | Identificador |
|---|---|---|---|
| Facebook Pixel | ✅ `fbq()` | ✅ Conversions API | `pixel_id` + `access_token` |
| TikTok Pixel | ✅ `ttq.track()` | ✅ Events API | `pixel_id` + `access_token` |
| Google Ads | ✅ `gtag()` | ✅ Measurement Protocol | `pixel_id` (AW-xxx) + `access_token` + `conversion_label` |
| Google Tag Manager | ✅ `dataLayer.push()` | ❌ | `pixel_id` (GTM-xxx) |

### Eventos Suportados

| Evento | Onde é Disparado |
|---|---|
| `PageView` | Automático em cada navegação (LojaLayout) |
| `ViewContent` | Página do produto (LojaProduto) |
| `AddToCart` | Botão "Adicionar ao Carrinho" |
| `InitiateCheckout` | Página de checkout (LojaCheckout) |
| `AddPaymentInfo` | Geração do QR Code PIX |
| `Purchase` | Confirmação de pagamento (LojaSucesso + CAPI server-side) |

### Filtros por Pixel

Cada pixel pode ser configurado com filtros granulares:

- **`events`**: Array de eventos que o pixel deve disparar (ex: apenas `Purchase` e `AddToCart`)
- **`trigger_pages`**: Array de páginas onde o pixel é ativo (ex: `homepage`, `produto`, `checkout`, `categorias`)
- **`conversion_label`**: (Google Ads) Label específico para conversões
- **`product_ids`**: Filtro por produtos específicos (opcional)

### Fluxo Client-Side

```
LojaLayout.tsx
  └── firePixelEvent(event, data)
        ├── Facebook: fbq('track', event, data)
        ├── TikTok: ttq.track(event, data)
        ├── Google Ads: gtag('event', 'conversion', { send_to: 'AW-xxx/label' })
        └── GTM: dataLayer.push({ event, ...data })
```

### Fluxo Server-Side (CAPI)

```
api/create-pix.js (webhook PIX confirmado)
  └── POST /api/tracking-webhook
        └── Para cada pixel ativo da loja (filtrado por loja_id):
              ├── Facebook: POST graph.facebook.com/.../events (Purchase)
              ├── TikTok: POST business-api.tiktok.com/open_api/.../batch/ (CompletePayment)
              └── Google Ads: POST google-analytics.com/mp/collect (purchase)
```

---

## 🔗 UTMs e Atribuição de Marketing

### Parâmetros Capturados

| Parâmetro | Origem | Descrição |
|---|---|---|
| `utm_source` | URL | Fonte do tráfego (google, facebook, etc.) |
| `utm_medium` | URL | Meio (cpc, email, social, etc.) |
| `utm_campaign` | URL | Nome da campanha |
| `utm_term` | URL | Palavra-chave paga |
| `utm_content` | URL | Variação do anúncio |
| `utm_id` | URL | ID da campanha |
| `fbclid` | URL | Facebook Click ID |
| `gclid` | URL | Google Click ID |
| `ttclid` | URL | TikTok Click ID |
| `src` | URL | Fonte alternativa |
| `ref` | URL | Referência alternativa |

### Onde os UTMs São Salvos

| Local | Campos Salvos |
|---|---|
| Pedidos (`Pedido`) | `utm` (objeto completo), `src`, `fbp`, `fbc`, `gclid`, `ttclid`, `user_agent` |
| Carrinhos Abandonados | `utm` (objeto completo) |
| Payload PIX (SealPay) | `metadata.utm_*` |
| Cookies do navegador | `_fbp`, `_fbc` (lidos pelo hook) |
| `sessionStorage` | Todos os parâmetros UTM (persistidos entre navegações) |

### Hook `useUtmParams`

- Captura UTMs da URL na primeira visita
- Persiste em `sessionStorage` para manter entre navegações SPA
- `navigateWithUtm(url)` — adiciona UTMs salvos à URL de destino
- `getUtmForApi()` — retorna UTMs para envio em chamadas de API

### Hook `useTrackingData`

- `getTrackingPayload()` — retorna objeto com `utm`, `src`, `fbp`, `fbc`, `ttclid`, `gclid`, `user_agent`
- Lê cookies `_fbp` e `_fbc` do Facebook automaticamente

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

## 📧 Como Configurar o Resend (E-mails Transacionais)

### Passo a Passo

1. **Crie uma conta** em [resend.com](https://resend.com)
2. **Adicione e verifique seu domínio oficial**:
   - No painel Resend, vá em **Domains → Add Domain**
   - Adicione os registros DNS solicitados no seu provedor:
     - **SPF** (TXT): `v=spf1 include:_spf.resend.com ~all`
     - **DKIM** (TXT): Registro fornecido pelo Resend
     - **DMARC** (TXT): `v=DMARC1; p=none;` (recomendado)
   - Aguarde a verificação (pode levar até 48h)
3. **Crie uma API Key**:
   - Vá em **API Keys → Create API Key**
   - Copie a chave gerada (começa com `re_`)
   - Adicione na Vercel como variável de ambiente: `RESEND_API_KEY`
4. **Defina o remetente aprovado**:
   - Adicione na Vercel: `EMAIL_FROM_ADDRESS` com o endereço do domínio verificado
   - Exemplo: `noreply@seudominio.com`
5. **Teste a integração**:
   - Acesse **Admin → Integrações → Sandbox de Mensagens**
   - Envie um e-mail de teste para validar o envio

> ⚠️ **NUNCA** coloque chaves reais da API Resend no código-fonte. Use exclusivamente as variáveis de ambiente da Vercel.

### Templates de E-mail do Sistema

| Template | Função | Quando é Enviado |
|---|---|---|
| `emailVerificacaoHtml` | Verificação de e-mail | Registro de lojista ou cliente |
| `emailRedefinicaoSenhaHtml` | Redefinição de senha | Solicitação de "Esqueci minha senha" |
| `emailAlteracaoSenhaHtml` | Alerta de segurança | Alteração de senha (com token de segurança) |
| `emailRastreioHtml` | Código de rastreio | Atualização de status do pedido com rastreio |
| `emailRelatorioHtml` | Relatório exportado | Exportação de relatórios (com CSV/XLSX anexos) |
| `emailAssinaturaTrialHtml` | Boas-vindas trial | Início do período de teste de 7 dias |
| `emailFalhaPagamentoHtml` | Falha no pagamento | Cobrança recusada pela Stripe |

Todos os templates incluem **branding dinâmico** (logo e nome da plataforma) obtidos do banco de dados.

---

## ☁️ Como Configurar a Bunny.net (CDN e Imagens)

### Passo a Passo

1. **Crie uma conta** em [bunny.net](https://bunny.net)
2. **Crie uma Storage Zone**:
   - No painel Bunny, vá em **Storage → Add Storage Zone**
   - Escolha um nome (ex: `pandora-uploads`) e a região mais próxima
3. **Copie a API Key da Storage Zone**:
   - Dentro da Storage Zone, vá em **FTP & API Access**
   - Copie o campo **Password** (esta é a API Key)
   - Adicione na Vercel: `BUNNY_API_KEY`
4. **Adicione o nome da zona**:
   - Adicione na Vercel: `BUNNY_STORAGE_ZONE` com o nome exato da zona criada
5. **Crie uma Pull Zone**:
   - Vá em **CDN → Add Pull Zone**
   - Vincule à Storage Zone criada no passo 2
   - Copie o hostname gerado (ex: `pandora-uploads.b-cdn.net`)
   - Adicione na Vercel: `BUNNY_PULL_ZONE`
6. **Teste a conexão**:
   - Acesse **Admin → Integrações → Bunny.net**
   - Clique em **"Testar Conexão Bunny.net"** para validar

> ⚠️ **NUNCA** coloque a API Key da Bunny.net no código-fonte. Use exclusivamente as variáveis de ambiente da Vercel.

### Onde o Upload é Usado

| Contexto | Quem Usa | O que é Enviado |
|---|---|---|
| Admin → Integrações | Administrador | Logo da plataforma, assets globais |
| Painel → Mídias | Lojista | Imagens de produtos, banners da loja |

### Fluxo Técnico de Upload

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Frontend    │────▶│  API Serverless  │────▶│  Bunny Storage  │
│  (FormData)  │     │  (PUT request)   │     │  Zone (upload)  │
└──────────────┘     └──────────────────┘     └────────┬────────┘
                                                       │
                                              ┌────────▼────────┐
                                              │  Bunny Pull Zone│
                                              │  (CDN público)  │
                                              └────────┬────────┘
                                                       │
                                              ┌────────▼────────┐
                                              │  URL retornada  │
                                              │  ao frontend    │
                                              └─────────────────┘
```

---

## 🔑 Variáveis de Ambiente

Configure **todas** as variáveis abaixo no painel da Vercel (**Settings → Environment Variables**):

### Obrigatórias

| Variável | Descrição |
|---|---|
| `MONGODB_URI` | URI de conexão ao MongoDB Atlas |
| `JWT_SECRET` | Segredo para assinar tokens JWT de autenticação |
| `VITE_SAAS_DOMAIN` | Domínio principal do SaaS, **sem** `https://`, **sem** `www` |
| `VERCEL_PROJECT_ID` | ID do projeto na Vercel (usado pela API de domínios customizados) |
| `VERCEL_ACCESS_TOKEN` | Token de acesso da Vercel com permissão de escrita |

### Stripe (Assinaturas)

| Variável | Descrição |
|---|---|
| `STRIPE_SECRET_KEY` | Chave secreta do Stripe (`sk_live_...` ou `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Segredo do webhook Stripe (`whsec_...`) |
| `CRON_SECRET` | Segredo para autenticar o Cron de cobrança semanal de taxas |

### Resend (E-mails)

| Variável | Descrição |
|---|---|
| `RESEND_API_KEY` | Chave de API do Resend (`re_...`) |
| `EMAIL_FROM_ADDRESS` | Endereço de remetente aprovado (ex: `noreply@seudominio.com`) |

### Bunny.net (CDN)

| Variável | Descrição |
|---|---|
| `BUNNY_STORAGE_ZONE` | Nome da Storage Zone criada no Bunny.net |
| `BUNNY_API_KEY` | Senha/API Key da Storage Zone (campo Password em FTP & API Access) |
| `BUNNY_PULL_ZONE` | Hostname da Pull Zone CDN (ex: `nome.b-cdn.net`) |

### Opcionais

| Variável | Descrição |
|---|---|
| `MASTER_PASSWORD` | Senha mestre para acesso de suporte a qualquer conta. **⚠️ NUNCA commite no código** |

### Automáticas (Lovable Cloud)

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | Gerada automaticamente |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Gerada automaticamente |
| `VITE_SUPABASE_PROJECT_ID` | Gerada automaticamente |

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
├── models/                 # Schemas Mongoose (Product, Loja, Pedido, Lojista, TrackingPixel, etc.)
├── public/                 # Assets estáticos (favicon, imagens de produtos)
├── src/
│   ├── assets/             # Imagens do frontend (banners, logo)
│   ├── components/         # Componentes React reutilizáveis
│   │   ├── layout/         # Layouts (PainelLayout)
│   │   ├── LojaLayout.tsx  # Layout white-label da loja (tema, pixels, footer, header)
│   │   ├── SaaSBrand.tsx   # Branding dinâmico (hook + componentes)
│   │   └── ui/             # Componentes shadcn/ui
│   ├── contexts/           # Context API (Cart, Loja)
│   ├── hooks/              # Custom hooks
│   │   ├── useAuth.tsx     # Autenticação admin
│   │   ├── useLojistaAuth.tsx # Autenticação lojista
│   │   ├── useClienteAuth.tsx # Autenticação cliente da loja
│   │   ├── useTracking.tsx # Contexto de pixels (SaaS-side)
│   │   ├── useUtmParams.tsx # Captura e persistência de UTMs
│   │   ├── useLojaExtras.tsx # CRUD de fretes, cupons, mídias, temas, pixels, páginas, leads
│   │   └── useTheme.tsx    # Toggle light/dark mode
│   ├── pages/              # Páginas do SaaS, Admin e Demo
│   │   ├── loja/           # Páginas da loja pública (LojaHome, LojaProduto, LojaCheckout, etc.)
│   │   └── painel/         # Páginas do painel do lojista (Produtos, Pedidos, Pixels, Assinatura, etc.)
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
| Pagamentos PIX | PIX nativo via SealPay API |
| Assinaturas | Stripe (Checkout + Webhooks + Customer Portal) |
| E-mails | Resend (templates transacionais com branding dinâmico) |
| CDN / Imagens | Bunny.net (Storage Zone + Pull Zone) |
| Rastreamento | Facebook Pixel, TikTok Pixel, Google Ads, GTM (client + server-side CAPI) |
| Autenticação | JWT customizado (lib/auth.js) + Master Password + 2FA (speakeasy) |
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
| 10 | Sistema de Assinaturas Stripe (Checkout, Portal, Webhooks, Trial 7 dias) | ✅ Concluído |
| 11 | Pixels multi-plataforma (FB, TikTok, GAds, GTM) + CAPI server-side + filtro por loja_id | ✅ Concluído |
| 12 | UTMs completos, Cancelamento Programado Stripe, Refinamento UX assinatura, Tutoriais Resend e Bunny.net | ✅ Concluído |
| 13 | Faturamento Duplo (Mensalidade Stripe + Taxas Semanais via Cron), Auditoria de Eventos, Transparência Financeira nos Painéis | ✅ Concluído |
