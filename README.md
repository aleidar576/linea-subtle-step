# 🛍️ PANDORA — SaaS Multi-Loja com PIX, Stripe, Appmax, Pixels e UTMs

Plataforma SaaS de e-commerce multi-tenant com **Host-Based Routing**, checkout com **PIX nativo via SealPay**, **pagamentos via Appmax (PIX, Cartão, Boleto) com OAuth**, **assinaturas recorrentes via Stripe**, **pixels de rastreamento multi-plataforma** (Facebook, TikTok, Google Ads, GTM), **UTMs completos**, recuperação de carrinho abandonado, **e-mails transacionais via Resend**, **CDN de imagens via Bunny.net** e painel administrativo completo. Cada lojista possui sua loja pública acessível via subdomínio ou domínio customizado.

---

## 🏗️ Arquitetura de Microsserviços (17 Serverless Functions)

> O monólito `api/loja-extras.js` foi completamente decomposto via **Strangler Fig Pattern** em microsserviços especializados.
>
> **⚠️ Limite do plano Hobby da Vercel: máximo 12 Serverless Functions.** O projeto utiliza o **Strategy Pattern** com query params (`?scope=...`) para consolidar múltiplas rotas por arquivo, mantendo 17 arquivos dentro do limite operacional.

### Lista dos 17 Arquivos de API

| # | Arquivo | Descrição |
|---|---|---|
| 1 | `api/admins.js` | CRUD de administradores, gestão de lojistas, impersonation, métricas |
| 2 | `api/auth-action.ts` | Ações de autenticação (login, registro, reset) + Master Password |
| 3 | `api/assinaturas.js` | Stripe Checkout/Portal/Webhooks + Cron de taxas semanais |
| 4 | `api/categorias.js` | Categorias de produtos por loja |
| 5 | `api/cliente-auth.js` | Autenticação de clientes da loja pública |
| 6 | `api/fretes.js` | CRUD de regras de frete + cálculo dinâmico (Melhor Envio/Kangu) |
| 7 | `api/gateways.js` | Gateways de pagamento (disponíveis, salvar, desconectar, OAuth Appmax) |
| 8 | `api/lojas.js` | CRUD de lojas + domínios customizados |
| 9 | `api/lojista.js` | Perfil e gestão do lojista + notificações |
| 10 | `api/marketing.js` | Cupons + Leads (newsletter) + Pixels de rastreamento |
| 11 | `api/midia.js` | Upload Bunny.net + Mux Video Commerce (upload, status, delete) |
| 12 | `api/pedidos.js` | Gestão de pedidos, carrinhos abandonados, clientes, relatórios |
| 13 | `api/process-payment.js` | Processamento de pagamentos (PIX SealPay + Appmax multi-método) |
| 14 | `api/products.ts` | CRUD consolidado de produtos (slug, toggle, listagem, categoria pública) |
| 15 | `api/settings.js` | Configurações globais do SaaS + gateways plataforma + testes de integração |
| 16 | `api/storefront.js` | Temas + Páginas CMS + Vitrine pública (categorias, domain, products) |
| 17 | `api/tracking-webhook.js` | Webhook de rastreamento de entregas + CAPI server-side filtrado por loja_id |

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
    "path": "/api/assinaturas?scope=cron-taxas",
    "schedule": "0 12 * * *"
  }]
}
```

- Roda diariamente às **12h UTC (09h BRT)** — horário comercial brasileiro para maximizar chance de saldo no cartão
- Só processa lojistas onde `taxas_acumuladas > 0` E `data_vencimento_taxas <= agora` E `status_taxas !== 'bloqueado'`
- Protegido por `CRON_SECRET` (variável de ambiente)

### Smart Retry (Retentativas Inteligentes)

Quando o cartão do lojista é **recusado** na cobrança automática, o sistema entra em modo de retentativa:

```
┌──────────────────┐
│  Cron tenta      │
│  cobrar Invoice  │
└────────┬─────────┘
         │
    ┌────▼────┐
    │ Sucesso?│
    └────┬────┘
    SIM  │  NÃO
    ┌────┘  └────────────────────────────────────┐
    │                                            │
    ▼                                            ▼
