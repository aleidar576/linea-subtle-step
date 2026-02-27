

# Motor de Gestao de Etiquetas - Melhor Envio (Plano Final)

## Resumo

Implementar o fluxo completo e idempotente de geracao, compra, impressao e cancelamento de etiquetas do Melhor Envio no painel do lojista. Inclui todas as correcoes de payload (telefone/email, volumes como 1 pacote unico, options, CPF sem pontuacao, endereco completo do remetente, codigo de rastreio).

---

## 1. `models/Pedido.js` -- Adicionar campos ao schema

Novos campos:
- `frete_id` (String, default: null)
- `frete_nome` (String, default: null)
- `melhor_envio_order_id` (String, default: null)
- `melhor_envio_status` (String, default: null)
- `etiqueta_url` (String, default: null)
- `codigo_rastreio` (String, default: null)

Tambem salvar `frete_id` e `frete_nome` na criacao do pedido (scope=pedido, ja existente).

---

## 2. `api/pedidos.js` -- 2 novos scopes autenticados

### A) `scope = 'gerar-etiqueta'` (POST)

Recebe: `{ pedidoId, overrideServiceId }`

Fluxo idempotente:
1. Valida ownership do pedido
2. Busca loja (token ME, sandbox flag, endereco completo, empresa)
3. Se ja tem `melhor_envio_order_id`: apenas POST `/shipment/print` e retorna URL
4. Se nao tem:
   - Busca produtos do DB para dimensoes reais (fallback 0.3kg, 11x2x16cm)
   - Monta payload `/cart`:

```text
from: {
  name, document (sem pontuacao), address, number, complement,
  district, city, state_abbr, postal_code, phone, email
}
to: {
  name, document (CPF sem pontuacao), address, number, complement,
  district, city, state_abbr, postal_code, phone, email
}
products: [{ name, quantity, unitary_value, weight, width, height, length }]
volumes: [{
  weight: soma(peso * qty),
  width: max(larguras),
  height: soma(alturas * qty),
  length: max(comprimentos)
}]
options: { non_commercial: true, receipt: false, own_hand: false }
```

   - POST `/cart`, `/checkout` (trata "saldo insuficiente"), `/generate` (extrai tracking), `/print`
   - Salva `melhor_envio_order_id`, `etiqueta_url`, `codigo_rastreio`

Header obrigatorio: `User-Agent: Dusking (suporte@dusking.com.br)`

### B) `scope = 'cancelar-etiqueta'` (POST)

- POST `/shipment/cancel` com reason_id "2"
- Limpa todos os campos de logistica no pedido

---

## 3. `src/services/saas-api.ts` -- Interface + 2 metodos

- Adicionar campos a interface `Pedido`: `frete_id`, `frete_nome`, `melhor_envio_order_id`, `melhor_envio_status`, `etiqueta_url`, `codigo_rastreio`
- Adicionar ao `pedidosApi`:
  - `gerarEtiqueta(pedidoId, overrideServiceId?)`
  - `cancelarEtiqueta(pedidoId)`

---

## 4. `src/hooks/usePedidos.tsx` -- 2 novos hooks

- `useGerarEtiqueta()` -- mutation com invalidacao de queries `['pedido']` e `['pedidos']`
- `useCancelarEtiqueta()` -- mutation idem

---

## 5. `src/pages/painel/LojaPedidos.tsx` -- Secao de logistica

Nova secao "Logistica / Melhor Envio" no Sheet de detalhes, entre Rastreio e Observacoes. So aparece se loja tem integracao ME ativa.

**Cena 1 (tem etiqueta):**
- Botao "Imprimir Etiqueta" (abre URL nova aba)
- Botao "Cancelar Etiqueta" (AlertDialog de confirmacao)
- Exibe `codigo_rastreio` com botao copiar

**Cena 2 (sem etiqueta):**
- Botao "Gerar Etiqueta via Melhor Envio"
- Se `frete_id` numerico: gera direto
- Se nao: Dialog com opcoes via `calcularFrete` (filtra so ME)

---

## 6. Salvar frete_id na criacao do pedido

No scope=pedido existente, salvar `body.frete_id` e `body.frete_nome`.

---

## Arquivos modificados

| Arquivo | Alteracao |
|---|---|
| `models/Pedido.js` | +6 campos |
| `api/pedidos.js` | +2 scopes + salvar frete_id |
| `src/services/saas-api.ts` | Interface + 2 metodos |
| `src/hooks/usePedidos.tsx` | +2 hooks |
| `src/pages/painel/LojaPedidos.tsx` | Secao logistica no Sheet |

