

## Plan: Fix Category Delete Event Bubbling in LojaCategorias.tsx

### Problem
The `AlertDialog` for deleting a category (lines 447-467) is nested inside a `div` with `onClick={() => openEditor(cat)}` (line 438). When the dialog's confirm/cancel buttons are clicked, the event bubbles up through React's synthetic event system to the parent, triggering `openEditor` and switching to editor mode — masking the successful deletion.

### Changes (single file: `src/pages/painel/LojaCategorias.tsx`)

**Step 1 — Restructure `renderCategory` (lines 435-468)**

Split the clickable row into two zones:
- Left zone (flex-1): category name + badge + edit button → triggers `openEditor`
- Right zone: AlertDialog with delete button → fully isolated from parent click

```text
┌─────────────────────────────────────────────────┐
│ [flex items-center]                             │
│  ┌──────────────────────────────┐ ┌───────────┐│
│  │ onClick={openEditor}  flex-1 │ │ Actions   ││
│  │ icon + name + badge + edit   │ │ AlertDlg  ││
│  └──────────────────────────────┘ └───────────┘│
└─────────────────────────────────────────────────┘
```

Remove the `onClick={() => openEditor(cat)}` from the outer `div`. Move category name/badge/edit into a nested clickable `div` with `flex-1`. Keep AlertDialog in a sibling `div` with `onClick={e => e.stopPropagation()}` as extra safety.

**Step 2 — Add `stopPropagation` on AlertDialogContent**

Add `onClick={(e) => e.stopPropagation()}` to `AlertDialogContent` to prevent any portal-based bubbling through React's synthetic event tree.

**Step 3 — Guard state in onSuccess**

In the `deleteMut.mutate` onSuccess callback, add a guard: store the deleted `cat._id` and ensure `openEditor` won't activate for that ID. The structural separation from Step 1 should prevent this, but the guard provides defense-in-depth.

### Build errors
The listed build errors are all `node_modules` resolution issues (missing `react`, `react-router-dom`, etc.) — a transient environment problem, not caused by code changes. They will resolve on rebuild.