┌──────────────┐                    ┌─────────────────────────┐
│ Zera taxas,  │                    │ tentativas_taxas += 1   │
│ status = ok, │                    │                         │
│ +7 dias ciclo│                    │ tentativas < 3?         │
└──────────────┘                    └──────┬──────────────────┘
                                    SIM    │    NÃO
                                    ┌──────┘    └──────────┐
                                    ▼                      ▼
                           ┌────────────────┐    ┌──────────────────┐
                           │ status = falha │    │ status = bloqueado│
                           │ +24h no ciclo  │    │ Só paga manual   │
                           │ (tenta amanhã) │    │ via botão no UI  │
                           └────────────────┘    └──────────────────┘
```

| Estado | Significado | Ação do Cron |
|---|---|---|
| `ok` | Pagamento em dia | Cobra normalmente |
| `falha` | Cartão recusado (< 3 tentativas) | Reagenda +24h e tenta novamente |
| `bloqueado` | 3 falhas consecutivas | Ignorado pelo Cron — só regulariza manualmente |

### Endpoint de Regularização Manual

Escopo: `?scope=pagar-taxas-manual` (POST autenticado)

Permite que o lojista pague as taxas pendentes a qualquer momento, independentemente do status:

1. Valida autenticação JWT e verifica `taxas_acumuladas > 0`
2. Cria `InvoiceItem` + `Invoice.pay()` via Stripe (mesma lógica do Cron)
3. **Sucesso**: Zera taxas, reseta tentativas, volta `status_taxas` para `ok`, agenda +7 dias
4. **Falha**: Retorna erro 400 informando que o cartão foi recusado

O UI exibe banners condicionais:
- **Amarelo** (`status_taxas === 'falha'`): Aviso de falha com data da próxima tentativa automática
- **Vermelho** (`status_taxas === 'bloqueado'`): Aviso urgente com botão "Regularizar Pagamento Agora"

### Campos de Retry no Model Lojista

| Campo | Tipo | Descrição |
|---|---|---|
| `tentativas_taxas` | Number | Contador de falhas consecutivas (0-3) |
| `status_taxas` | String | Estado da cobrança: `ok`, `falha`, `bloqueado` |

> **Regra de ouro**: O valor em `taxas_acumuladas` **NUNCA** é zerado em caso de falha — apenas em caso de sucesso.

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

## 🏦 Ecossistema de Gateways de Pagamento

### Arquitetura

O sistema de gateways é **modular e extensível**, com definições estáticas no frontend e controle de visibilidade pelo Admin:

```
┌──────────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│  src/config/gateways │     │  Admin (Settings)    │     │  Lojista (Model)     │
│  .ts (estático)      │     │  gateways_ativos     │     │  gateway_ativo       │
│                      │     │  (visibilidade)      │     │  gateways_config     │
│  - SealPay           │────▶│  - SealPay: ativo    │────▶│  - sealpay: {key}    │
│  - Appmax            │     │  - Appmax: ativo     │     │  - appmax: {creds}   │
└──────────────────────┘     └──────────────────────┘     └──────────────────────┘
```

### Gateways Disponíveis

| Gateway | Métodos | Tipo de Integração | Status |
|---|---|---|---|
| **SealPay** | PIX | Chave API direta | ✅ Ativo |
| **Appmax** | PIX, Cartão, Boleto | OAuth (Instalação de App) | ✅ Ativo |

### Fluxo de Configuração

1. **Admin** habilita/desabilita gateways globalmente em `AdminGateways.tsx`
2. **Admin** pode customizar nome, logo e descrição de cada gateway (Dialog de edição)
3. **Lojista** vê apenas os gateways habilitados pelo Admin em `LojaGateways.tsx`
4. **Lojista** configura suas credenciais via Sheet lateral (gaveta direita)
5. **Lojista** ativa o gateway como padrão para receber pagamentos

### Campos no Model Lojista

| Campo | Tipo | Descrição |
|---|---|---|
| `gateway_ativo` | String | ID do gateway ativo (`sealpay`, `appmax`, ou `null`) |
| `gateways_config` | Mixed | Objeto com credenciais por gateway: `{ sealpay: { api_key }, appmax: { client_id, client_secret, external_id } }` |

---

# 🧠 RELEMBRE A IA: Ecossistema de Gateways (Dusking SaaS)

## 📌 1. Arquitetura Geral (A Regra do "Zero CRUD")

O nosso SaaS possui uma arquitetura Multi-Gateway baseada em **"Zero CRUD"** no backend. 

- Não existe uma tabela/banco de dados para "cadastrar" novos gateways.

- A lista de gateways suportados é **estática** e vive no Frontend.

- O Administrador (Plataforma) apenas liga/desliga a visibilidade e configura as credenciais globais (OAuth, URLs de Sandbox/Prod) através da tabela genérica `Settings`.

- O Lojista (Tenant) salva as suas credenciais locais dentro do seu próprio documento no banco de dados.

## 📂 2. Mapa de Arquivos Principais (Onde Mexer)

Se você (IA) precisar adicionar, editar ou remover um Gateway, restrinja-se aos seguintes arquivos:

### Frontend (Interface e Regras Visuais)

1. `src/config/gateways.ts`: **A Fonte da Verdade.** É aqui que você adiciona o objeto estático do novo gateway (ID, Nome, Logo, Métodos de pagamento suportados).

2. `src/pages/AdminGateways.tsx`: Painel do Admin. Possui um `Dialog` com os inputs para o dono da plataforma colar URLs de API, URLs de Auth e alternar o switch de Sandbox/Produção.

3. `src/pages/painel/LojaGateways.tsx`: Painel do Lojista. Possui um layout "Vega" (Grid 1/3 e 2/3). A configuração do gateway ocorre dentro de um componente `<Sheet>` lateral. Cada gateway tem o seu `case 'nome_gateway':` com seus próprios inputs ou botões de OAuth.

4. `src/pages/loja/LojaCheckout.tsx`: A tela de Checkout Pública. Possui regras rígidas de renderização e bloqueio (veja as Regras de Ouro abaixo).

### Backend e Banco de Dados (Regras de Negócio)

1. `models/Lojista.js`: Possui `gateway_ativo` (String) e `gateways_config` (Object/Mixed).

2. `api/settings.js`: Controla as configurações globais do admin no escopo `?scope=gateways-plataforma`.

3. `api/gateways.js`: Controla o que o lojista vê e salva nos escopos `gateways-disponiveis`, `salvar-gateway` e `desconectar-gateway`. **Rotas de OAuth de Gateways (como redirecionamento e webhooks de instalação) devem ser criadas aqui usando escopos.**

---

## 🛑 3. Regras de Ouro e Limites Inegociáveis

Se você for instruída a mexer em pagamentos ou gateways, você **DEVE** respeitar estas regras:

1. **Limite da Pasta API:** Novas integrações de backend devem ser feitas adicionando `scopes` lógicos (ex: `if (scope === 'stripe-connect')`) dentro do microsserviço apropriado (`api/gateways.js`, `api/marketing.js`, etc.) ou arquivos existentes.

2. **NUNCA altere o `vite.config.mts`.**

3. **Mongoose `markModified`:** Como `gateways_config` é um objeto do tipo `Mixed` no MongoDB, toda vez que você atualizar uma chave de gateway no backend, você é OBRIGADA a rodar `lojista.markModified('gateways_config')` antes do `lojista.save()`, senão o Node.js não salvará as alterações.

4. **Checkout - A Regra do Bloqueio Absoluto:** No arquivo `LojaCheckout.tsx`, se o `gatewayAtivo` for `null`, `undefined` ou vazio, a tela inteira DEVE ser bloqueada por um overlay (Tela Cheia) impedindo o cliente final de interagir com o carrinho.

5. **Checkout - Condicional de Métodos de Pagamento:** O Checkout deve ler os `metodosSuportados` (array de strings) do gateway ativo. 

   - Se for `sealpay`: Oculte as abas de Cartão e Boleto. Mostre apenas PIX.

   - Se for `appmax`: Mostre Cartão, PIX e Boleto.

6. **Injeção Dinâmica de Scripts:** Nunca "chumbe" scripts de gateways (como o `appmax.min.js`) no `index.html` ou de forma global no React. Eles devem ser injetados dinamicamente via `useEffect` no Checkout APENAS se aquele for o `gatewayAtivo` do lojista.

---

## 🛠️ 4. Como adicionar um NOVO Gateway (Passo a Passo para a IA)

Quando for solicitado a adição de um novo Gateway (ex: Mercado Pago), siga este fluxo:

1. Adicione as constantes em `src/config/gateways.ts`.

2. Adicione os campos de configuração global (Tokens de Admin, chaves de Sandbox) na tipagem `GatewayPlatformConfig` em `saas-api.ts`.

3. Crie os campos no Dialog do Admin em `AdminGateways.tsx`.

4. Crie o formulário ou botão de OAuth no `case 'novo_gateway':` dentro do Sheet em `LojaGateways.tsx`.

5. Se for OAuth, crie os escopos de conexão (`novo-connect` e `novo-install`) em `api/gateways.js`.

6. Atualize as condicionais visuais de métodos de pagamento no `LojaCheckout.tsx`.

---

## 🔗 Integração OAuth Appmax (Instalação de Aplicativo)

### Pré-Requisitos

1. Criar um **Aplicativo** no [painel de desenvolvedor da Appmax](https://admin.appmax.com.br)
2. Preencher as URLs de integração (disponíveis em Admin > Gateways > Editar Appmax):
   - **Host (Webhook):** `https://seudominio.com/api/gateways?scope=appmax-webhook`
   - **URL do Sistema:** `https://seudominio.com`
   - **URL de Validação:** `https://seudominio.com/api/gateways?scope=appmax-install`
