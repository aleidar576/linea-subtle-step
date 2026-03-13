

# Plano: Sync Rastreio Appmax + Feedback UX Inteligente

## Arquivos modificados: 2

---

## 1. Backend — `api/pedidos.js`

### 1a. Import do Lojista (linha 22, após `Loja`)

```js
const Lojista = require('../models/Lojista.js');
```

### 1b. Bloco Appmax + flag de erro (linhas 235-237)

Substituir:
```js
      }

      return res.status(200).json(pedido);
```

Por:
```js
      }

      // === SYNC RASTREIO → APPMAX (liberação de saldo) ===
      let appmaxError = null;
      if (pedido.pagamento?.appmax_order_id) {
        try {
          const lojaDoc = await Loja.findById(pedido.loja_id).lean();
          const lojistaDoc = lojaDoc ? await Lojista.findById(lojaDoc.lojista_id).lean() : null;
          if (lojistaDoc?.gateway_ativo === 'appmax') {
            const appmaxConfig = lojistaDoc.gateways_config?.appmax;
            const token = appmaxConfig?.access_token;
            const apiUrl = appmaxConfig?.apiUrl || 'https://api.appmax.com.br';
            if (token) {
              const appmaxRes = await fetch(`${apiUrl}/v1/orders/shipping-tracking-code`, {
                method: 'POST',
                headers: {
                  'accept': 'application/json',
                  'content-type': 'application/json',
                  'access-token': token,
                },
                body: JSON.stringify({
                  order_id: Number(pedido.pagamento.appmax_order_id),
                  shipping_tracking_code: codigo,
                }),
              });
              console.log('[APPMAX-RASTREIO] Status:', appmaxRes.status, '| Order:', pedido.pagamento.appmax_order_id);
              if (!appmaxRes.ok) {
                appmaxError = 'Falha na comunicação com a Appmax';
              }
            }
          }
        } catch (appmaxErr) {
          console.error('[APPMAX-RASTREIO] Erro:', appmaxErr.message);
          appmaxError = 'Falha na comunicação com a Appmax';
        }
      }

      const pedidoObj = typeof pedido.toObject === 'function' ? pedido.toObject() : pedido;
      return res.status(200).json({ ...pedidoObj, appmax_error: appmaxError });
```

**Garantias**: O `return 200` sempre acontece. A flag `appmax_error` é `null` (sucesso) ou string (falha). Pedidos sem Appmax retornam `appmax_error: null`.

---

## 2. Frontend — `src/components/pedido/PedidoDetailModal.tsx`

### Linhas 90-101 — `handleSaveRastreio`

Substituir o `onSuccess` atual:
```tsx
onSuccess: () => toast.success('Rastreio salvo e cliente notificado!'),
```

Por:
```tsx
onSuccess: (data: any) => {
  if (data?.appmax_error) {
    toast.warning('Rastreio salvo e email enviado! ⚠️ Porém, houve falha ao avisar a Appmax.');
  } else {
    toast.success('Rastreio salvo e cliente notificado!');
  }
},
```

Usa `toast.warning` do Sonner (já importado via `import { toast } from 'sonner'` na linha 8), que renderiza com ícone amarelo nativamente — sem imports extras.

---

## Fluxo final da rota `action === 'rastreio'`

```text
1. Validar código
2. Salvar no banco
3. Enviar email (try/catch isolado)
4. Sync Appmax (try/catch isolado) → captura flag
5. return 200 com { ...pedido, appmax_error }
```

| Cenário | Toast no frontend |
|---|---|
| Sem Appmax / Appmax OK | ✅ Verde: "Rastreio salvo e cliente notificado!" |
| Appmax falhou | ⚠️ Amarelo: "Rastreio salvo e email enviado! ⚠️ Porém, houve falha ao avisar a Appmax." |
| Ambos os casos | Modal fecha, tela atualiza normalmente |

