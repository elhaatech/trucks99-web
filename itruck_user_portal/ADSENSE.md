# Google AdSense — TRUCKS99 Marketplace

AdSense is implemented in `itruck_user_portal` (Next.js App Router).

## Publisher

| Item | Value |
|---|---|
| Publisher ID | `ca-pub-2600927533607135` |
| Ad unit | Truck99_Web_Responsive |
| Slot ID (`data-ad-slot`) | `6835182258` |

## Global script

This script is loaded **once** in the root layout (`app/layout.tsx`). Do not add it on every page.

```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2600927533607135"
     crossorigin="anonymous"></script>
```

The layout also sets:

```html
<meta name="google-adsense-account" content="ca-pub-2600927533607135" />
```

## Ad unit snippet

AdSense shows two snippets for the same unit. This app is Next.js, **not AMP**, so we use the HTML snippet. The AMP snippet (`amp-ad` + `cdn.ampproject.org`) will not run here.

HTML (used in this app):

```html
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2600927533607135"
     crossorigin="anonymous"></script>

<ins class="adsbygoogle"
     style="display:block;width:100%;height:320px"
     data-ad-client="ca-pub-2600927533607135"
     data-ad-slot="6835182258"
     data-ad-format="auto"
     data-full-width-responsive="true"></ins>
<script>
  (adsbygoogle = window.adsbygoogle || []).push({});
</script>
```

AMP (do not use in this Next.js app):

```html
<script async custom-element="amp-ad" src="https://cdn.ampproject.org/v0/amp-ad-0.1.js"></script>
<amp-ad width="100vw" height="320"
     type="adsense"
     data-ad-client="ca-pub-2600927533607135"
     data-ad-slot="6835182258"
     data-auto-format="rspv"
     data-full-width="">
  <div overflow=""></div>
</amp-ad>
```

Same client, slot, and 320px responsive size. The HTML version is what `GoogleAd` renders.

In the app this is the reusable component:

```tsx
<GoogleAdBanner placement="dashboard" format="auto" responsive />
```

or:

```tsx
<GoogleAd slot="6835182258" format="auto" responsive />
```

## Files

| File | Purpose |
|---|---|
| `app/layout.tsx` | Global AdSense script (once) |
| `components/ads/GoogleAd.tsx` | Reusable ad unit + `adsbygoogle.push({})` |
| `components/ads/GoogleAdBanner.tsx` | Labeled, spaced placement |
| `components/ads/adsConfig.ts` | Publisher ID and slot IDs |
| `components/GoogleAd.tsx` | Re-export |
| `public/ads.txt` | AdSense seller file |

## Where ads appear

| Page | Route | Placement key |
|---|---|---|
| Dashboard | `/dashboard` | `dashboard` |
| Buy / sell list + search | `/list` | `listing` |
| My listings | `/my-listings` | `myListing` |
| Vehicle details | `/viewproduct/[id]` | `details` |
| Featured vehicles | `/featured-vehicles` | `featured` |
| Seller profile | `/seller/[ownerId]` | `seller` |
| Purchases | `/purchases` | `purchases` |

Ads are **not** placed in login, register, create/edit forms, chat, profile, EMI, cart, or navigation.

## Environment

Local (`.env.local` in `itruck_user_portal`):

```env
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-2600927533607135
NEXT_PUBLIC_ADSENSE_SLOT=6835182258
```

Production must set the same `NEXT_PUBLIC_*` values **at build time**, then rebuild. `.env.local` is not deployed automatically.

Optional per-page overrides:

```env
NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD=
NEXT_PUBLIC_ADSENSE_SLOT_LISTING=
NEXT_PUBLIC_ADSENSE_SLOT_MY_LISTING=
NEXT_PUBLIC_ADSENSE_SLOT_DETAILS=
NEXT_PUBLIC_ADSENSE_SLOT_FEATURED=
NEXT_PUBLIC_ADSENSE_SLOT_SELLER=
NEXT_PUBLIC_ADSENSE_SLOT_PURCHASES=
```

If those are empty, every placement uses `6835182258`.

## ads.txt

`public/ads.txt` must be reachable on the live domain:

```
https://truck.elhaa.com/ads.txt
```

Content:

```
google.com, pub-2600927533607135, DIRECT, f08c47fec0942fa0
```

## Why ads may be empty

| Situation | What you see |
|---|---|
| `localhost` | Slot box only. Google does not serve live ads on localhost. |
| Live site, AdSense not Ready | Slot is in the HTML, but Google does not fill yet. |
| Ad blocker on | Ads hidden. |
| Old deploy | Script present, but `data-ad-slot` missing from HTML. Redeploy. |

## Live checklist

1. Deploy the latest `itruck_user_portal` build.
2. Confirm the script is in page source:

   `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2600927533607135`

3. Confirm the unit exists:

   `data-ad-slot="6835182258"`

4. Confirm `https://truck.elhaa.com/ads.txt` returns the line above.
5. In Google AdSense → Sites, add **`truck.elhaa.com`** and wait until status is **Ready** (often 24–48 hours).
6. Open the live site with ad blockers off.

## Policy notes

- Do not click your own ads.
- Do not put ads on buttons, forms, or navigation.
- Do not expose private user data to AdSense.
- Do not place ads next to each other with no content between them.