3. Configurar as variáveis de ambiente na Vercel (ver seção abaixo)

### Fluxo OAuth Completo

```
┌──────────────────┐     ┌──────────────────────┐     ┌──────────────────────┐
│  Lojista clica   │────▶│  Backend obtém       │────▶│  Backend solicita    │
│  "Conectar       │     │  Bearer Token via    │     │  autorização do app  │
│  Appmax"         │     │  client_credentials  │     │  (POST /app/authorize│
└──────────────────┘     └──────────────────────┘     └──────────┬───────────┘
                                                                 │
                                                        ┌────────▼───────────┐
                                                        │  Appmax retorna    │
                                                        │  hash de install   │
                                                        └────────┬───────────┘
                                                                 │
┌──────────────────┐     ┌──────────────────────┐     ┌──────────▼───────────┐
│  Lojista autoriza│◀────│  Redirect para       │◀────│  Frontend redireciona│
│  no painel       │     │  admin.appmax.com.br  │     │  via redirect_url    │
│  Appmax          │     │  /appstore/integration│     │                      │
└────────┬─────────┘     └──────────────────────┘     └──────────────────────┘
         │
         │ (Appmax envia POST para URL de Validação)
         ▼
┌──────────────────┐     ┌──────────────────────┐
│  Webhook recebe  │────▶│  Salva credenciais   │
│  client_id,      │     │  no Lojista:         │
│  client_secret,  │     │  gateways_config     │
│  external_key    │     │  .appmax = {...}     │
└──────────────────┘     │  gateway_ativo =     │
                         │  'appmax'            │
                         └──────────────────────┘
```

