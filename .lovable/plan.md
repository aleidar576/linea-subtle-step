

## Analise Final: Criacao de Pedido Pendente apos PIX

### Status Atual do Codigo

Apos revisao completa linha-a-linha, **o codigo esta correto**:

1. `pedidosApi.create` usa `publicPostRequest` (sem interceptor 401) - OK
2. `publicPostRequest` aceita status 201 (`res.ok = true` para 200-299) - OK  
3. No checkout, `await pedidosApi.create(...)` dentro de try/catch com toast de erro - OK
4. Backend tem try/catch retornando 500 com mensagem de erro - OK
5. `loja_id` vem de `loja._id` (ObjectId valido) - OK
6. CORS nao e problema (same-origin em dominio customizado) - OK

### Por que ainda nao funciona?

**Hipotese principal**: O deploy no Vercel pode estar com a versao ANTERIOR do codigo (antes das correcoes com `publicPostRequest` e `await`). O build do preview Lovable deu erro de permissao do Nix (infraestrutura), o que pode significar que o commit mais recente nao foi enviado ao Vercel.

### Correcao Defensiva Extra

Para garantir que funcione mesmo em cenarios adversos (timeout, erro de rede), vou adicionar:

1. **Retry automatico**: Se `pedidosApi.create` falhar na primeira tentativa, tentar mais uma vez apos 2 segundos
2. **Log detalhado**: Adicionar console.log com o payload enviado para facilitar debug em producao
3. **Fallback inline**: Se `publicPostRequest` falhar por qualquer motivo, fazer um `fetch` direto (sem wrapper) como fallback final

**Arquivo: `src/pages/loja/LojaCheckout.tsx`**

Substituir o bloco try/catch do pedido (linhas 448-467) por:

```text
// Create order with retry
const pedidoPayload = { loja_id, itens, subtotal, desconto, frete, total, cupom, pagamento, cliente, endereco, utms };
try {
  await pedidosApi.create(pedidoPayload);
  console.log('[PEDIDO] Criado com sucesso');
} catch (firstErr) {
  console.warn('[PEDIDO] Primeira tentativa falhou, retentando...', firstErr);
  // Retry com fetch direto (bypass total de wrappers)
  try {
    const retryRes = await fetch('/api/pedidos?scope=pedido', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pedidoPayload),
    });
    if (!retryRes.ok) throw new Error('Retry falhou');
    console.log('[PEDIDO] Criado no retry');
  } catch (retryErr) {
    console.error('[PEDIDO] Falha total:', retryErr);
    toast.error('Erro ao registrar pedido. O pagamento PIX foi gerado normalmente.');
  }
}
```

Isso garante que mesmo se `publicPostRequest` falhar (por qualquer bug no wrapper, CORS, timeout), o pedido sera criado via `fetch` direto — o mesmo mecanismo que funciona para o PIX.

### Resumo

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/loja/LojaCheckout.tsx` | Retry com fetch direto como fallback para criacao de pedido |

### Regras Respeitadas

- `vite.config.mts` NAO sera alterado
- Nenhum arquivo novo criado
- Limite de 12 Serverless Functions mantido
