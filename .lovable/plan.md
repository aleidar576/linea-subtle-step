

## Plano: Páginas de Categoria — Fluxo Completo (Backend + Admin + Loja Pública)

### Visão Geral

Implementar rota dinâmica `/categoria/:slug` na loja pública com banner, filtros, ordenação e grid responsivo configurável. Requer alterações em 11 arquivos (3 models, 2 APIs, 3 frontend pages/components, 2 services, 1 router).

---

### 1. BACKEND — Models

**`models/Category.js`** — Adicionar campo `banner`:
```js
banner: {
  type: mongoose.Schema.Types.Mixed,
  default: null,
  // Estrutura: { imagem: '', imagem_mobile: '', link: '', titulo: '', titulo_cor: '', subtitulo: '', subtitulo_cor: '' }
}
```

**`models/Product.js`** — Adicionar campo `vendas_count`:
```js
vendas_count: { type: Number, default: 0 },
```

**`models/Loja.js`** — Adicionar `categoria_config` dentro de `configuracoes`:
```js
categoria_config: {
  type: mongoose.Schema.Types.Mixed,
  default: {
    layout_mobile: '2cols',      // '1col' | '2cols' | 'misto'
    layout_desktop: '4cols',     // '3cols' | '4cols' | '5cols'
    filtro_rapido: false,
  },
},
```

---

### 2. BACKEND — APIs

**`api/products.ts`** — Novo scope público `scope=categoria-publica`:
- Recebe `loja_id`, `category_slug`, `sort` (relevancia|vendidos|recentes|desconto|menor_preco|maior_preco), `variations` (filtro), `price_min`, `price_max`.
- Busca a Category por `slug` + `loja_id`, depois lista Products com `category_id` ou `category_ids` contendo o ID.
- Também retorna a category (com banner) no response: `{ category, products, subcategories }`.
- Aplica ordenação: `relevancia` → `sort_order`, `vendidos` → `-vendas_count`, `recentes` → `-createdAt`, `desconto` → computed, `menor_preco` → `price`, `maior_preco` → `-price`.

**`api/categorias.js`** — PUT handler: permitir salvar campo `banner` junto com `nome`/`slug`/`ordem`.

**`lib/services/pedidos/confirmarPagamento.js`** — Após marcar pedido como pago (linha 89), incrementar `vendas_count` dos produtos:
```js
// 3.5 Incrementar vendas_count
try {
  const Product = require('../../../models/Product.js');
  const bulkOps = pedido.itens.map(item => ({
    updateOne: {
      filter: { product_id: item.product_id },
      update: { $inc: { vendas_count: item.quantity } },
    },
  }));
  if (bulkOps.length > 0) await Product.bulkWrite(bulkOps);
} catch (err) {
  console.error(`${logPrefix} Erro ao incrementar vendas_count:`, err.message);
}
```

---

### 3. FRONTEND — Services & Hooks

**`src/services/saas-api.ts`**:
- Adicionar `banner` ao `LojaCategory` interface.
- Adicionar `vendas_count` ao `LojaProduct` interface.
- Adicionar `categoria_config` ao `Loja.configuracoes` interface.
- Adicionar `lojaPublicaApi.getCategoriaBySlug(lojaId, slug, sort?, filters?)` que chama `scope=categoria-publica`.

**`src/hooks/useLojaPublica.tsx`** — Adicionar:
```tsx
export function useLojaPublicaCategoria(lojaId, slug, sort, filters) {
  return useQuery({ queryKey: ['loja-publica-categoria', lojaId, slug, sort, filters], ... });
}
```

---

### 4. FRONTEND — Loja Pública

**Novo: `src/pages/loja/LojaCategoria.tsx`** (~300 linhas):

Estrutura visual (top to bottom):
1. **Banner da Categoria** — full-width, renderizado se `category.banner` existir. Imagem desktop/mobile responsiva.
2. **Breadcrumb** — `Home > {category.nome}` usando `<Breadcrumb>` do Shadcn.
3. **H1** — Nome da categoria.
4. **Filtro Rápido** — Barra horizontal com scroll de chips/badges das variações (cores, tamanhos) dos produtos da categoria. Renderizado se `categoria_config.filtro_rapido === true` (lido do `LojaContext`).
5. **Barra de Controles**:
   - Esquerda: Botão "Filtrar" → abre `<Sheet side="right">` com subcategorias (checkboxes), variações (checkboxes), `<Slider>` de faixa de preço, botões "Limpar" e "Aplicar".
   - Direita: `<Select>` "Ordenar por" com 6 opções (Relevância, Mais vendidos, Mais recentes, Maior desconto, Menor preço, Maior preço).
6. **Grid de Produtos** — CSS grid responsivo:
   - Mobile: classe dinâmica baseada em `categoria_config.layout_mobile` (`grid-cols-1`, `grid-cols-2`, ou lógica mista via mapeamento de index).
   - Desktop: `md:grid-cols-3`, `md:grid-cols-4`, ou `md:grid-cols-5`.
   - Reutiliza o card de produto já existente na loja pública (mesmo estilo de `LojaHome`).

**`src/App.tsx`** — Adicionar rota na LojaPublicaApp:
```tsx
<Route path="/categoria/:categorySlug" element={<LojaCategoria />} />
```

**`src/contexts/LojaContext.tsx`** — Adicionar `categoriaConfig` ao contexto (layout_mobile, layout_desktop, filtro_rapido). Alimentado pelo `LojaLayout`.

---

### 5. ADMIN — Painel do Lojista

**`src/pages/painel/LojaCategorias.tsx`** — No editor de categoria (`mode === 'editor'`):
- Adicionar seção "Banner da Categoria" com:
  - `ImageUploader` para imagem desktop.
  - `ImageUploader` para imagem mobile.
  - Inputs para link, título, cor do título, subtítulo, cor do subtítulo.
- Salvar via PUT em `api/categorias` com o campo `banner`.

**`src/pages/painel/LojaTemas.tsx`** — Adicionar nova aba "Categoria" no `<TabsList>`:
- `<TabsTrigger value="categoria">Categoria</TabsTrigger>`
- `<TabsContent value="categoria">` com:
  - Layout Mobile: `<Select>` com "1 Coluna", "2 Colunas" (default), "Misto".
  - Layout Desktop: `<Select>` com "3 Colunas", "4 Colunas" (default), "5 Colunas".
  - Filtro Rápido: `<Switch>` para ativar/desativar.
- Estado salvo via `handleSaveAll` incluindo `categoria_config`.

---

### 6. Arquivos Afetados (Resumo)

| Camada | Arquivo | Ação |
|--------|---------|------|
| Model | `models/Category.js` | +banner field |
| Model | `models/Product.js` | +vendas_count field |
| Model | `models/Loja.js` | +categoria_config |
| API | `api/products.ts` | +scope categoria-publica |
| API | `api/categorias.js` | PUT aceita banner |
| Service | `lib/services/pedidos/confirmarPagamento.js` | +$inc vendas_count |
| Frontend | `src/services/saas-api.ts` | +types, +API method |
| Frontend | `src/hooks/useLojaPublica.tsx` | +useLojaPublicaCategoria |
| Frontend | `src/pages/loja/LojaCategoria.tsx` | **NOVO** |
| Frontend | `src/App.tsx` | +rota /categoria/:categorySlug |
| Frontend | `src/contexts/LojaContext.tsx` | +categoriaConfig |
| Admin | `src/pages/painel/LojaCategorias.tsx` | +editor banner |
| Admin | `src/pages/painel/LojaTemas.tsx` | +aba Categoria |