### Scopes no Backend (`api/gateways.js`)

| Scope | Método | Auth | Descrição |
|---|---|---|---|
| `appmax-connect` | GET | JWT Lojista | Obtém Bearer Token e retorna `redirect_url` para autorização |
| `appmax-install` | POST | Público (webhook) | Recebe credenciais da Appmax, gera `external_id`, salva no Lojista |

### Detalhes do Scope `appmax-connect`

1. Lê variáveis de ambiente: `APPMAX_APP_ID`, `APPMAX_CLIENT_ID`, `APPMAX_CLIENT_SECRET`
2. POST para `https://auth.appmax.com.br/oauth2/token` (grant_type=client_credentials)
3. POST para `https://api.appmax.com.br/app/authorize` com `app_id`, `external_key` (= lojista._id), `url_callback`
4. Retorna `{ redirect_url: 'https://admin.appmax.com.br/appstore/integration/HASH' }`

### Detalhes do Scope `appmax-install`

1. Recebe POST da Appmax com `app_id`, `client_id`, `client_secret`, `external_key`
2. Busca Lojista pelo `_id` usando `external_key`
3. Gera UUID via `crypto.randomUUID()`
4. Salva `gateways_config.appmax = { client_id, client_secret, external_id }`
5. Define `gateway_ativo = 'appmax'` e usa `markModified('gateways_config')` (campo Mixed do Mongoose)
6. Retorna `200` com `{ external_id }` — **obrigatório** para a Appmax completar a instalação

