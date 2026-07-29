# TRUCK99 User Portal (`itruck_user_portal`)

Standalone Next.js + TypeScript app for the **Buy & Sell marketplace** (formerly under `itruck_ui` at `/usear/product/*`).

Runs on **port 3002** by default; the API server (`server_trucks99`) runs on **port 3003**.

## Folder structure

```
itruck_user_portal/
├── app/
│   ├── (portal)/          # Route group — URLs are /dashboard, /list, … (no prefix)
│   │   ├── layout.tsx     # Marketplace shell (header, nav, footer)
│   │   ├── dashboard/
│   │   ├── list/
│   │   ├── viewproduct/
│   │   └── …
│   ├── common/components/buysell/   # Shared marketplace UI
│   ├── admin/portal/buysell/        # Listing form + status chips (user flows)
│   ├── api/places/                  # Google Places proxy
│   ├── layout.tsx
│   └── page.tsx           # Redirects to /dashboard
├── components/            # UI, chat, filters, ads
├── hooks/
├── lib/                   # routes, theme, permissions, navigation
├── model/                 # API clients (axios)
└── public/images/         # Hero assets
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
