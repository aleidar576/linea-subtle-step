

## Plano: Correcao de 3 Bugs Criticos (UTMs, Pedidos, Carrinhos)

Apos varredura completa de ponta a ponta, identifiquei as causas raiz dos 3 problemas reportados.

---

### BUG 1: UTMs nao chegam no carrinho abandonado

**Causa raiz**: No `LojaPublicaApp` (App.tsx linha 184), NAO existe nenhum componente que chame `useUtmParams()` ao carregar a pagina. Diferente do `SaaSApp`, que tem `<TrackingProvider>`, a loja publica nunca captura os parametros UTM da URL de entrada.

O fluxo quebrado:
1. Cliente chega em `loja.com.br/?utm_source=facebook&utm_campaign=promo`
2. Nenhum componente chama `useUtmParams()` — UTMs NAO sao salvos no sessionStorage
3. Cliente navega para `/produto/x`, depois `/checkout` — URL muda, UTMs somem
4. No checkout, `getSavedUtmParams()` e chamado, mas `window.location.search` esta vazio e sessionStorage esta vazio
5. Resultado: `utms: {}` no carrinho e no pedido

**Correcao**: Adicionar captura de UTMs no `LojaLayout.tsx`. Inserir um `useEffect` que chama `getSavedUtmParams()` na montagem do componente, garantindo que UTMs da URL de entrada sejam salvos no sessionStorage antes de qualquer navegacao.

**Arquivo**: `src/components/LojaLayout.tsx`
- Importar `getSavedUtmParams` de `@/hooks/useUtmParams`
- Adicionar useEffect no componente `LojaLayout` que chama `getSavedUtmParams()` no mount

---

### BUG 2: Pedidos com pagamento pendente NAO sao criados

**Causa raiz**: Dois problemas combinados:

**Problema A — Backend sem try-catch**: O handler `POST scope=pedido` em `api/pedidos.js` (linhas 43-91) NAO tem try-catch. Se `Cliente.create()` ou `Pedido.create()` lancar qualquer erro (ex: erro de validacao MongoDB, timeout, ObjectId invalido), o Vercel retorna 500 sem mensagem util.

**Problema B — Frontend engole erros silenciosamente**: Em `LojaCheckout.tsx` linha 461, o pedido e criado com `.catch(e => console.warn('[PEDIDO]', e))`. O erro e apenas logado no console — nenhum toast, nenhum feedback ao usuario, nenhuma retentativa.

**Problema C — Interceptor 401 perigoso**: A funcao `request()` em `saas-api.ts` linhas 27-30 intercepta QUALQUER resposta 401 e redireciona para `/login` com `window.location.href`. Se por qualquer motivo o backend retornar 401 no endpoint publico, o checkout quebra silenciosamente (a Promise nunca resolve, a pagina redireciona).

**Correcao**:

1. **Backend** (`api/pedidos.js`): Envolver o bloco `POST scope=pedido` em try-catch, retornando `res.status(500).json({ error: 'Erro ao criar pedido' })` em caso de falha.

2. **Frontend** (`src/pages/loja/LojaCheckout.tsx`): Trocar a chamada fire-and-forget por um `await` dentro do try existente. Se falhar, mostrar `toast.error('Erro ao registrar pedido')` mas NAO impedir o usuario de ver o PIX (o PIX ja foi gerado).

3. **Frontend** (`src/services/saas-api.ts`): Criar uma funcao `publicPostRequest()` para chamadas publicas POST que NAO tenha o interceptor 401 (sem redirect para `/login`). Usar esta funcao nos metodos `pedidosApi.create` e `carrinhosApi.save`.

---

### BUG 3: Se tem carrinho com PIX, deveria ter pedido pendente

**Causa raiz**: Consequencia direta do Bug 2. O PIX e gerado via `fetch('/api/create-pix')` (chamada direta, sem o wrapper `request()`). O carrinho e salvo via `carrinhosApi.save()`. Mas o pedido e criado via `pedidosApi.create()` que usa o wrapper `request()` com o interceptor 401.

A sequencia no codigo (LojaCheckout linhas 445-463):
```text
setPixData(data);              // PIX exibido ao usuario
pedidosApi.create({...})       // FALHA SILENCIOSA -> sem pedido
carrinhosApi.save({...})       // SUCESSO -> carrinho com pix_code salvo
```

**Correcao**: Ja coberta pelo Bug 2. Ao corrigir o `pedidosApi.create`, os pedidos serao criados normalmente com status "pendente".

---

### Resumo de Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/LojaLayout.tsx` | Adicionar captura de UTMs no mount (useEffect + getSavedUtmParams) |
| `api/pedidos.js` | Envolver POST scope=pedido em try-catch |
| `src/pages/loja/LojaCheckout.tsx` | Await na criacao do pedido + toast de erro + usar publicPostRequest |
| `src/services/saas-api.ts` | Criar `publicPostRequest()` sem interceptor 401 e usar em pedidosApi.create e carrinhosApi.save |

### Regras Respeitadas

- `vite.config.mts` NAO sera alterado
- Nenhum arquivo novo criado
- Limite de 12 Serverless Functions mantido
- Zero dados sensiveis expostos