### Frontend do Lojista (`LojaGateways.tsx`)

O componente `AppmaxConfig` exibe dois estados:

| Estado | UI | Ação |
|---|---|---|
| **Desconectado** | Texto explicativo + botão "Conectar Conta Appmax" | Chama `appmax-connect` e redireciona |
| **Conectado** | Alerta verde + ID de conexão (readonly) + botão "Ativar" | Chama `salvar-gateway` para ativar |

> O botão de conexão inclui `try/catch` com `toast.error` para tratar erros 500 (ex: variáveis de ambiente não configuradas).

### Frontend Admin (`AdminGateways.tsx`)

O Dialog de edição da Appmax exibe uma seção adicional **"URLs de Integração do App"** com 3 campos read-only e botão de copiar:

- Host (Webhook)
- URL do Sistema
- URL de Validação

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

### Appmax (OAuth)

| Variável | Descrição |
|---|---|
| `APPMAX_APP_ID` | ID do aplicativo criado no painel de desenvolvedor da Appmax |
| `APPMAX_CLIENT_ID` | Client ID do aplicativo Appmax |
| `APPMAX_CLIENT_SECRET` | Client Secret do aplicativo Appmax |

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
├── api/                    # 17 Serverless Functions (Vercel) — Microsserviços especializados
│   ├── admins.js           # Admin: CRUD, lojistas, impersonation, métricas
│   ├── assinaturas.js      # Stripe: Checkout, Portal, Webhooks, Cron taxas
│   ├── auth-action.ts      # Autenticação: login, registro, reset, 2FA
│   ├── categorias.js       # CRUD categorias de produtos
│   ├── cliente-auth.js     # Autenticação clientes da loja
│   ├── fretes.js           # CRUD fretes + cálculo dinâmico
│   ├── gateways.js         # Gateways de pagamento (config + OAuth Appmax)
│   ├── lojas.js            # CRUD lojas + domínios customizados
│   ├── lojista.js          # Perfil lojista + notificações
│   ├── marketing.js        # Cupons + Leads + Pixels
│   ├── midia.js            # Upload Bunny.net + Mux Video
│   ├── pedidos.js          # Pedidos, carrinhos, clientes, relatórios
│   ├── process-payment.js  # Processamento pagamentos (PIX + Appmax)
│   ├── products.ts         # CRUD produtos + listagem pública
│   ├── settings.js         # Config globais + testes integração
│   ├── storefront.js       # Temas + Páginas CMS + Vitrine pública
│   └── tracking-webhook.js # Webhook rastreamento + CAPI
├── lib/                    # Utilitários backend (auth, mongodb, email, date-utils)
│   └── services/           # 🏭 Strategy Pattern — Serviços modulares por domínio
│       ├── pagamentos/
│       │   ├── index.js    # Factory: getPaymentService(gatewayId)
│       │   ├── sealpay.js  # Implementação SealPay
│       │   └── appmax.js   # Implementação Appmax
│       ├── fretes/
│       │   ├── index.js    # Factory: getShippingService(integracoes)
│       │   └── melhorEnvio.js # Implementação Melhor Envio
│       └── assinaturas/
│           ├── index.js    # Factory: getSubscriptionService(provider)
│           └── stripe.js   # Implementação Stripe
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
│   │   ├── useLojaExtras.tsx # Hooks React Query para fretes, cupons, mídias, temas, pixels, páginas, leads
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
| Pagamentos Multi-método | Appmax (PIX, Cartão, Boleto) via OAuth |
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

## 🏭 Arquitetura de Serviços (Strategy Pattern)

A partir da Fase 17, o projeto adota o **Design Pattern Strategy** para desacoplar integrações externas dos controllers (Serverless Functions). Isso permite adicionar novos gateways de pagamento e plataformas de frete **sem criar novos arquivos na pasta `/api`**.

