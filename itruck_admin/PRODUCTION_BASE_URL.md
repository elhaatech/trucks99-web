# Admin Portal — Production Base URL

How `itruck_admin` is wired for **https://trucks99.elhaa.com/admin/**.

Values are **hardcoded in source** (`lib/appConfig.ts`, `next.config.ts`) plus `.env.production` (baked at `next build`). Do not rely on `.env.local` for production.

---

## Public URLs

| What | Production URL |
|------|----------------|
| Admin UI | `https://trucks99.elhaa.com/admin/` |
| Login | `https://trucks99.elhaa.com/admin/` |
| Portal (dashboard) | `https://trucks99.elhaa.com/admin/portal` |
| Example list page | `https://trucks99.elhaa.com/admin/portal/buysell/list` |
| JS / CSS assets | `https://trucks99.elhaa.com/admin/_next/...` |
| Backend API | `https://trucks99.elhaa.com/api/...` |
| Uploads | `https://trucks99.elhaa.com/uploads/...` |

Local (no prefix):

| What | Local URL |
|------|-----------|
| Admin UI | `http://localhost:3004/` |
| Portal | `http://localhost:3004/admin/portal` |
| Backend | `http://127.0.0.1:3003` |

---

## How Apache + Next.js work together

```
Browser  →  https://trucks99.elhaa.com/admin/portal/...
Apache   →  strips `/admin`  →  forwards to Next.js on port 3004
Next.js  →  sees `/portal/...` (or `/admin/portal/...`)
```

Apache already serves JS at `/admin/_next/...` and strips `/admin` before the request hits this process.

**Do not set Next.js `basePath` to `/admin`.** App Router pages already live at `/admin/portal`. Setting `basePath: "/admin"` would produce `/admin/admin/portal` and 404.

`next.config.ts` instead sets:

```ts
assetPrefix: isProd ? "/admin" : undefined
```

That makes `/_next` assets load from `/admin/_next` in production.

Because Apache strips `/admin`, `next.config.ts` also rewrites:

| Incoming (after Apache) | Next.js destination |
|-------------------------|---------------------|
| `/portal` | `/admin/portal` |
| `/portal/:path*` | `/admin/portal/:path*` |
| `/api/:path*` | `http://127.0.0.1:3003/api/:path*` |
| `/uploads/:path*` | `http://127.0.0.1:3003/uploads/:path*` |

---

## Where the values live

### 1. `lib/appConfig.ts` (source of truth)

```ts
export const PUBLIC_URL_PREFIX = "/admin";
export const APP_BASE_PATH = process.env.NODE_ENV === "production" ? "/admin" : "";
export const PRODUCTION_API_ORIGIN = "https://trucks99.elhaa.com";
export const LOCAL_BACKEND_PORT = "3003";
```

- `APP_BASE_PATH` is empty in `next dev` so localhost stays at `/`.
- `withAppBasePath("/images/logo.png")` becomes `/admin/images/logo.png` in production (Apache only serves public files under `/admin/...`).
- `next/link` and `router.push` stay **unprefixed** for App Router paths (`/admin/portal/...`) because Apache strips `/admin`.

### 2. `next.config.ts`

```ts
const PRODUCTION_API_ORIGIN = "https://trucks99.elhaa.com";
const PRODUCTION_ASSET_PREFIX = "/admin";

assetPrefix: isProd ? PRODUCTION_ASSET_PREFIX : undefined
env: {
  NEXT_PUBLIC_API_URL: isProd
    ? PRODUCTION_API_ORIGIN
    : "http://127.0.0.1:3003",
}
```

`images.unoptimized: true` in production — Apache strips `/admin`, so `/_next/image` at the domain root 404s.

### 3. `.env.production` (baked into `next build`)

```env
NEXT_PUBLIC_ASSET_PREFIX=/admin
NEXT_PUBLIC_API_URL=https://trucks99.elhaa.com
NEXT_PUBLIC_APP_BASE=/admin/portal
```

`NEXT_PUBLIC_*` is inlined at **build time**. Changing `.env.production` without rebuilding has no effect.

### 4. Portal routes — `lib/routes.ts`

Sidebar and page links use:

```ts
NEXT_PUBLIC_APP_BASE || "/admin/portal"
```

Example: `routes.buysell.list()` → `/admin/portal/buysell/list`.

---

## How the API base URL is resolved

`lib/apiBase.ts` → `resolveApiBase()`:

| Browser host | API origin used |
|--------------|-----------------|
| `localhost` / `127.0.0.1` / private LAN | `http://{hostname}:3003` |
| `trucks99.elhaa.com` | `https://trucks99.elhaa.com` |
| SSR / unknown host | `https://trucks99.elhaa.com` |

Axios (`model/services/axiosClient.ts`) uses that origin as `baseURL`. Service paths already start with `/api/...`, so a call looks like:

```
https://trucks99.elhaa.com + /api/user  →  https://trucks99.elhaa.com/api/user
```

Never send API calls to `/admin/api/...`. Backend routes are `/api/...` at the **domain root**.

`forceBackendPort()` rewrites accidental UI ports (`3004`, `3000`, …) to **3003** on localhost/LAN so OTP and API never hit the Next.js process.

---

## Ports

| Process | Port |
|---------|------|
| Admin Next.js (`itruck_admin`) | **3004** |
| Backend (`server_trucks99`) | **3003** |
| User portal (`itruck_user_portal`) | **3002** |

Scripts:

```bash
cd itruck_admin
npm run dev          # next dev -p 3004
npm run build        # next build (reads .env.production)
npm run start:prod   # next start -p 3004
```

---

## Deploy checklist

1. Confirm these match production (edit `lib/appConfig.ts` + `next.config.ts` + `.env.production` together):
   - Origin: `https://trucks99.elhaa.com`
   - Public prefix: `/admin`
   - Portal path: `/admin/portal`
2. `npm run build` **on the server** (or CI) so `NEXT_PUBLIC_*` is baked in.
3. `npm run start:prod` (port 3004).
4. Apache must:
   - Serve `/admin/_next/*` from this app
   - Strip `/admin` when proxying page requests to `127.0.0.1:3004`
   - Proxy `/api/*` and `/uploads/*` to `127.0.0.1:3003`

---

## Do not

| Wrong | Why |
|-------|-----|
| `basePath: "/admin"` in `next.config.ts` | Doubles the path → `/admin/admin/portal` |
| `NEXT_PUBLIC_API_URL=http://localhost:3003` in production build | Browser on the live site would call localhost |
| API path `/admin/api/...` | Backend is `/api/...` at site root |
| Change `.env.production` without rebuild | `NEXT_PUBLIC_*` is compile-time |
| Put secrets in `.env.production` | This file is public / baked into JS |
