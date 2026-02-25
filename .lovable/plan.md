

## Plano: Correcao do Filtro de Fretes no Checkout

### Causa Raiz

Na pagina do produto (`LojaProduto.tsx` linha 213-214), o produto e adicionado ao carrinho com o campo `id: product.product_id`.

No checkout (`LojaCheckout.tsx` linha 133), o codigo tenta ler `item.product.product_id` ou `item.product._id` — mas nenhum desses campos existe no objeto do carrinho. O campo correto e `item.product.id`.

**Resultado**: `cartProductIds` fica vazio, `cartProducts` fica vazio, `hasVinculados` e sempre `false`, e o fallback mostra TODOS os fretes ativos da loja inteira.

A pagina do produto funciona corretamente porque usa os dados direto da API (`useLojaPublicaFretes` + `product.fretes_vinculados`), sem depender do carrinho.

### Correcao

**Arquivo unico: `src/pages/loja/LojaCheckout.tsx`**

Alterar a linha 133 para incluir `item.product.id` na lista de IDs buscados:

```
// ANTES (bugado):
const cartProductIds = items.map(item => (item.product as any)?.product_id || (item.product as any)?._id).filter(Boolean);

// DEPOIS (corrigido):
const cartProductIds = items.map(item => (item.product as any)?.product_id || (item.product as any)?._id || item.product?.id).filter(Boolean);
```

Isso garante que o `id` do carrinho (que contem o `product_id` do MongoDB) seja usado para cruzar com `allCheckoutProducts`, permitindo que `fretes_vinculados` seja encontrado e o filtro funcione corretamente.

### Resumo

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/loja/LojaCheckout.tsx` | Linha 133: adicionar `item.product?.id` como fallback no mapeamento de IDs |

### Regras Respeitadas

- `vite.config.mts` NAO sera alterado
- Nenhum arquivo novo criado
- Limite de 12 Serverless Functions mantido
