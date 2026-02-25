

## Sistema de Assinaturas, Planos, Inadimplencia e Reformulacao Admin

Implementacao completa de ponta a ponta: Models -> Rotas API -> Services -> UI.

---

### Restricoes Tecnicas Identificadas

- A pasta `api/` ja tem 12 arquivos (limite maximo). Novos endpoints usarao **escopos** dentro de `api/settings.js` (planos CRUD) e `api/loja-extras.js` (Stripe checkout/webhooks/portal).
- O arquivo `vite.config.mts` NAO sera alterado.
- Nenhuma cor hex hardcoded; apenas Tailwind e variaveis do tema.

---

### ETAPA 1: Banco de Dados e Backend (Motor)

**1.1 Novo Model: `models/Plano.js`**

```text
Schema:
  nome: String (required)
  preco_original: Number
  preco_promocional: Number
  taxa_transacao: Number (percentual, ex: 1.5)
  stripe_price_id: String (required)
  vantagens: [String]
  destaque: Boolean (default false)
  ordem: Number (default 0)
  is_active: Boolean (default true)
  criado_em: Date
```

**1.2 Atualizar Model: `models/Lojista.js`**

Adicionar campos:
- `cpf_cnpj: String (default '')`
- `stripe_customer_id: String (default null)`
- `stripe_subscription_id: String (default null)`
- `subscription_status: String (enum: [null, 'trialing', 'active', 'past_due', 'canceled', 'unpaid'], default null)`
- `plano_id: ObjectId (ref: 'Plano', default null)` -- referencia ao plano ativo
- `acesso_bloqueado: Boolean (default false)` -- bloqueio de login pelo admin (diferente de `bloqueado` que e inadimplencia)

Atualizar enum `plano`: manter legado `['free', 'plus']` mas adicionar `['starter', 'pro', 'scale']` para os novos planos Stripe.

**1.3 Rotas API: Planos CRUD (escopo em `api/settings.js`)**

Novos escopos:
- `GET ?scope=planos` -- lista planos (publico, sem auth)
- `GET ?scope=plano&id=X` -- detalhe de um plano
- `POST ?scope=plano` -- criar plano (admin only)
- `PUT ?scope=plano&id=X` -- atualizar plano (admin only)
- `DELETE ?scope=plano&id=X` -- deletar plano (admin only)
- `POST ?scope=planos-seed` -- seed inicial (admin only, idempotente)

Seed inicial (3 planos):
| Nome | Taxa | Stripe Price ID |
|---|---|---|
| Starter | 1.5% | price_1T4WY1Fp1n9NwetZpst9MoW0 |
| Pro | 1.2% | price_1T4WZGFp1n9NwetZOAsuV30x |
| Scale | 1.0% | price_1T4WZrFp1n9NwetZEAw3WVOu |

Regra: Taxa durante trial de 7 dias = 2.0% (hardcoded no backend, nao no plano).

**1.4 Rota Stripe Checkout (escopo em `api/loja-extras.js`)**

Novos escopos:
- `POST ?scope=stripe-checkout` -- Lojista autenticado envia `plano_id`. Backend busca o plano no banco, valida CPF/telefone do lojista, cria a sessao Stripe com `checkout.sessions.create({ mode: 'subscription', line_items: [{ price: plano.stripe_price_id, quantity: 1 }], subscription_data: { trial_period_days: 7 }, client_reference_id: lojista._id, customer_email: lojista.email, success_url, cancel_url })`. Retorna `{ url: session.url }`.
- `POST ?scope=stripe-webhook` -- Webhook do Stripe (sem auth JWT, valida via `stripe.webhooks.constructEvent`). Trata eventos: `checkout.session.completed` (atualiza lojista com subscription_id, customer_id, plano), `invoice.payment_succeeded`, `invoice.payment_failed` (envia email de aviso), `customer.subscription.updated` (status change), `customer.subscription.deleted`.
- `POST ?scope=stripe-portal` -- Lojista autenticado. Cria sessao do Stripe Billing Portal para gerenciar assinatura.

