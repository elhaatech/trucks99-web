# Admin portal: folders ↔ URLs ↔ sidebar

## Layout

- `app/admin/layout.tsx` — wraps all `/admin/*` with `DashboardLayout` (sidebar + top bar + `{children}`).
- `app/admin/portal/*` — real feature pages (list/create/edit/view live under each feature folder).

There is **no** `app/admin/portal/layout.tsx`; the shell comes from `app/admin/layout.tsx`.

## Base path

- All portal URLs are built in `lib/routes.ts`.
- Default base: **`/admin/portal`**.
- Override with **`NEXT_PUBLIC_APP_BASE`** in the **Next app** env (e.g. `.env.local` in `itruck_ui/`), e.g. `NEXT_PUBLIC_APP_BASE=/admin/portal`.
- Do **not** put a full site URL there unless you strip it — `getAppBasePath()` normalizes a full URL to its **pathname** only.

## Pattern

| App Router path (under `app/admin/portal/`) | Typical list URL | `routes` helper |
|---------------------------------------------|------------------|-----------------|
| `{feature}/list/page.tsx` | `{BASE}/{feature}/list` | `routes.{feature}.list()` |
| `{feature}/create/page.tsx` | `{BASE}/{feature}/create` | `routes.{feature}.create()` |
| `{feature}/edit/[id]/page.tsx` | `{BASE}/{feature}/edit/:id` | `routes.{feature}.edit(id)` |
| `{feature}/view/[id]/page.tsx` | `{BASE}/{feature}/view/:id` | `routes.{feature}.view(id)` |
| `page.tsx` (portal root) | `{BASE}` | `routes.dashboard()` |

Examples:

- Loads list: `app/admin/portal/load/list/page.tsx` → `/admin/portal/load/list` → `routes.load.list()`
- Income & expense list: `app/admin/portal/income-expense/list/page.tsx` → `/admin/portal/income-expense/list` → `routes.incomeExpense.list()`

## Sidebar

- Item list: `lib/adminPortalNav.ts` → `getAdminPortalNavDefinitions()`.
- Component: `components/dashboard/AppSidebar.tsx` (uses Next `Link` + MUI `ListItemButton`).
- Active state: `lib/permissions.ts` → `pathToPermissionKey(usePathname())` compared to the same key for each nav `href` (so `/load/create` still highlights **Load**).

## Permissions

- `NAV_PERMISSION_MAP` in `lib/permissions.ts` maps **`{BASE}/{firstSegment}`** → API permission `title_name`.
- If a role has a populated `permissions` array, missing or mismatched titles can hide a sidebar item — align strings with the backend.
