"use client";

import Script from "next/script";
import { GOOGLE_ADS_CLIENT } from "./adsConfig";

const ADSENSE_SCRIPT_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${GOOGLE_ADS_CLIENT}`;

/** Single global AdSense script. Mount only from the root layout. */
export function AdsenseScript() {
  return (
    <Script
      id="google-adsense"
      src={ADSENSE_SCRIPT_SRC}
      strategy="afterInteractive"
      crossOrigin="anonymous"
      onLoad={() => {
        console.info("[AdSense] script loaded successfully", {
          src: ADSENSE_SCRIPT_SRC,
          adsbygoogleType: typeof window.adsbygoogle,
        });
      }}
      onError={(event) => {
        console.error("[AdSense] script failed to load (network/CSP/extension)", {
          src: ADSENSE_SCRIPT_SRC,
          event,
        });
      }}
    />
  );
}