Dependencia: `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` como environment variables.

**1.5 Atualizar `api/lojista.js`**

- No PUT de perfil, aceitar `cpf_cnpj` alem de `nome`, `telefone`, `avatar_url`.

**1.6 Atualizar `vercel.json`**

- Nao precisa de novas entradas (os escopos usam rotas ja existentes: `/api/settings` e `/api/loja-extras`).

---

### ETAPA 2: Service Layer + Tela de Planos

**2.1 Atualizar `src/services/saas-api.ts`**

Novos tipos e endpoints:

```text
interface Plano {
  _id: string; nome: string; preco_original: number;
  preco_promocional: number; taxa_transacao: number;
  stripe_price_id: string; vantagens: string[];
  destaque: boolean; ordem: number; is_active: boolean;
}

planosApi:
  list() -> GET /settings?scope=planos
  create(data) -> POST /settings?scope=plano (admin)
  update(id, data) -> PUT /settings?scope=plano&id=X (admin)
  delete(id) -> DELETE /settings?scope=plano&id=X (admin)
  seed() -> POST /settings?scope=planos-seed (admin)

stripeApi:
  createCheckout(plano_id) -> POST /loja-extras?scope=stripe-checkout
  createPortal() -> POST /loja-extras?scope=stripe-portal
```

Atualizar `lojistaApi.atualizar` para aceitar `cpf_cnpj`.
Atualizar `LojistaProfile` interface para incluir `cpf_cnpj`, `subscription_status`, `stripe_subscription_id`, `acesso_bloqueado`.

**2.2 Refatorar `src/pages/painel/LojaAssinatura.tsx`**

Comportamento condicional:
- Se `subscription_status` esta ativo/trialing: mostra resumo do plano atual + botao "Gerenciar Assinatura" (Stripe Portal).
- Se nao tem assinatura: mostra cards dos planos (GET /settings?scope=planos).

Card de plano:
- Preco original riscado: `line-through decoration-destructive/50 text-muted-foreground`
- Preco promocional: `text-4xl font-extrabold text-foreground`
- Vantagens com `CheckCircle2` verde (`text-green-500`)
- Plano destaque: borda `border-primary`, badge "Recomendado"
- Botao: "Comecar 7 Dias Gratis"

Trava de seguranca: Ao clicar no botao, verifica CPF/CNPJ e telefone. Se faltar, exibe toast destructive com link para perfil.

**2.3 Atualizar navegacao: `src/components/layout/PainelLayout.tsx`**

- Mudar label "Assinatura" para "Planos" no dropdown do usuario (linha 221).

---

### ETAPA 3: Cadastro, Perfil e Checklist

**3.1 Atualizar `src/pages/LojistaRegistro.tsx`**

- Adicionar campo "Telefone" obrigatorio no formulario de registro.
- Enviar `telefone` no payload de `lojistaAuthApi.registro()`.

**3.2 Atualizar `src/pages/painel/LojaPerfil.tsx`**

- Adicionar campo "CPF/CNPJ" no formulario de dados pessoais.
- Ao salvar com CPF e telefone preenchidos (vindo de estado incompleto), exibir toast: "Acesso ao free trial liberado, clique para assinar" com link para `/painel/assinatura`.

**3.3 Atualizar `src/pages/painel/PainelInicio.tsx`**

- Adicionar item no checklist: "Complete seus dados pessoais (CPF e Telefone)".
- Verificar se `profile.cpf_cnpj` e `profile.telefone` estao preenchidos.
- Ao clicar no item, navega para `/painel/perfil`.
- Se ja preenchido, exibe check verde.

---

### ETAPA 4: Webhooks e Emails

**4.1 Webhook Stripe (dentro de `api/loja-extras.js?scope=stripe-webhook`)**

