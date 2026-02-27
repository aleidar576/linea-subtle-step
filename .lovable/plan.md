

# Remover logica de desconto automatico por valor

## Problema
O `CartContext.tsx` calcula descontos progressivos automaticos (20%-50%) baseados no valor total do carrinho. Isso precisa ser removido, mantendo intacta a logica de cupons de desconto e fretes.

## Alteracoes

### 1. `src/contexts/CartContext.tsx`
- Remover as linhas 91-94 (calculo de `totalInReais`, `discountPercent`, `discountAmount`, `finalPrice`).
- Substituir por valores fixos: `discountPercent = 0`, `discountAmount = 0`, `finalPrice = totalPrice`.
- Manter a interface `CartContextType` inalterada para nao quebrar consumidores (os campos continuam existindo, apenas sempre retornam 0/totalPrice).

### 2. `src/pages/CartPage.tsx`
- Remover o bloco condicional que exibe "Voce ganhou X% de desconto!" (linhas 173-177).
- Remover o bloco que sugere "adicione mais para ganhar desconto" (linhas 178-184 aprox.).
- Remover a exibicao da linha de desconto no resumo (linhas 166-171).
- Remover o preco riscado no total (linha 188-189).
- Simplificar o total para exibir apenas `totalPrice` diretamente.

### 3. `src/pages/CheckoutPage.tsx`
- Remover a linha condicional que exibe "Desconto (X%)" no resumo (linha 1086-1090).
- `cartFinalPrice` agora sera igual a `totalPrice`, entao o restante da logica (upsell, frete) continua funcionando sem mudancas.

### 4. `src/pages/loja/LojaCart.tsx`
- Remover o bloco que exibe "Desconto (X%)" (linhas 230-232).
- Remover o preco riscado no total (linha 237).
- Exibir `totalPrice` diretamente no total.

### 5. `src/pages/loja/LojaCheckout.tsx`
- Remover a linha condicional que exibe "Desconto (X%)" (linha 629).
- A logica de cupons (`cupomDiscountAmount`, `cuponsApplied`) permanece 100% intacta.
- `cartFinalPrice` (que agora = `totalPrice`) continua sendo a base para calculos de cupom e frete normalmente.

## O que NAO sera alterado
- Logica de cupons de desconto (cuponsApplied, cupomDiscountAmount)
- Logica de fretes (shippingCost, selectedFrete, calcular-frete)
- Desconto de produto individual (original_price em LojaProdutos.tsx)
