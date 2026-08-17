# Portal Module Pattern (Load-style)

This document describes the standard structure and approach for admin portal modules so the app stays consistent, reusable, and maintainable.

## Folder structure

```
app/admin/portal/{module}/
  page.tsx                 # List page (renders list + filters + table + dialogs)
  create/page.tsx          # Create form page (optional; some modules use dialog on list)
  edit/[id]/page.tsx       # Edit form page
  view/[id]/page.tsx       # View-only page
  components/              # Module-specific components
    {Module}Form.tsx       # Full-page form (create/edit)
    common/                # Optional: module hooks, types, utils (e.g. load)
      use{Module}Form.ts
      use{Module}Data.ts
      {module}Types.ts
      {module}Utils.ts
  _components/             # Feature-private components (e.g. load)
    components/
      {Module}sPage.tsx    # Main list UI
      {Module}Filters.tsx
      {Module}FormDialog.tsx
      {Module}Columns.tsx
```

## Shared layers

- **components/common** – Reusable form primitives and search: `FormTextField`, `FormSelectField`, `FormAddressField`, `FormDateTimePicker`, `FormFooter`, `FormDialog`, `SearchField`. Use these instead of raw MUI `TextField`/`MenuItem`.
- **components/ui** – `DataTable`, `FormDialog`, `PageHeader`, `ConfirmDialog`, `PickupDateTimePicker`. Import from `@/components/ui`.
- **lib/hooks** – `useDeleteConfirm` for single/bulk delete confirmation. Use with `ConfirmDialog` from `@/components/ui`.
- **model/services** – One service per entity (e.g. `load.ts`, `material.ts`). Call from hooks or pages; no duplicate API logic.

## List page pattern

1. **State**
   - List data: from a data hook (e.g. `useLoadData`) or local `useState` + `load()`.
   - Filters: single `FilterState` object + `setFilters(patch)` (or local state for simple search).
   - Selection: `selectedIds` / `setSelectedIds` (from `useDeleteConfirm` or local state).
   - Delete confirm: use `useDeleteConfirm`; get `confirmOpen`, `onClose`, `handleConfirm`, `confirmTitle`, `confirmDescription`, `selectedIds`, `setSelectedIds`, `openConfirmSingle`, `openConfirmBulk`.

2. **UI**
   - `PageHeader` (title, subtitle, primary action e.g. Add / navigate to create).
   - Optional filter bar (e.g. `LoadFilters`) or `SearchField`.
   - `DataTable` with `columns`, `rows`, `getRowId`, `loading`, `emptyMessage`, `selectable`, `selectedIds`, `onSelectionChange`, `actions` (View, Edit, Delete, etc.).
   - Optional form dialog (e.g. `LoadFormDialog`) for quick add/edit on list.
   - `ConfirmDialog` for delete (single and bulk) using `useDeleteConfirm` state.

3. **Actions**
   - View/Edit: navigate to `routes.{module}.view(id)` / `routes.{module}.edit(id)`.
   - Delete: call `openConfirmSingle(row)`; bulk: `openConfirmBulk()` (with `selectedIds` from hook).
   - Use `canAccess(role, "ModuleName", "create"|"edit"|"delete")` to guard buttons and actions.

## Form pattern (create/edit pages)

- Prefer a single **form state object** and **set(key, value)** (e.g. `FormState` + `set` from a `useXxxForm` hook or local reducer).
- Use **common components**: `FormTextField`, `FormSelectField`, `FormAddressField`, `FormDateTimePicker`, `FormFooter`.
- Submit: build payload from form state, call service (`createXxx` / `updateXxx`), then `onSuccess()` or `router.push(routes.{module}.list())`.
- Use `getCurrentUser()` for `user`/`requestingUser` payload when required by API.

## Delete flow (standard)

- Use **useDeleteConfirm** from `@/lib/hooks` with `onDeleteSingle`, `onDeleteBulk`, `getRowId`, `getLabel`.
- In delete callbacks, catch errors, set error state and toast; do not rethrow so `ConfirmDialog` can close.
- Use **ConfirmDialog** from `@/components/ui` with `open`, `onClose`, `onConfirm={handleConfirm}`, `title`, `description`, `confirmLabel="Delete"`, `confirmColor="error"`.

## Load module reference

- **List**: `load/list/page.tsx` dynamically imports `LoadsPage` from `load/_components/LoadsPage.tsx`.
- **Data**: `useLoadData` (list + filters + dropdowns), `useLoadMaps` (id → entity maps for columns/form).
- **Form**: `useLoadForm` (form state, dialog open/close, submit, cancel); `LoadFormDialog` uses common components.
- **Types**: `loadTypes.ts` (`FormState`, `FilterState`, `EMPTY_FORM`, `EMPTY_FILTERS`).
- **Utils**: `loadUtils.ts` (e.g. haversine, formatDateTime, pickupStr, dropStr).

## Naming conventions

- **Files**: PascalCase for components (`LoadFormDialog.tsx`), camelCase for hooks/utils (`useLoadForm.ts`, `loadUtils.ts`).
- **Components**: PascalCase. List page component: `{Module}sPage` or `{Module}Page`.
- **Hooks**: `use{Module}Data`, `use{Module}Form`, `use{Module}Maps` (when needed).
- **Types**: `FormState`, `FilterState`, `EMPTY_FORM`, `EMPTY_FILTERS` in `{module}Types.ts`.

## Performance

- Prefer **lazy loading** for heavy portal routes (e.g. `next/dynamic` for list pages or layout sections).
- Keep **filter state** in sync with API (e.g. `filterRef` + `syncFilters` in `useLoadData`) so search uses current filters.
- Avoid duplicate API calls: load list and dropdowns once in a data hook; pass data down.
- Use **useCallback** / **useMemo** for handlers and derived data (columns, filtered rows) to reduce re-renders.
