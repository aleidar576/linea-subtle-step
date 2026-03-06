

## Correção: Métrica de Vendas exibindo valor em centavos

### Problema
O valor total de vendas nas métricas do admin está sendo exibido sem dividir por 100. O banco armazena valores em **centavos** (ex: 15600000), mas o `formatCurrency` recebe esse valor diretamente, exibindo R$ 156.000,00 ao invés de R$ 1.560,00.

Os 4 pedidos somam: R$ 130 + R$ 650 + R$ 130 + R$ 650 = **R$ 1.560,00** (156000 centavos).

### Correção

**Arquivo:** `src/pages/AdminLojistas.tsx` (linha 422)

Alterar:
```tsx
<p className="text-lg font-bold">{formatCurrency(metrics.totalVendas)}</p>
```
Para:
```tsx
<p className="text-lg font-bold">{formatCurrency(metrics.totalVendas / 100)}</p>
```

Uma única linha de mudança.

