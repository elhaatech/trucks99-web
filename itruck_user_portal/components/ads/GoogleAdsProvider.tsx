"use client";

import { GoogleAdPopup } from "./GoogleAdPopup";

/** Mount once in the admin layout to handle the session Google Ad popup. */
export function GoogleAdsProvider() {
  return <GoogleAdPopup />;
}
