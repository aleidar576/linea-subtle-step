

# Plano: Unificar `image` e `images` no handleJsonPaste

## Problema

Na linha 936, o `setEditingProduct` repassa `data` direto. Se o JSON traz `image: "url"` mas `images: []` (ou ausente), e não tem `variacoes`, o bloco das linhas 921-931 não executa a unificação. O componente visual renderiza apenas `editingProduct.images`, que fica vazio.

## Mudança única em `src/pages/painel/LojaProdutos.tsx`

Após a linha 933 (`delete data.codigo_interno`) e antes da linha 935, inserir a lógica de unificação:

```typescript
// Unify image + images: ensure main image is always in the gallery
const imagesFromJson = Array.isArray(data.images) ? data.images : [];
const mainImage = data.image || '';
const unifiedImages = Array.from(new Set([mainImage, ...imagesFromJson])).filter(Boolean);
data.image = mainImage || unifiedImages[0] || '';
data.images = unifiedImages;
```

Depois, na linha 936, atualizar o `setEditingProduct` para proteger contra override:

```typescript
setEditingProduct(prev => prev ? {
  ...prev,
  ...data,
  image: data.image || prev.image,
  images: unifiedImages.length > 0 ? unifiedImages : prev.images,
  loja_id: prev.loja_id,
  _id: prev._id,
} : prev);
```

## useEffect das variações (linha 374)

Já está seguro: ele apenas **adiciona** imagens de variações ao array, nunca remove. Nenhuma alteração necessária.

## Arquivo alterado

`src/pages/painel/LojaProdutos.tsx` — apenas o bloco `handleJsonPaste` (~5 linhas adicionadas, 1 linha modificada).

