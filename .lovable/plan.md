

## Fix: Category Navigation Resets Price Filters

### Root Cause

1. User visits Category A → products load → `appliedPriceRange` syncs to `[2789, 10000]`
2. User navigates to Category B → `categorySlug` changes → line 78 resets `allProducts` and `page`
3. BUT `appliedPriceRange` stays at `[2789, 10000]` from Category A
4. API call for Category B includes `price_min=2789&price_max=10000` → filters out all products
5. Since no products load, `priceRangeInitialized` stays false, so the sync effect never fires to fix it

### Fix (1 file)

**`src/pages/loja/LojaCategoria.tsx`**

Add a dedicated `useEffect` that watches only `categorySlug` and resets ALL filter state to defaults:

```tsx
useEffect(() => {
  setAppliedPriceRange([0, 100000]);
  setDraftPriceRange([0, 100000]);
  setAppliedSubcats(new Set());
  setDraftSubcats(new Set());
  setAppliedVariations(new Set());
  setDraftVariations(new Set());
  setQuickFilters(new Set());
  setSort('relevancia');
}, [categorySlug]);
```

This replaces the need for `categorySlug` in the existing reset effect (line 78), since filters are now fully reset on category change. The existing effect continues to handle resets when individual filters change.

