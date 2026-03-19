

# Fix: Checklist "Primeiros Passos" — Estado Unificado + Anti-Overfetching

## Arquivos modificados: 2

---

## Fase 1: Backend — `api/products.ts` (linha 169)

A rota `GET ?loja_id=xxx` atualmente faz `Product.find({ loja_id })` sem suporte a limit. Adicionaremos suporte a `?limit=` para permitir queries leves.

Substituir linha 169:
```ts
const products = await Product.find({ loja_id }).sort({ sort_order: 1 }).lean();
```

Por:
```ts
const { limit: limitParam } = req.query as Record<string, string | undefined>;
const limitNum = limitParam ? Math.min(Number(limitParam) || 0, 200) : 0;
const query = Product.find({ loja_id }).sort({ sort_order: 1 });
if (limitNum > 0) query.limit(limitNum);
const products = await query.lean();
```

Isso mantém compatibilidade total (sem `limit` = comportamento atual) e permite `?limit=1` para o checklist.

---

## Fase 2: Frontend — `src/pages/painel/PainelInicio.tsx`

### 2a. Estado unificado

Remover as 4 variáveis individuais (`hasProduto`, `hasGateway`, `hasVenda`, `hasDadosPessoais`) e substituir por:

```tsx
const [checkResults, setCheckResults] = useState({
  produto: false,
  gateway: false,
  dadosPessoais: false,
  venda: false,
});
const [checked, setChecked] = useState(false);
```

### 2b. Queries otimizadas no useEffect

```tsx
const checkAll = async () => {
  try {
    const [allProducts, profile, allPedidos] = await Promise.all([
      // Produtos: limit=1 por loja (só verifica existência)
      Promise.all(activeLojas.map(l =>
        lojaProductsApi.list(l._id, { limit: 1 }).catch(() => [])
      )),
      // Perfil: já é leve (1 doc)
      lojistaApi.perfil().catch(() => null),
      // Pedidos: per_page=1 (já otimizado)
      Promise.all(activeLojas.map(l =>
        pedidosApi.list(l._id, { status: 'pago', per_page: 1 }).catch(() => ({ total: 0 }))
      )),
    ]);

    // Um único setState → um único re-render
    setCheckResults({
      produto: allProducts.some(p => p.length > 0),
      gateway: !!profile?.gateway_ativo,
      dadosPessoais: !!(profile?.cpf_cnpj && profile?.telefone),
      venda: allPedidos.some(r => r.total > 0),
    });
  } catch { /* ignore */ }
  setChecked(true);
};
```

Todas as 3 chamadas rodam em **paralelo** via `Promise.all` externo, e o estado é atualizado **uma única vez**.

### 2c. `lojaProductsApi.list` — aceitar options

Em `src/services/saas-api.ts`, a assinatura de `list` precisa aceitar `{ limit }`:

```ts
list: (lojaId: string, opts?: { limit?: number }) => {
  const params = new URLSearchParams({ loja_id: lojaId });
  if (opts?.limit) params.set('limit', String(opts.limit));
  return request<LojaProduct[]>(`/products?${params.toString()}`);
},
```

### 2d. Referências no checklist

```tsx
const checklistItems = [
  { label: 'Crie a sua primeira loja', done: hasLojas },
  { label: 'Complete o seu cadastro', done: checkResults.dadosPessoais, link: '/painel/perfil' },
  { label: 'Configure um domínio', done: hasDomain },
  { label: 'Cadastre o seu primeiro produto', done: checkResults.produto },
  { label: 'Configure um gateway de pagamento', done: checkResults.gateway, ... },
  { label: 'Faça a sua primeira venda paga!', done: checkResults.venda },
];
```

---

## Impacto na performance

| Recurso | Antes | Depois |
|---|---|---|
| Produtos | `find()` sem limit (N docs completos) | `find().limit(1)` (1 doc) |
| Pedidos | `per_page: 1` (já OK) | Sem alteração |
| Perfil | 1 doc (já OK) | Sem alteração |
| Re-renders | 4 setState = 4 renders | 1 setState = 1 render |
| Paralelismo | Sequencial (products → profile → pedidos) | `Promise.all` (tudo em paralelo) |

