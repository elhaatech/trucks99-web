# TRUCK99 User Portal (`itruck_user_portal`)

Standalone Next.js + TypeScript app for the **Buy & Sell marketplace** (formerly under `itruck_ui` at `/usear/product/*`).

Runs on **port 3002** by default; the API server (`server_trucks99`) runs on **port 3003**.

## Folder structure

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the enterprise layering guide.

```
itruck_user_portal/
├── app/                   # Next.js App Router (portal + admin)
├── features/marketplace/  # Feature barrel (preferred imports)
├── components/            # UI, chat, filters, ads
├── providers/             # Error boundary, date-picker scope
├── constants/             # Shared constants
├── types/                 # Shared TypeScript types
├── services/              # Service barrel → model/services
├── hooks/
├── lib/                   # theme, cache, errors, routes
├── model/services/        # HTTP API clients
└── public/images/
```

## Environment

Copy `.env.example` to `.env.local` and set the same values you use for `itruck_ui`:

- `NEXT_PUBLIC_API_URL` — backend base URL (e.g. `http://localhost:3003`)
- `NEXT_PUBLIC_GOOGLE_API_KEY` — Maps / Places
- Firebase / Ads keys — optional, same as main UI

## Scripts

```bash
cd itruck_user_portal
npm install
npm run dev    # http://localhost:3002
npm run build
```

## Routes

| Screen | Path |
|--------|------|
| Dashboard | `/dashboard` |
| Browse | `/list` |
| Vehicle detail | `/viewproduct/:id` |
| Favorites | `/cart` |
| My listings / sell | `/my-listings` |
| Offers | `/offers` |

Legacy `/usear/product/*` URLs redirect to the matching paths above.
