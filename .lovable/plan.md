

## Fix: Flash of Old Category Products

### Root Cause

In `useLojaPublica.tsx` line 61, the query uses `placeholderData: (prev) => prev`. This tells React Query: "while fetching new data, keep showing the previous result." So when navigating from Batons to Geladeiras:

1. Category resets → `allProducts` cleared
2. React Query immediately returns Batons data as placeholder
3. Product sync effect sees `data.products` → renders Batons products
4. New fetch completes → Geladeiras products replace them

### Fix (1 file)

**`src/hooks/useLojaPublica.tsx`** — Remove `placeholderData` from the category query. This way, when the slug changes, `data` becomes `undefined` until the new category loads, and the loading spinner shows instead of stale products.

```tsx
// Remove: placeholderData: (prev) => prev,
```

