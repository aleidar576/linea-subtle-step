

## Melhoria UX: Card "Integração Stripe (Webhooks)" no Admin

### O que sera feito

Adicionar uma nova secao no arquivo `src/pages/AdminIntegracoes.tsx` com um card "Integracao Stripe (Webhooks)" contendo:

1. URL do webhook montada dinamicamente via `window.location.origin + '/api/loja-extras?scope=stripe-webhook'`
2. Input read-only exibindo a URL
3. Botao "Copiar URL" com icone `Copy` (lucide-react) + toast de sucesso
4. Texto de instrucao listando os eventos que devem ser assinados na Stripe

### Arquivo afetado

| Arquivo | Acao |
|---|---|
| `src/pages/AdminIntegracoes.tsx` | EDITAR -- adicionar card Stripe Webhook |

### Detalhes tecnicos

**Import**: Adicionar `Copy` e `Webhook` ao import do lucide-react (linha 7).

**Nova secao**: Inserir um terceiro card apos o card Bunny.net (antes do `</div>` de fechamento do `space-y-6`, linha 168), seguindo o mesmo padrao visual dos cards existentes (`bg-card border border-border rounded-xl p-6 space-y-4`).

Estrutura do card:
- Icone `Webhook` + titulo "Integracao Stripe (Webhooks)"
- Descricao curta
- Input read-only com `font-mono text-xs` + botao `Copy` ao lado
- Texto de alerta/instrucao com os 5 eventos listados em `code` tags

A URL sera computada com `useMemo` ou inline: `${window.location.origin}/api/loja-extras?scope=stripe-webhook`.

A funcao de copiar usara `navigator.clipboard.writeText` + toast `{ title: 'URL copiada!' }`.

Nenhum arquivo novo, nenhuma cor hardcoded, nenhuma alteracao em `vite.config.mts`.
