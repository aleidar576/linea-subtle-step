

## Correção de Performance: Filtros Server-Side + Aggregation Pipeline

### Problema 1: Filtro de subcategoria client-side
Atualmente `LojaCategoria.tsx` filtra subcategorias no frontend (linha 88-97), incompatível com paginação server-side.

### Problema 2: Ordenação por desconto em memória
`api/products.ts` linhas 86-93 carrega todos os produtos e ordena em RAM.

---

### Correções (3 arquivos)

#### 1. `api/products.ts` — scope `categoria-publica` (linhas 46-95)

**Subcategoria como filtro server-side:**
- Adicionar param `subcategory_ids` (comma-separated).
- Se presente, substituir `allCatIds` no filtro por apenas os IDs recebidos (interseccionados com subcategorias válidas).

**Paginação:**
```ts
const limit = Math.min(Number(req.query.limit) || 24, 48);
const page = Math.max(Number(req.query.page) || 1, 1);
const skip = (page - 1) * limit;
```

**Projeção (campos do card):**
```ts
const cardFields = 'product_id slug name image price original_price promotion rating rating_count variacoes sort_order vendas_count category_id category_ids is_active createdAt';
```

**Desconto via Aggregation Pipeline** (substituir o bloco `if sortParam === 'desconto'`):
```ts
if (sortParam === 'desconto') {
  const pipeline = [
    { $match: filter },
    { $addFields: {
      desconto_calc: {
        $cond: [
          { $and: [{ $gt: ['$original_price', 0] }, { $gt: ['$original_price', '$price'] }] },
          { $subtract: ['$original_price', '$price'] },
          0
        ]
      }
    }},
    { $sort: { desconto_calc: -1 as const } },
    { $skip: skip },
    { $limit: limit },
    { $project: { /* cardFields como objeto */ } },
  ];
  const [products, countResult] = await Promise.all([
    Product.aggregate(pipeline),
    Product.countDocuments(filter),
  ]);
  return res.json({ category, products, subcategories, total: countResult, page, totalPages: Math.ceil(countResult / limit) });
}
```

**Demais sorts** usam `.find(filter).select(cardFields).sort(sortObj).skip(skip).limit(limit).lean()` + `countDocuments` em paralelo.

**Response shape:** `{ category, products, subcategories, total, page, totalPages }`

#### 2. `src/services/saas-api.ts`

- `CategoriaPublicaResponse`: adicionar `total`, `page`, `totalPages`.
- `getCategoriaBySlug`: adicionar params `page`, `subcategory_ids` ao método.

#### 3. `src/hooks/useLojaPublica.tsx`

- `useLojaPublicaCategoria`: adicionar `page` e `subcategory_ids` aos params e queryKey.

#### 4. `src/pages/loja/LojaCategoria.tsx`

- Adicionar estado `page` (default 1) e `allProducts` (acumulador).
- Mover `appliedSubcats` para ser enviado como param server-side (`subcategory_ids`).
- Remover o `filteredProducts` client-side (linhas 88-97). Usar `allProducts` direto no grid.
- Reset `page=1` e `allProducts=[]` quando qualquer filtro ou sort muda.
- Append novos produtos quando `page > 1`.
- Botão "Carregar Mais" visível quando `page < totalPages`.
- Counter: `{allProducts.length} de {total}`.

