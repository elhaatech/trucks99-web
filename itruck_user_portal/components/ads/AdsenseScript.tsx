import Script from "next/script";
import { GOOGLE_ADS_CLIENT } from "./adsConfig";

/** Global AdSense script — mount once from the root layout (server). */
export function AdsenseScript() {
  const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${GOOGLE_ADS_CLIENT}`;

  return (
    <Script
      id="google-adsense"
      async
      src={src}
      crossOrigin="anonymous"
      strategy="beforeInteractive"
    />
  );
}
