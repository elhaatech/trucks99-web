"use client";

import Script from "next/script";
import { GOOGLE_ADS_CLIENT } from "./adsConfig";

declare global {
  interface Window {
    __itruckAdsenseReady?: boolean;
  }
}

export function AdsenseScript() {
  const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${GOOGLE_ADS_CLIENT}`;

  return (
    <Script
      id="google-adsense"
      async
      strategy="afterInteractive"
      src={src}
      crossOrigin="anonymous"
      onLoad={() => {
        window.__itruckAdsenseReady = true;
        const tag =
          document.querySelector<HTMLScriptElement>(`script[src="${src}"]`) ??
          document.querySelector<HTMLScriptElement>('script[src*="adsbygoogle.js"]');
        if (tag) tag.dataset.loaded = "true";
      }}
      onError={() => {
        window.__itruckAdsenseReady = false;
        const tag = document.querySelector<HTMLScriptElement>('script[src*="adsbygoogle.js"]');
        if (tag) tag.dataset.loaded = "false";
      }}
    />
  );
}
