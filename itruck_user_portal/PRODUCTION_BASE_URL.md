# User Portal — Production Base URL

How `itruck_user_portal` is wired for **https://trucks99.elhaa.com/user/**.

Values are **hardcoded in source** (`lib/appConfig.ts`, `next.config.ts`) plus `.env.production` (baked at `next build`). Do not rely on `.env.local` for production.

---

## Public URLs

| What | Production URL |
|------|----------------|
| User UI | `https://trucks99.elhaa.com/user/` |
| Dashboard | `https://trucks99.elhaa.com/user/dashboard` |
| Browse listings | `https://trucks99.elhaa.com/user/list` |
| Vehicle detail | `https://trucks99.elhaa.com/user/viewproduct/:id` |
| JS / CSS assets | `https://trucks99.elhaa.com/user/_next/...` |
| Backend API | `https://trucks99.elhaa.com/api/...` |
| Uploads | `https://trucks99.elhaa.com/uploads/...` |

Local (no prefix):

| What | Local URL |
|------|-----------|
| User UI | `http://localhost:3002/` |
| Dashboard | `http://localhost:3002/dashboard` |
| Backend | `http://127.0.0.1:3003` |

---

## How Apache + Next.js work together

```
Browser  →  https://trucks99.elhaa.com/user/dashboard
Apache   →  strips `/user`  →  forwards to Next.js on port 3002
Next.js  →  sees `/dashboard`
```

Apache already serves JS at `/user/_next/...` and strips `/user` before the request hits this process.

**Do not set Next.js `basePath` to `/user`.** After Apache strips `/user`, Next.js would look for `/user/dashboard` internally and 404 the homepage.

`next.config.ts` instead sets:

```ts
assetPrefix: isProd ? "/user" : undefined
```

That makes `/_next` assets load from `/user/_next` in production.

`next.config.ts` also:

- Rewrites `/api/:path*` and `/uploads/:path*` to `http://127.0.0.1:3003` (local/LAN).
- Redirects leftover `/user` and `/user/` to `/` (Apache already stripped the prefix).
- Leaves backend `/api` at the **site root** on purpose: `https://trucks99.elhaa.com/api/...`.

---

## Where the values live

### 1. `lib/appConfig.ts` (source of truth)

```ts
export const APP_BASE_PATH = process.env.NODE_ENV === "production" ? "/user" : "";
export const PUBLIC_URL_PREFIX = "/user";
export const PRODUCTION_API_ORIGIN = "https://trucks99.elhaa.com";
export const LOCAL_BACKEND_PORT = "3003";
```

- `APP_BASE_PATH` is empty in `next dev` so `localhost:3002` stays at `/`.
- `withAppBasePath("/images/logo.png")` becomes `/user/images/logo.png` in production (Apache only serves public files under `/user/...`).
- `next/link` and `router.push` stay **unprefixed** (`/dashboard`, `/list`) because Apache strips `/user` before Next.js.
- `next/image` srcs **must** be prefixed (`withAppBasePath`) because `basePath` is unset.

`stripAppBasePath()` is the reverse: turn a public `/user/list` URL back into `/list` for `usePathname()` / `router.push()`.

### 2. `next.config.ts`

```ts
const PRODUCTION_ASSET_PREFIX = "/user";

assetPrefix: isProd ? PRODUCTION_ASSET_PREFIX : undefined
```

`images.unoptimized: true` in production — Apache strips `/user`, so `/_next/image` at the domain root 404s. Serve images from `/user/images`.

### 3. `.env.production` (baked into `next build`)

```env
NEXT_PUBLIC_ASSET_PREFIX=/user
NEXT_PUBLIC_API_URL=https://trucks99.elhaa.com
```

`NEXT_PUBLIC_*` is inlined at **build time**. Changing `.env.production` without rebuilding has no effect.

AdSense keys in the same file are also compile-time.

---

## How the API base URL is resolved

`lib/apiBase.ts` → `resolveApiBase()`:

| Browser host | API origin used |
|--------------|-----------------|
| `localhost` / `127.0.0.1` / private LAN | `http://{hostname}:3003` |
| Production / SSR / anything else | `https://trucks99.elhaa.com` |

Axios (`model/services/axiosClient.ts`) re-resolves `baseURL` on **every request** so a production build never stays stuck on localhost.

Service paths already start with `/api/...`:

```
https://trucks99.elhaa.com + /api/user  →  https://trucks99.elhaa.com/api/user
```

Never send browser calls to `/user/api/...`. Backend routes are `/api/...` at the **domain root**.

A trailing `/api` on `NEXT_PUBLIC_API_URL` is stripped if present; origin-only is the intended value:

```env
NEXT_PUBLIC_API_URL=https://trucks99.elhaa.com
```

---

## Ports

| Process | Port |
|---------|------|
| User Next.js (`itruck_user_portal`) | **3002** |
| Backend (`server_trucks99`) | **3003** |
| Admin portal (`itruck_admin`) | **3004** |

Scripts:

```bash
cd itruck_user_portal
npm run dev          # next dev -p 3002
npm run build        # next build (reads .env.production)
npm run start:prod   # next start -p 3002
```

---

## Deploy checklist

1. Confirm these match production (edit `lib/appConfig.ts` + `next.config.ts` + `.env.production` together):
   - Origin: `https://trucks99.elhaa.com`
   - Public prefix: `/user`
2. `npm run build` **on the server** (or CI) so `NEXT_PUBLIC_*` is baked in.
3. `npm run start:prod` (port 3002).
4. Apache must:
   - Serve `/user/_next/*` from this app
   - Strip `/user` when proxying page requests to `127.0.0.1:3002`
   - Proxy `/api/*` and `/uploads/*` to `127.0.0.1:3003` (shared with admin)

---

## Do not

| Wrong | Why |
|-------|-----|
| `basePath: "/user"` in `next.config.ts` | Homepage 404 after Apache strips `/user` |
| `NEXT_PUBLIC_API_URL=http://localhost:3003` in production build | Browser on the live site would call localhost |
| API path `/user/api/...` | Backend is `/api/...` at site root |
| Change `.env.production` without rebuild | `NEXT_PUBLIC_*` is compile-time |
| Put secrets in `.env.production` | This file is public / baked into JS |
