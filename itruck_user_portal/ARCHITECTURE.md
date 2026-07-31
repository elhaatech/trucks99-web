# Portal architecture

Enterprise-oriented layout for `itruck_user_portal`. **App Router routes stay under `app/`** (Next.js requirement). Domain code is organized so new work can grow without big-bang moves.

## Layers

```
itruck_user_portal/
├── app/                    # Routes only (pages, layouts, route handlers)
│   ├── (portal)/           # Marketplace URLs
│   ├── admin/              # Admin portal
│   └── ThemeRegistry.tsx   # MUI theme + error boundary + toast
├── features/               # Feature barrels (stable public imports)
│   └── marketplace/        # Re-exports services, auth, routes, constants
├── components/             # Shared UI (ui/, common/, chat/, marketplace/)
├── providers/              # AppErrorBoundary, DatePickerProvider
├── constants/              # Magic strings / domain defaults
├── types/                  # Shared TS types (api helpers, assistant, …)
├── services/               # Barrel over model/services (new code preferred)
├── model/services/         # HTTP clients (existing — keep for compatibility)
├── hooks/                  # Reusable React hooks
├── lib/                    # Pure helpers (theme, cache, errors, routes)
└── public/                 # Static assets
```

## Import guidance

| Need | Prefer |
|------|--------|
| Marketplace list / auth / routes | `@/features/marketplace` |
| Shared constants | `@/constants` |
| Error message helper | `@/lib/errors` |
| Low-level fetch | `@/model/services/common` (`api` / `publicApi`) |
| Design tokens | `@/lib/theme`, `@/lib/createAppTheme` |

Existing deep imports (`@/model/services/buysellapi`, etc.) remain valid for backward compatibility.

## Non-goals (this phase)

- Relocating the entire tree under `src/` (would churn every import without product value).
- Changing API request/response contracts.
- Redesigning marketplace visuals away from the TRUCKS99 theme.

## Performance notes

- List APIs support optional `page` / `limit` (see backend). Dashboard explore uses server pagination.
- AdSense is **not** global — admin ad components load the script on demand.
- MUI X `LocalizationProvider` is scoped via `DatePickerProvider` on date fields only.
