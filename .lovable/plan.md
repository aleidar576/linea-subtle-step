

## Plano: Centralizar lógica de taxas em `api/pedidos.js`

### Problema atual
A lógica de acúmulo de taxas da plataforma está duplicada em 3 lugares:
1. `api/pedidos.js` (criação com status pago + PATCH status)
2. `lib/services/pagamentos/sealpay.js` (webhook)
3. `lib/services/pagamentos/appmax.js` (webhook)

Isso significa que a cada novo gateway, seria preciso copiar a lógica de taxas novamente.

### Solução

Criar um **scope público** em `api/pedidos.js` (ex: `scope=confirmar-pagamento`) que os webhooks chamam internamente. Esse scope:
1. Atualiza o pedido para `pago` (com `pago_em`)
2. Acumula as taxas da plataforma
3. Converte carrinho abandonado
4. **NÃO** mexe no CAPI/pixel (cada webhook continua disparando seu próprio CAPI Purchase como já faz)

### Mudanças por arquivo

**1. `api/pedidos.js`** — Novo scope interno `confirmar-pagamento`
- Aceita `POST` com `{ txid, appmax_order_id }` (um dos dois)
- Busca o pedido, muda status para `pago`, salva `pagamento.pago_em`
- Executa a lógica de acúmulo de taxas (modo_amigo, plano, trial, etc.)
- Converte carrinho abandonado associado
- Retorna `{ ok: true, pedido_id, status }` para o webhook saber que deu certo
- A lógica de taxas que já existe no PATCH action=status continua chamando essa mesma função interna (refatorar para função reutilizável `acumularTaxasPlataforma(pedido)`)

**2. `lib/services/pagamentos/sealpay.js`** — Remover lógica de taxas duplicada
- Remover o bloco de "ACUMULAR TAXAS DA PLATAFORMA" (linhas 48-80)
- Substituir o `findOneAndUpdate` direto por uma chamada HTTP interna a `api/pedidos?scope=confirmar-pagamento`
- **OU** (mais simples e sem overhead de HTTP): importar e chamar a função `confirmarPagamento` diretamente
- Manter intacto o dispatch CAPI Purchase (linhas 82-105)

**3. `lib/services/pagamentos/appmax.js`** — Remover lógica de taxas duplicada
- Remover o bloco de "ACUMULAR TAXAS DA PLATAFORMA" (linhas 518-548)
- Substituir o `findByIdAndUpdate` + taxas por chamada à função centralizada
- Manter intacto o dispatch CAPI Purchase (linhas 550-580)

### Abordagem técnica

A forma mais eficiente (sem overhead de HTTP interno) é extrair uma **função utilitária** em `api/pedidos.js`:

```text
// Função exportada para uso interno por webhooks
async function confirmarPagamentoPedido({ txid, appmax_order_id }) {
  1. Busca pedido por txid ou appmax_order_id
  2. Se já pago → retorna sem duplicar
  3. Atualiza status → 'pago', pagamento.pago_em → now
  4. Acumula taxas (modo_amigo, plano, trial)
  5. Converte carrinho abandonado
  return { ok, pedido }
}
```

Porém, como `api/pedidos.js` é uma serverless function (handler), exportar funções dele é problemático no Vercel. A solução limpa é:

**Criar `lib/services/pedidos/confirmarPagamento.js`** — Módulo utilitário
- Contém a lógica de confirmar pagamento + acumular taxas
- Importado por `api/pedidos.js`, `sealpay.js` e `appmax.js`
- Único ponto de manutenção

### O que NÃO será alterado
- Lógica de CAPI Purchase dispatch (pixels) — cada webhook mantém seu próprio dispatch
- Fluxo de checkout do frontend — nenhuma mudança
- Lógica interna de cartão de crédito do Appmax — intacta
- Nenhuma rota nova no `vercel.json`

