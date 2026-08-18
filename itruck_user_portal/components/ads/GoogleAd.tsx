"use client";

import { useEffect, useRef } from "react";
import {
  DEFAULT_ADSENSE_SLOT,
  GOOGLE_ADS_CLIENT,
  GOOGLE_ADS_INLINE_UNIT,
  GOOGLE_ADS_POPUP_UNIT,
  getAdSenseSlot,
  type AdSensePlacement,
} from "./adsConfig";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

export const Google_TEST_BANNER_ID = GOOGLE_ADS_INLINE_UNIT;
export const Google_TEST_POPUP_BANNER_ID = GOOGLE_ADS_POPUP_UNIT;

export type GoogleAdVariant = "inline" | "popup";
export type GoogleAdFormat = "auto" | "rectangle" | "horizontal" | "vertical";

export interface GoogleAdProps {
  slot?: string;
  placement?: AdSensePlacement;
  format?: GoogleAdFormat;
  responsive?: boolean;
  className?: string;
  enabled?: boolean;
  adUnitId?: string;
  variant?: GoogleAdVariant;
}

const initializedIns = new WeakSet<HTMLElement>();

function parseAdUnit(adUnitId: string): { client: string; slot: string } {
  const [client, slot] = adUnitId.split("/");
  return {
    client: client || GOOGLE_ADS_CLIENT,
    slot: slot || DEFAULT_ADSENSE_SLOT,
  };
}

function resolveSlot(props: GoogleAdProps): string {
  if (props.slot?.trim()) return props.slot.trim();
  if (props.placement) return getAdSenseSlot(props.placement);
  if (props.adUnitId) return parseAdUnit(props.adUnitId).slot;
  return DEFAULT_ADSENSE_SLOT;
}

function waitForAdsbygoogle(timeoutMs = 8000): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (typeof window.adsbygoogle !== "undefined") {
      resolve(true);
      return;
    }

    const started = Date.now();
    const timer = window.setInterval(() => {
      if (typeof window.adsbygoogle !== "undefined") {
        window.clearInterval(timer);
        resolve(true);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        window.clearInterval(timer);
        resolve(false);
      }
    }, 50);
  });
}

export function GoogleAd({
  slot: slotProp,
  placement,
  format = "auto",
  responsive = true,
  className,
  adUnitId,
  enabled = true,
  variant = "inline",
}: GoogleAdProps) {
  const insRef = useRef<HTMLModElement | null>(null);
  const slot = resolveSlot({ slot: slotProp, placement, adUnitId });
  const client = adUnitId
    ? parseAdUnit(adUnitId).client || GOOGLE_ADS_CLIENT
    : GOOGLE_ADS_CLIENT;
  const isPopup = variant === "popup";

  useEffect(() => {
    if (!enabled || !slot) {
      console.warn("[AdSense] skip init: enabled or slot missing", { enabled, slot, placement });
      return;
    }

    const element = insRef.current;
    if (!element) {
      console.error("[AdSense] <ins class=\"adsbygoogle\"> element is missing after mount");
      return;
    }

    if (initializedIns.has(element) || element.getAttribute("data-adsbygoogle-status")) {
      console.info("[AdSense] skip duplicate initialization", {
        status: element.getAttribute("data-adsbygoogle-status"),
        slot,
      });
      return;
    }

    let cancelled = false;

    const run = async () => {
      const scriptTag = document.querySelector<HTMLScriptElement>(
        'script[src*="adsbygoogle.js"]',
      );
      console.info("[AdSense] script tag", scriptTag ? "found" : "MISSING", scriptTag?.src);

      const ready = await waitForAdsbygoogle();
      if (cancelled) return;

      if (!ready && typeof window.adsbygoogle === "undefined") {
        console.error(
          "[AdSense] window.adsbygoogle does not exist after waiting. Script may be blocked (CSP, extension, or network).",
        );
      } else {
        console.info("[AdSense] window.adsbygoogle exists", {
          type: typeof window.adsbygoogle,
        });
      }

      if (initializedIns.has(element) || element.getAttribute("data-adsbygoogle-status")) {
        console.info("[AdSense] skip duplicate initialization after wait", { slot });
        return;
      }

      const width = element.getBoundingClientRect().width;
      console.info("[AdSense] ins element ready", {
        slot,
        client,
        width,
        height: element.getBoundingClientRect().height,
      });

      if (width < 1) {
        console.error("[AdSense] ins width is 0; Google will not fill this unit");
      }

      try {
        initializedIns.add(element);
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
        console.info("[AdSense] push({}) executed", { slot, client });
      } catch (error) {
        initializedIns.delete(element);
        console.error("[AdSense] push({}) failed", error);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [enabled, slot, client, placement]);

  if (!enabled || !slot) return null;

  return (
    <ins
      ref={insRef}
      className={className ? `adsbygoogle ${className}` : "adsbygoogle"}
      style={{ display: "block", width: "100%", height: isPopup ? "250px" : "320px" }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format={isPopup ? "rectangle" : format}
      data-full-width-responsive={isPopup || !responsive ? undefined : "true"}
    />
  );
}

export { ADSENSE_SLOTS } from "./adsConfig";
export type { AdSensePlacement };