Eventos tratados:
- `checkout.session.completed`: Atualiza `Lojista` com `stripe_customer_id`, `stripe_subscription_id`, `subscription_status: 'trialing'`, define `plano` baseado no price_id, define `data_vencimento`. Envia email de boas-vindas com data da primeira cobranca.
- `invoice.payment_succeeded`: Atualiza `subscription_status: 'active'`, atualiza `data_vencimento`.
- `invoice.payment_failed`: Atualiza `subscription_status: 'past_due'`. Envia email de aviso de falha.
- `customer.subscription.deleted`: Atualiza `subscription_status: 'canceled'`, `plano: 'free'`.

**4.2 Templates de email (em `lib/email.js`)**

Adicionar 2 novas funcoes:
- `emailAssinaturaTrialHtml({ nome, plano_nome, data_cobranca, branding })` -- "Voce assinou o plano {Nome}. Agradecemos a confianca! Sua primeira cobranca sera realizada automaticamente no dia {Data}."
- `emailFalhaPagamentoHtml({ nome, branding })` -- Aviso de falha com link para o painel.

**4.3 Stripe Portal (dentro de `api/loja-extras.js?scope=stripe-portal`)**

- Lojista autenticado, busca `stripe_customer_id`, cria sessao do Billing Portal, retorna URL.

---

### ETAPA 5: Banners de Inadimplencia e Bloqueio White-Label

**5.1 Atualizar `src/components/layout/PainelLayout.tsx`**

Antes do `<Outlet />`, adicionar logica de banner baseada em `checkTolerancia`:
- O frontend faz GET no perfil (ja disponivel via `useLojistaAuth`). O backend retorna `subscription_status` e `data_vencimento`.
- Se `subscription_status === 'past_due'` E na carencia: Banner amarelo/laranja com texto amigavel.
- Se `subscription_status === 'past_due'` E fora da carencia (bloqueado): Banner VERMELHO: "SUA LOJA FOI BLOQUEADA, REGULARIZE AGORA CLICANDO AQUI" -> navega para `/painel/assinatura`.

**5.2 Atualizar `src/App.tsx` -- Loja Publica White-Label**

No componente `LojaPublicaApp`, apos carregar a loja via `useLojaByDomain`:
- Se a loja do lojista estiver BLOQUEADA (`is_blocked` flag retornado pela API publica):
  - Renderiza APENAS: tela branca, texto centralizado "Regularize seu plano para continuar a vender."
  - PROIBIDO: logo do SaaS, header, footer.
- A logica de bloqueio e verificada no backend (`api/lojas.js?scope=public`) usando `checkTolerancia` no lojista dono da loja.

**5.3 Atualizar `api/lojas.js` (scope=public)**

- Ao buscar loja publica, verificar `checkTolerancia` no lojista. Se bloqueado, retornar `{ is_blocked: true }` em vez dos dados da loja (ou junto com eles, para o frontend decidir).

---

### ETAPA 6: Reformulacao do Admin

**6.1 Nova tela: `src/pages/AdminPlanos.tsx`**

- CRUD de planos com tabela editavel.
- Campos: nome, preco original, preco promocional, taxa de transacao, stripe_price_id, vantagens (array com botao "[+] Adicionar Vantagem" dinamico).
- Botao "Seed Inicial" para popular os 3 planos padrao.

**6.2 Atualizar `src/components/AdminLayout.tsx`**

- Adicionar item de navegacao: `{ to: '/admin/planos', label: 'Planos', icon: CreditCard }`.

**6.3 Atualizar `src/App.tsx`**

- Adicionar rota: `<Route path="planos" element={<AdminPlanos />} />` dentro do bloco admin.

**6.4 Refatorar `src/pages/AdminLojistas.tsx`**

- REMOVER: Botao "Ativar Loja Manual" e a logica `handleAtivarLojaManual`.
- REMOVER: Select de plano (free/plus) na gestao de plano -- plano agora e gerido via Stripe.
- MANTER: "Modo Amigo", "Liberar Visualizacao de Subdominio", impersonation, metricas, tolerancia.
- ADICIONAR: Botao vermelho "Bloquear Acesso do Lojista" -- seta `acesso_bloqueado: true`. Quando ativo, o login retorna: "Seu acesso foi suspenso. Entre em contato com o suporte via WhatsApp." (com link).

