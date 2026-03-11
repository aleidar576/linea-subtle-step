## Diagnóstico da Cobrança Dupla

### O que aconteceu (cronologia reconstruída)

1. **09:54** — Stripe renovou automaticamente a mensalidade do plano (subscription_cycle) → webhook `invoice.payment_succeeded` → log "Mensalidade do plano renovada com sucesso", status mudou de `trialing` para `active`
2. **09:54** — Cron rodou, encontrou R$ 10,00 de taxas, criou invoice manual, finalizou e pagou com sucesso via `stripe.invoices.pay()` → zerou `taxas_acumuladas`
3. **11:11** — Stripe tentou cobrar a **mesma invoice manual** novamente por conta do `auto_advance: true` → como já estava paga/sem saldo, falhou → webhook `invoice.payment_failed` com `billing_reason: manual` → marcou `status_taxas: 'falha'` e `tentativas_taxas: 1`

### Causa raiz

O parâmetro **`auto_advance: true`** na criação da invoice diz ao Stripe: "tente cobrar automaticamente". Mas logo em seguida o código chama `finalizeInvoice()` + `pay()` manualmente. Resultado: **duas tentativas de cobrança na mesma invoice** — uma explícita (sucesso) e uma automática do Stripe (falha).

Isso acontece em **dois lugares** do código:
- `processarCronTaxas()` (linha ~370 de `stripe.js`)
- `pagarTaxasManual()` (linha ~440 de `stripe.js`)

### Correção

Mudar `auto_advance: true` para **`auto_advance: false`** nas duas funções, já que o código faz a cobrança explicitamente via `finalizeInvoice()` + `pay()`.

**Arquivo:** `lib/services/assinaturas/stripe.js`

1. Em `processarCronTaxas` — alterar `auto_advance: false` na criação da invoice
2. Em `pagarTaxasManual` — alterar `auto_advance: false` na criação da invoice

Duas linhas de mudança, sem impacto em nenhuma outra parte do sistema.

### Bug secundário (menor)

O webhook `invoice.payment_succeeded` registra "Mensalidade do plano renovada com sucesso" mesmo para invoices manuais de taxas. Deveria verificar o `billing_reason` e logar a mensagem correta. Posso corrigir isso também.

---

## Páginas de Categoria — Implementação Completa ✅

### Arquivos modificados

| Camada | Arquivo | Mudança |
|--------|---------|---------|
| Model | `models/Category.js` | +campo `banner` (Mixed) |
| Model | `models/Product.js` | +campo `vendas_count` (Number, indexed) |
| Model | `models/Loja.js` | +`categoria_config` em configuracoes |
| API | `api/products.ts` | +scope `categoria-publica` com filtros/sort |
| API | `api/categorias.js` | PUT aceita campo `banner` |
| Service | `lib/services/pedidos/confirmarPagamento.js` | +`$inc vendas_count` via bulkWrite |
| Frontend | `src/services/saas-api.ts` | +interfaces, +`getCategoriaBySlug` |
| Frontend | `src/hooks/useLojaPublica.tsx` | +`useLojaPublicaCategoria` |
| Frontend | `src/contexts/LojaContext.tsx` | +`categoriaConfig` no contexto |
| Frontend | `src/components/LojaLayout.tsx` | +`categoriaConfig` no provider |
| Frontend | `src/pages/loja/LojaCategoria.tsx` | **NOVO** — página completa |
| Frontend | `src/App.tsx` | +rota `/categoria/:categorySlug` |
| Admin | `src/pages/painel/LojaCategorias.tsx` | +editor de banner |
| Admin | `src/pages/painel/LojaTemas.tsx` | +aba "Categoria" |

## Construtor de Navegação Visual (Menu Builder) ✅

### Arquivos Modificados

| Camada | Arquivo | Mudança |
|--------|---------|---------|
| Model | `models/Loja.js` | +campo `menu_principal` (Mixed array) em configuracoes |
| Types | `src/services/saas-api.ts` | +interface `MenuItemConfig`, +campo em `Loja.configuracoes` |
| Context | `src/contexts/LojaContext.tsx` | +`menuPrincipal: MenuItemConfig[]` no LojaContextType |
| Admin | `src/components/admin/MenuBuilder.tsx` | **NOVO** — construtor visual com Dialog, nesting, reorder |
| Admin | `src/pages/painel/LojaTemas.tsx` | +aba "Navegação" (grid-cols-8), +estado `menuPrincipal`, +save |
| Frontend | `src/components/LojaLayout.tsx` | +NavigationMenu desktop (Linha 2), +Sheet mobile (hamburger), +fallback categorias |

### Estrutura do MenuItemConfig
```ts
{ id, type: 'category'|'page'|'custom', reference_id, label, url, children: MenuItemConfig[] }
```

### Funcionalidades
- Admin: Adicionar categorias (com subcats automáticas), páginas, links customizados
- Admin: Editar labels, mover cima/baixo, excluir, adicionar sub-itens (até 2 níveis)
- Loja Desktop: Barra de nav com NavigationMenu (triggers com dropdown para children)
- Loja Mobile: Hamburger → Sheet lateral com Collapsible para sub-itens
- Fallback: Se menu vazio, renderiza categorias ativas automaticamente

## Fase 1: Shoppertainment (Video Commerce) ✅

### Arquivos Modificados/Criados

| Camada | Arquivo | Mudança |
|---|---|---|
| Model | `models/Loja.js` | +`mux: { ativo }` em integracoes |
| Model | `models/Product.js` | +`videos[]` (playback_id, asset_id), +`video_layout` |
| API | `api/loja-extras.js` | +3 escopos: `mux-upload`, `mux-status`, `mux-delete` |
| Frontend | `src/services/saas-api.ts` | +`LojaIntegracaoMux`, +campos em `LojaProduct`, +`muxApi` |
| Frontend | `src/hooks/useLojaCategories.tsx` | Fix tipo banner no update |
| Admin | `src/pages/painel/LojaIntegracoes.tsx` | +Card Mux com Switch (sem token) |
| Admin | `src/pages/painel/LojaProdutos.tsx` | Refatoração Extras em 4 Accordions + UI de vídeos |
| Dep | `package.json` | +`@mux/mux-node` |

### Fluxo de Upload (com correções anti-falha)

1. Lojista clica "Selecionar Vídeo" → valida 50MB
2. Frontend chama `mux-upload` → recebe `upload_url` + `upload_id`
3. Frontend faz PUT direto na URL do Mux (Direct Upload)
4. Frontend inicia **polling** a cada 3s no escopo `mux-status` com `upload_id`
5. Quando `status === 'ready'`, adiciona `{ playback_id, asset_id }` ao **estado local** do formulário
6. Vídeo SÓ é persistido no MongoDB quando lojista clica "Salvar Produto"
7. Exclusão: AlertDialog obrigatório → `mux-delete` (deleta na nuvem + remove do array no BD)
