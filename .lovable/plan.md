

## Fix: Filter State Cascade Bug

### Root Cause

Three `useEffect` hooks create a destructive loop:

```text
Products load
  → price sync effect sets appliedPriceRange to [2789, 10000]
    → "reset on filter change" effect fires (appliedPriceRange changed)
      → clears allProducts and resets page
        → products reload → cycle restarts
```

Additionally, `hasActiveFilters` shows "Limpar" button even when no filter was manually applied (because synced prices trigger `appliedPriceRange[0] > 0`).

### Fix (1 file: `src/pages/loja/LojaCategoria.tsx`)

**Line 126-137** — Price sync effect: Remove the `setAppliedPriceRange` call. Only sync `draftPriceRange` (what the user sees in the filter UI). The `appliedPriceRange` stays at `[0, 100000]` meaning "send no price filter to API" until user explicitly applies one.

```tsx
useEffect(() => {
  if (!priceRangeInitialized) return;
  setDraftPriceRange(prev => {
    if (prev[0] === 0 && prev[1] === 100000) return [priceRange[0], priceRange[1]];
    return prev;
  });
  // Do NOT set appliedPriceRange here — that triggers product reset loop
}, [priceRangeInitialized, priceRange]);
```

**Line 171** — `hasActiveFilters`: The check `appliedPriceRange[0] > 0` is fine now since applied will only change when user explicitly filters.

No other files need changes.

