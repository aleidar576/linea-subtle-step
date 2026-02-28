

## Correção: Erro 400 na criação de pagamento PIX (Appmax)

### Diagnóstico

Os logs mostram que as 3 etapas funcionam parcialmente:
- Token: OK
- Customer (etapa 1): 201 OK
- Order (etapa 2): 201 OK  
- **Payment PIX (etapa 3): 400 ERRO**

O erro `"No momento nao conseguimos processar sua solicitacao"` com um error ID da Appmax indica um problema de **payload inválido**, nao de autenticação. A causa raiz está em dois problemas no código atual:

### Problema 1: `document_number` vazio ou inválido

Linha 178: `const document_number = (customer.taxId || customer.cpf || '').replace(/\D/g, '');`

Se o usuário não preencher CPF válido, `document_number` será uma string vazia `""`. A documentação Appmax exige `document_number` válido para PIX.

### Problema 2: Order criada com produtos sem `unit_value`

Linha 245: `unit_value: item.price || 0`

Se `items` vier vazio do checkout (array vazio `[]`), a order é criada com `products: []` e valor total 0. A Appmax não consegue gerar PIX para um pedido sem valor.

Quando `items` tem produtos mas `price` é 0 ou undefined, `unit_value` fica 0, gerando a mesma inconsistência.

### Problema 3: Falta de logging do payload PIX

Não há log do payload exato enviado na etapa 3, dificultando diagnóstico.

---

### Correções (1 arquivo: `lib/services/pagamentos/appmax.js`)

#### 1. Validar `document_number` antes de PIX/Boleto
Adicionar validação após linha 178: se `document_number` estiver vazio e o método for `pix` ou `boleto`, retornar erro 400 claro.

#### 2. Fallback de produtos na Order
Se `items` estiver vazio ou todos com `unit_value: 0`, criar um produto genérico com o `amount` total para que a Appmax processe corretamente:
```javascript
if (!orderPayload.products.length || orderPayload.products.every(p => !p.unit_value)) {
  orderPayload.products = [{
    sku: 'PEDIDO-UNICO',
    name: 'Pedido',
    quantity: 1,
    unit_value: amount,
  }];
}
```

#### 3. Adicionar `products_value` na order
Conforme a documentação, quando `unit_value` dos produtos individuais não reflete o total correto (ex: com desconto/frete), deve-se enviar `products_value` explicitamente:
```javascript
orderPayload.products_value = amount;
```

#### 4. Log do payload PIX antes do envio
Adicionar `console.log('[APPMAX] PIX payload:', JSON.stringify(paymentPayload))` antes da chamada de pagamento para facilitar debug futuro.

#### 5. Validação mínima de `document_number`
CPF deve ter 11 dígitos e CNPJ 14. Adicionar validação de tamanho mínimo.

### Resumo das alterações
- Arquivo: `lib/services/pagamentos/appmax.js`
- Adicionar validação de `document_number` (não pode ser vazio para PIX/boleto)
- Adicionar fallback de produtos quando `items` vazio
- Adicionar `products_value` no payload da order
- Adicionar logs detalhados do payload de pagamento