### Como funciona

```
api/process-payment.js (Controller)
    └── getPaymentService('sealpay')  →  lib/services/pagamentos/sealpay.js
                                          ├── getStatus(txid)
                                          ├── handleWebhook({ txid, status, req })
                                          └── createPayment({ amount, customer, ... })

api/pedidos.js (Controller)
    └── getShippingService(integracoes)  →  lib/services/fretes/melhorEnvio.js
                                              ├── gerarEtiqueta({ pedido, loja, overrideServiceId })
                                              ├── cancelarEtiqueta({ pedido, loja })
                                              └── calcularFrete({ meConfig, cepOrigem, to_postal_code, items })

api/assinaturas.js (Controller)
    └── getSubscriptionService('stripe')  →  lib/services/assinaturas/stripe.js
                                                ├── createCheckoutSession({ user, plano_id })
                                                ├── handleWebhookEvent({ event, rawBody })
                                                ├── createPortalSession({ user })
                                                ├── processarCronTaxas()
                                                └── pagarTaxasManual({ user })
```

### Para adicionar um novo gateway (ex: Mercado Pago)

1. Crie `lib/services/pagamentos/mercadoPago.js` implementando `{ getStatus, handleWebhook, createPayment }`
2. Atualize a factory `lib/services/pagamentos/index.js` para incluir o novo `case 'mercadopago'`
3. **Nenhum novo arquivo em `/api` é necessário** — o controller existente chama a factory

### Para adicionar uma nova plataforma de frete (ex: Kangu)

1. Crie `lib/services/fretes/kangu.js` implementando `{ gerarEtiqueta, cancelarEtiqueta, calcularFrete }`
2. Atualize a factory `lib/services/fretes/index.js` para incluir o novo `case`
3. **Nenhum novo arquivo em `/api` é necessário**

### Regra de ouro

> Arquivos em `lib/services/` **NÃO contam como Serverless Functions**. A Vercel só transforma em function os arquivos dentro de `/api`. Tudo em `lib/` é bundled como módulo Node.js auxiliar.

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
| 13 | Faturamento Duplo (Mensalidade Stripe + Taxas Semanais via Cron), Auditoria de Eventos, Transparência Financeira | ✅ Concluído |
| 14 | Smart Retry (3 tentativas automáticas + reagendamento 24h), Regularização Manual de Taxas | ✅ Concluído |
| 15 | Ecossistema de Gateways (Admin + Lojista + Checkout), Sheet modular, SealPay migrado | ✅ Concluído |
| 16 | OAuth Appmax (Instalação de Aplicativo), scopes appmax-connect/appmax-install | ✅ Concluído |
| 17 | **Strategy Pattern** — Extração de SealPay, Melhor Envio e Stripe para `lib/services/` com factories modulares | ✅ Concluído |

### Strangler Fig — Decomposição do Monólito `api/loja-extras.js`

| Fase | Microsserviço Extraído | Escopos Migrados | Status |
|---|---|---|---|
| SF-1 | `api/midia.js` | midias, midia, upload, mux-upload, mux-status, mux-delete | ✅ Concluído |
| SF-2 | `api/fretes.js` | fretes, frete, fretes-publico, calcular-frete | ✅ Concluído |
| SF-3 | `api/assinaturas.js` | stripe-checkout, stripe-portal, stripe-webhook, cron-taxas, pagar-taxas-manual | ✅ Concluído |
| SF-4 | `api/gateways.js` | gateways-disponiveis, gateway-loja, salvar-gateway, desconectar-gateway, appmax-connect, appmax-install, appmax-webhook | ✅ Concluído |
| SF-5 | `api/marketing.js` | cupons, cupom, cupom-publico, cupons-popup, leads, lead, lead-newsletter, leads-import, leads-export, pixels, pixel | ✅ Concluído |
| SF-5 | `api/storefront.js` | tema, paginas, pagina, pagina-publica, categorias-publico, global-domain, category-products | ✅ Concluído |
| **Final** | **`api/loja-extras.js` DELETADO** | — | ✅ **Monólito eliminado** |
