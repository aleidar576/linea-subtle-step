

# Refatoracao Completa: Detalhe do Pedido - Dashboard Enterprise

## Visao Geral

Substituir o `Sheet` lateral por um `Dialog` modal central (`max-w-5xl`) com layout de duas colunas, cards editaveis para Cliente e Endereco com mascaras/validacao, e acoes fixas no rodape. O arquivo `LojaPedidos.tsx` (795 linhas) sera modularizado em subcomponentes.

---

## Estrutura de Arquivos

```text
src/components/pedido/PedidoDetailModal.tsx   (novo - orquestrador do modal)
src/components/pedido/PedidoClienteCard.tsx    (novo - card editavel com mascaras)
src/components/pedido/PedidoEnderecoCard.tsx   (novo - card editavel com ViaCEP)
src/components/pedido/PedidoItensCard.tsx      (novo - lista de itens + logistica ME)
src/components/pedido/PedidoResumoCard.tsx     (novo - resumo financeiro + PIX/TXID)
src/pages/painel/LojaPedidos.tsx              (refatorado - remove Sheet, usa modal)
src/hooks/usePedidos.tsx                      (novo hook useUpdatePedidoDados)
src/services/saas-api.ts                     (novo metodo pedidosApi.updateDados)
api/pedidos.js                               (novo action=dados no PATCH)
```

---

## 1. Backend: Novo Endpoint `action=dados`

Adicionar ao bloco PATCH existente em `api/pedidos.js`:

```text
PATCH /api/pedidos?scope=pedido&id=XXX&action=dados
Body: {
  cliente?: { nome, email, telefone, cpf },
  endereco?: { cep, rua, numero, complemento, bairro, cidade, estado },
  atualizar_cadastro?: boolean
}
```

Logica:
- Atualiza `pedido.cliente` e/ou `pedido.endereco` no documento Pedido
- Se `atualizar_cadastro === true` e `pedido.cliente_id` existe, atualiza tambem o documento Cliente (nome, telefone, cpf)
- Validacao server-side: CPF 11 digitos, CNPJ 14 digitos, telefone min 10 digitos, CEP 8 digitos

---

## 2. Frontend API + Hook

**saas-api.ts**: Adicionar `pedidosApi.updateDados(id, data)` fazendo PATCH com `action=dados`.

**usePedidos.tsx**: Adicionar `useUpdatePedidoDados()` mutation que invalida queries `['pedido', id]` e `['pedidos']`.

---

## 3. Layout do Modal (PedidoDetailModal)

- `Dialog` com `max-w-5xl` e `max-h-[90vh]`
- `ScrollArea` unica no corpo
- **Header fixo**: "Pedido #XXX" + Badge de status + Seletor de status + Data
- **Grid de duas colunas** (`grid-cols-1 lg:grid-cols-5 gap-6`):
  - Coluna principal (col-span-3): `PedidoItensCard` + Observacoes + UTMs
  - Coluna lateral (col-span-2): `PedidoClienteCard` + `PedidoEnderecoCard` + `PedidoResumoCard`
- **Footer fixo**: Rastreio input + botoes de acao (Gerar/Imprimir/Cancelar Etiqueta)

---

## 4. PedidoClienteCard (Card Editavel com Mascaras)

- **Modo visualizacao**: Nome, Email, Telefone, CPF em texto com icone Pencil para editar
- **Modo edicao**: Inputs com mascaras dinamicas:
  - CPF: `000.000.000-00` (placeholder: `000.000.000-00`)
  - Telefone: `(00) 00000-0000` (placeholder: `(00) 00000-0000`)
- **Validacao de salvamento**:
  - Botao "Salvar" fica `disabled` ate que: CPF tenha 11 digitos, telefone min 10 digitos, nome nao vazio
  - Texto vermelho inline: "CPF invalido", "Telefone invalido", "Nome obrigatorio"
- **Checkbox**: "Atualizar dados no cadastro global do cliente?" (default: desmarcado)
- Ao salvar: chama `useUpdatePedidoDados` com `atualizar_cadastro` conforme checkbox

---

## 5. PedidoEnderecoCard (Card Editavel com ViaCEP)

- **Modo visualizacao**: Endereco formatado com icone Pencil
- **Modo edicao**: Campos com mascaras:
  - CEP: `00000-000` com auto-busca ViaCEP ao atingir 8 digitos
  - Estado: Select com 27 UFs
  - Campos: Rua, Numero, Complemento, Bairro, Cidade
- **Validacao**: CEP 8 digitos, Rua obrigatorio, Numero obrigatorio, Cidade obrigatorio, Estado obrigatorio
- **Checkbox**: "Atualizar endereco no cadastro do cliente?"
- Botao "Salvar" `disabled` ate validacao completa
- Feedback de erro vermelho inline por campo

---

## 6. PedidoItensCard

- Imagens `h-14 w-14 rounded-lg object-cover` (maiores e nitidas)
- Variacao e quantidade com tipografia clara
- Separador visual antes da secao Melhor Envio
- Card `bg-secondary/50 border border-border/50` para a secao de logistica ME
- Botoes de etiqueta com Tooltips explicativos

---

## 7. PedidoResumoCard

- Subtotal, Desconto, Frete, Cupom, Total em layout de lista
- Secao PIX/TXID com botoes de copiar (com Tooltip)
- Superficies `bg-secondary/50` para separacao visual

---

## 8. Refinamento Estetico

- Cards com `bg-secondary/50 border border-border/50`
- Superficies diferenciadas entre cards da coluna lateral
- Tooltips em todos os icones de acao (Copiar, Editar, Imprimir, Cancelar)
- Separadores leves entre secoes
- Footer do modal com botoes de acao em destaque

---

## 9. Sequencia de Implementacao

1. Criar endpoint `action=dados` em `api/pedidos.js`
2. Adicionar `pedidosApi.updateDados` e `useUpdatePedidoDados` hook
3. Criar `PedidoClienteCard` com mascaras e validacao
4. Criar `PedidoEnderecoCard` com mascaras, ViaCEP e validacao
5. Criar `PedidoItensCard` com logistica ME
6. Criar `PedidoResumoCard` com financeiro e PIX
7. Criar `PedidoDetailModal` integrando todos os subcomponentes
8. Refatorar `LojaPedidos.tsx` para usar o modal (manter Sheet do carrinho abandonado)

