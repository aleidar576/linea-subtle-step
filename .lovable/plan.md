

## Plano: README.md Completo com Tutoriais Resend e Bunny.net

Arquivo unico a modificar: `README.md` (reescrita completa)

---

### Estrutura do Novo README

O README sera reescrito por completo com as seguintes secoes, nesta ordem:

1. **Titulo e Descricao** — Atualizado para mencionar Stripe, pixels multi-plataforma, UTMs
2. **Alerta Serverless Functions** — Mantido, tabela dos 12 arquivos atualizada com descricoes precisas
3. **Branding Dinamico** — Mantido como esta
4. **Arquitetura Host-Based Routing** — Mantido com diagrama ASCII
5. **Sistema de Assinaturas (Stripe)** — NOVO: fluxo completo, eventos webhook, cancelamento programado, campos no model, UX do badge laranja e ocultacao de "Proxima cobranca"
6. **Sistema de Pixels e Rastreamento** — NOVO: 4 plataformas, eventos suportados, filtros events/trigger_pages, fluxo client-side e server-side CAPI
7. **UTMs e Atribuicao de Marketing** — NOVO: hook useUtmParams, parametros capturados, onde sao salvos
8. **Configuracao de DNS na Vercel** — Mantido
9. **Como configurar o Resend (E-mails Transacionais)** — NOVO TUTORIAL COMPLETO
10. **Como configurar a Bunny.net (CDN e Imagens)** — NOVO TUTORIAL COMPLETO
11. **Variaveis de Ambiente** — Atualizada com STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, EMAIL_FROM_ADDRESS, BUNNY_STORAGE_ZONE, BUNNY_API_KEY, BUNNY_PULL_ZONE
12. **Aviso sobre Supabase** — Mantido
13. **Estrutura de Pastas** — Atualizada com LojaLayout.tsx e hooks novos
14. **Stack Tecnologica** — Atualizada com Stripe, Resend, Bunny.net, 2FA
15. **Desenvolvimento Local** — Mantido
16. **Historico de Fases** — Adicionadas fases 10, 11 e 12

---

### Detalhes das Secoes Novas

**Tutorial Resend**:
- Criar conta no resend.com
- Adicionar e verificar dominio oficial (registros DNS: SPF, DKIM, DMARC)
- Criar API Key e adicionar em `RESEND_API_KEY`
- Definir `EMAIL_FROM_ADDRESS` com endereco aprovado
- Testar via Admin > Integracoes > Sandbox
- Tabela de todos os templates de email enviados pelo sistema
- Aviso: nunca colocar chaves reais no codigo-fonte

**Tutorial Bunny.net**:
- Criar conta no bunny.net
- Criar Storage Zone (nome e regiao)
- Copiar Password/API Key da zona em FTP & API Access
- Criar Pull Zone vinculada a Storage Zone
- Adicionar `BUNNY_STORAGE_ZONE`, `BUNNY_API_KEY`, `BUNNY_PULL_ZONE` na Vercel
- Testar via Admin > Integracoes > Testar Conexao Bunny.net
- Tabela: onde o upload e usado (admin vs lojista)
- Diagrama do fluxo tecnico de upload

**Secao Stripe**:
- Diagrama ASCII do fluxo completo (trial > pagamento > cancelamento)
- Tabela dos 5 eventos webhook tratados
- Documentacao do cancelamento programado (badge, aviso, ocultacao, retomada, auto-refresh)
- Tabela dos campos no model Lojista

**Secao Pixels**:
- Tabela das 4 plataformas (client + server-side)
- Tabela dos 6 eventos e onde sao disparados
- Filtros por pixel (events, trigger_pages, conversion_label)
- Fluxo client-side (firePixelEvent) e server-side (CAPI via tracking-webhook)

**Secao UTMs**:
- Parametros capturados (tabela)
- Onde sao salvos (pedidos, carrinhos, PIX, cookies)
- Visualizacao no painel do lojista

---

### Tabela dos 12 Arquivos (Descricoes Atualizadas)

| # | Arquivo | Nova Descricao |
|---|---|---|
| 4 | `api/create-pix.js` | + "disparo CAPI Purchase ao confirmar pagamento" |
| 5 | `api/loja-extras.js` | "Stripe Checkout/Portal/Webhooks + Cupons + Fretes + Midias + Temas + Pixels + Paginas + Leads + Upload Bunny.net" |
| 9 | `api/pixels.ts` | "Facebook, TikTok, Google Ads, GTM" |
| 11 | `api/settings.js` | + "teste Resend + upload admin Bunny.net" |
| 12 | `api/tracking-webhook.js` | + "filtrado por loja_id" |

---

### Variaveis de Ambiente (Novas)

| Variavel | Categoria | Descricao |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe | Chave secreta (sk_live ou sk_test) |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Segredo do webhook (whsec_...) |
| `RESEND_API_KEY` | Resend | Chave de API para emails transacionais |
| `EMAIL_FROM_ADDRESS` | Resend | Endereco de remetente aprovado |
| `BUNNY_STORAGE_ZONE` | Bunny.net | Nome da Storage Zone |
| `BUNNY_API_KEY` | Bunny.net | Senha/API Key da Storage Zone |
| `BUNNY_PULL_ZONE` | Bunny.net | Hostname da Pull Zone CDN |

---

### Historico de Fases (Novas)

| Fase | Descricao |
|---|---|
| 10 | Sistema de Assinaturas Stripe (Checkout, Portal, Webhooks, Trial 7 dias) |
| 11 | Pixels multi-plataforma (FB, TikTok, GAds, GTM) + CAPI server-side + filtro por loja_id |
| 12 | UTMs completos, Cancelamento Programado Stripe, Refinamento UX assinatura, Tutoriais Resend e Bunny.net |

---

### Regras Respeitadas

- `vite.config.mts` NAO sera alterado
- Nenhum arquivo novo na pasta `api/`
- Zero dados sensiveis (chaves reais) no README
- Arquivo unico modificado: `README.md`

