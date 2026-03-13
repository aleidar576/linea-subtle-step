

## Plan: Refactor Shipping Option Cards for Mobile

### Problem
The shipping option cards in `LojaCheckout.tsx` (lines 1128-1160) use `gap-5 p-5` and a fixed `w-14 h-14` icon container that crushes the text content on screens below 400px.

### Changes (single file: `src/pages/loja/LojaCheckout.tsx`, lines 1132-1157)

1. **Container button**: Change `gap-5 p-5` → `gap-3 p-3 sm:p-4` for breathing room on small screens
2. **Icon container**: Reduce from `w-14 h-14` → `w-10 h-10 sm:w-14 sm:h-14` and add `shrink-0`  
3. **Text container**: Already has `flex-1 min-w-0` (good). Add `flex flex-col` explicitly. Add `truncate` to the name `<p>` and `leading-tight` to the delivery time text.
4. **Price span**: Add `text-right ml-auto` alongside existing `shrink-0`, reduce to `text-sm sm:text-base`

These are purely visual Tailwind class changes — no logic or state modifications.