**6.5 Atualizar `api/admins.js`**

- Adicionar action `bloquear-acesso`: seta `acesso_bloqueado` (diferente do `bloqueado` de inadimplencia).
- Remover action `ativar-loja-manual`.

**6.6 Atualizar `api/auth-action.ts`**

- No login-lojista: verificar `acesso_bloqueado`. Se true, retornar erro com mensagem de suporte + link WhatsApp.

**6.7 Atualizar `src/services/api.ts`**

- Adicionar `adminsApi.bloquearAcesso(id)`.
- Adicionar `adminsApi.listPlanos()`, `createPlano()`, `updatePlano()`, `deletePlano()`, `seedPlanos()`.

---

### Resumo de Arquivos Afetados

| Arquivo | Acao |
|---|---|
| `models/Plano.js` | CRIAR -- novo model |
| `models/Lojista.js` | EDITAR -- novos campos |
| `api/settings.js` | EDITAR -- escopos planos |
| `api/loja-extras.js` | EDITAR -- escopos stripe |
| `api/lojista.js` | EDITAR -- aceitar cpf_cnpj |
| `api/admins.js` | EDITAR -- bloquear-acesso, remover ativar-loja-manual |
| `api/auth-action.ts` | EDITAR -- verificar acesso_bloqueado no login |
| `api/lojas.js` | EDITAR -- checkTolerancia no scope=public |
| `lib/email.js` | EDITAR -- novos templates |
| `src/services/saas-api.ts` | EDITAR -- novos tipos e APIs |
| `src/services/api.ts` | EDITAR -- novos endpoints admin |
| `src/pages/painel/LojaAssinatura.tsx` | REESCREVER -- tela de planos |
| `src/pages/painel/LojaPerfil.tsx` | EDITAR -- campo CPF/CNPJ |
| `src/pages/painel/PainelInicio.tsx` | EDITAR -- checklist |
| `src/pages/LojistaRegistro.tsx` | EDITAR -- campo telefone |
| `src/pages/AdminPlanos.tsx` | CRIAR -- CRUD planos admin |
| `src/pages/AdminLojistas.tsx` | EDITAR -- remover/adicionar acoes |
| `src/components/AdminLayout.tsx` | EDITAR -- nav item Planos |
| `src/components/layout/PainelLayout.tsx` | EDITAR -- banner inadimplencia + label Planos |
| `src/components/LojaLayout.tsx` | EDITAR -- tela de bloqueio white-label |
| `src/App.tsx` | EDITAR -- rota AdminPlanos + bloqueio loja publica |
| `vercel.json` | SEM ALTERACAO (escopos em rotas existentes) |

Total: ~21 arquivos (2 novos + 19 editados). Nenhum novo arquivo em `api/`.

---

### Ordem de Execucao

Devido ao volume, a implementacao sera feita em 3 blocos sequenciais:

**Bloco A (Backend):** `models/Plano.js`, `models/Lojista.js`, `api/settings.js`, `api/loja-extras.js`, `api/lojista.js`, `api/admins.js`, `api/auth-action.ts`, `api/lojas.js`, `lib/email.js`

**Bloco B (Service + UI Lojista):** `src/services/saas-api.ts`, `src/services/api.ts`, `src/pages/painel/LojaAssinatura.tsx`, `src/pages/painel/LojaPerfil.tsx`, `src/pages/painel/PainelInicio.tsx`, `src/pages/LojistaRegistro.tsx`, `src/components/layout/PainelLayout.tsx`

**Bloco C (Admin + White-label):** `src/pages/AdminPlanos.tsx`, `src/pages/AdminLojistas.tsx`, `src/components/AdminLayout.tsx`, `src/components/LojaLayout.tsx`, `src/App.tsx`

