

## Refatoracao UX de Erros do Cartao de Credito

### Problema Atual
A funcao `translateCardError` (linha 48) cobre poucos cenarios. Faltam mapeamentos criticos como "Unprocessable Entity" (HTTP 422), "not authorized", "risk", e "holder_document_number". Alem disso, a extracao do erro da API (linha 565) nao lida com respostas aninhadas como `data.errors.message` ou arrays de erros.

### Mudancas Planejadas (arquivo unico: `src/pages/loja/LojaCheckout.tsx`)

#### 1. Expandir a funcao `translateCardError` (linhas 48-66)

Adicionar os mapeamentos que faltam, na ordem correta de prioridade:

- `"unprocessable"` -> "Os dados informados sao invalidos. Verifique o numero do cartao, validade e CVV." (field: null)
- `"holder_document"` -> "O CPF do titular do cartao e invalido." (field: holderCpf) -- ANTES do match generico de "document"
- `"not authorized"` ou `"nao autorizada"` -> "Pagamento recusado pelo banco emissor. Verifique seu limite ou tente outro cartao." (field: null)
- `"risk"` ou `"risco"` -> "Pagamento recusado por seguranca. Tente outro cartao ou metodo de pagamento." (field: null)
- `"number"` sozinho (sem "card number") -> match para campo number
- Fallback atualizado: "Nao foi possivel processar o pagamento. Verifique os dados e tente novamente."

#### 2. Melhorar extracao de erro da API (linhas 563-571)

Criar uma funcao `extractApiError(data)` que busca a mensagem de erro em multiplos caminhos:
- `data.error` (string)
- `data.message` (string)
- `data.errors?.message` (string ou objeto)
- `data.details?.message`
- Se for objeto/array, converte para string

Usar essa funcao nos dois pontos de tratamento de erro de cartao (HTTP error na linha 565, e status recusado na linha 612).

#### 3. Melhorar estilo visual dos inputs com erro (linhas 1110-1161)

Trocar as classes de erro dos inputs de:
```
border-destructive text-destructive focus-visible:ring-destructive
```
Para:
```
border-red-500 bg-red-50 text-red-900 focus-visible:ring-red-500
```

Isso adiciona o fundo levemente avermelhado pedido, tornando o destaque mais visivel.

#### 4. Remover toast.error residual para erros de cartao

Garantir que no bloco `catch` generico (linha 660), erros de cartao nao disparem `toast.error`, ja que a caixa vermelha inline e suficiente. O toast generico permanece apenas para erros de PIX/Boleto.

### Detalhes Tecnicos

- Nenhuma dependencia nova
- Arquivo afetado: apenas `src/pages/loja/LojaCheckout.tsx`
- A Alert box inline (linhas 1179-1188) ja existe e sera mantida como esta
- Os estados `cardError` e `cardFieldError` ja existem e serao reutilizados
- Os `onChange` dos inputs ja limpam os estados de erro -- sem mudanca necessaria

