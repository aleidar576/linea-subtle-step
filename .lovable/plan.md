

# Code Splitting — Final Implementation Plan

## Phase 1: Create GlobalLoader

**New file: `src/components/ui/GlobalLoader.tsx`**

```tsx
import { Loader2 } from 'lucide-react';

const GlobalLoader = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
    <Loader2 className="h-10 w-10 animate-spin text-primary" />
    <p className="text-sm text-muted-foreground">Carregando...</p>
  </div>
);

export default GlobalLoader;
```

## Phase 2: Convert ~57 page imports to `lazy()` in `App.tsx`

**Keep static**: All layouts (`PainelLayout`, `AdminLayout`, `LojaLayoutComponent`), providers, context wrappers, `PageTransition`, UI infrastructure.

**Convert to lazy**: Every page component import. Example:

```tsx
import { lazy, Suspense } from 'react';
import GlobalLoader from './components/ui/GlobalLoader';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LojistaLogin = lazy(() => import('./pages/LojistaLogin'));
// ... all ~57 pages
```

## Phase 3: Suspense Boundaries (corrected architecture)

### 3a. Top-level Suspense in `App.tsx`

Wrap `<Routes>` in both `SaaSApp` and `LojaPublicaApp` with `<Suspense>`. This catches orphan routes (Login, Landing, NotFound) that have no parent layout.

```tsx
<Suspense fallback={<GlobalLoader />}>
  <Routes>
    ...
  </Routes>
</Suspense>
```

### 3b. Inner Suspense around `<Outlet />` in 3 layout files

This is the critical fix: wrapping the `<Outlet />` inside each layout ensures the sidebar/header stay mounted while only the page content area shows the loader.

**`src/components/AdminLayout.tsx`** (line ~128):
```tsx
<main className="flex-1 p-6 overflow-y-auto">
  <ContentTransition>
    <Suspense fallback={<GlobalLoader />}>
      <Outlet />
    </Suspense>
  </ContentTransition>
</main>
```

**`src/components/layout/PainelLayout.tsx`** (line ~394):
```tsx
<ContentTransition>
  <Suspense fallback={<GlobalLoader />}>
    <Outlet />
  </Suspense>
</ContentTransition>
```

**`src/components/LojaLayout.tsx`** (line ~1102):
```tsx
<main className="flex-1">
  <Suspense fallback={<GlobalLoader />}>
    <Outlet />
  </Suspense>
</main>
```

Each layout file gets two new imports: `Suspense` from `'react'` and `GlobalLoader`.

## Files changed

| File | Action |
|------|--------|
| `src/components/ui/GlobalLoader.tsx` | **Create** |
| `src/App.tsx` | **Edit** — 57 static → lazy imports, add top-level Suspense |
| `src/components/AdminLayout.tsx` | **Edit** — Suspense around Outlet |
| `src/components/layout/PainelLayout.tsx` | **Edit** — Suspense around Outlet |
| `src/components/LojaLayout.tsx` | **Edit** — Suspense around Outlet |

