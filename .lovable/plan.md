

# Calculo de Frete Manual com Soma por Produto (Opcao B)

## Objetivo

Refatorar o endpoint `calcular-frete` em `api/loja-extras.js` para que os fretes manuais respeitem as configuracoes individuais de cada produto (`fretes_vinculados`), somando valores por item do carrinho em vez de devolver o preco fixo global.

---

## Arquivo alterado: `api/loja-extras.js`

### Logica atual (linhas 606-614)

Busca fretes globais ativos e devolve cada um com seu `valor` fixo, ignorando completamente os produtos do carrinho.

### Nova logica

1. **Buscar produtos reais do banco**: Apos carregar os fretes globais, buscar os documentos `Product` correspondentes aos `items` do payload usando `product_id` ou `_id`.

```text
const productIds = (items || []).map(i => i.id);
const productsDb = await Product.find({
  $or: [
    { product_id: { $in: productIds } },
    { _id: { $in: productIds.filter(id => /^[a-f0-9]{24}$/.test(id)) } }
  ],
  loja_id: bodyLojaId
}).lean();
```

2. **Para cada frete global ativo**, iterar sobre os itens do carrinho e calcular o preco somado:

```text
Para cada freteGlobal:
  let totalPrice = 0
  let isValid = true

  Para cada item do carrinho:
    Encontrar o Product correspondente em productsDb
    Buscar dentro de product.fretes_vinculados o objeto com frete_id === freteGlobal._id

    Se encontrou vinculo:
      Se vinculo.exibir_no_produto === false (ou campo equivalente de "ativo"):
        isValid = false  -> este frete nao serve para este carrinho, sair do loop
      Se valor_personalizado !== null e valor_personalizado !== undefined:
        totalPrice += valor_personalizado * item.quantity
      Senao:
        totalPrice += freteGlobal.valor * item.quantity
    Senao (produto sem vinculo para este frete):
      totalPrice += freteGlobal.valor * item.quantity

  Se isValid:
    Adicionar ao array de manuais com price = totalPrice
```

3. **Manter o Melhor Envio intacto**: Nenhuma alteracao na secao do Melhor Envio (linhas 616-672).

4. **Retorno**: O array `manuais` agora contera apenas os fretes validos com precos calculados por soma.

### Import necessario

Adicionar `const Product = require('../models/Product.js');` no topo do arquivo (se ainda nao importado).

---

## Resumo do comportamento

| Cenario | Resultado |
|---|---|
| Produto tem `fretes_vinculados` com `valor_personalizado` | Usa o valor personalizado * qty |
| Produto tem `fretes_vinculados` sem valor personalizado | Usa o valor global * qty |
| Produto tem `fretes_vinculados` com `exibir_no_produto: false` | Frete inteiro removido das opcoes |
| Produto sem nenhum vinculo para o frete | Usa o valor global * qty |
| Carrinho com multiplos produtos | Soma os valores de todos os itens |

