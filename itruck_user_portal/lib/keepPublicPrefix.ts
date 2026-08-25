"use client";

import { useEffect } from "react";
import { PRODUCTION_HOSTS, PUBLIC_URL_PREFIX } from "@/lib/appConfig";

function isProductionHost(hostname: string): boolean {
  return PRODUCTION_HOSTS.has(hostname);
}

function passThrough(pathname: string, prefix: string): boolean {
  return (
    pathname === prefix ||
    pathname.startsWith(`${prefix}/`) ||
    pathname === "/api" ||
    pathname.startsWith("/api/") ||
    pathname === "/api-v1" ||
    pathname.startsWith("/api-v1/") ||
    pathname === "/uploads" ||
    pathname.startsWith("/uploads/") ||
    pathname.startsWith("/_next")
  );
}

function prefixPath(pathname: string, prefix: string): string {
  if (!pathname.startsWith("/") || passThrough(pathname, prefix)) return pathname;
  return pathname === "/" ? `${prefix}/` : `${prefix}${pathname}`;
}

function rewriteHref(url: string, prefix: string, origin: string): string {
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const parsed = new URL(url);
      if (!isProductionHost(parsed.hostname)) return url;
      const nextPath = prefixPath(parsed.pathname, prefix);
      if (nextPath === parsed.pathname) return url;
      parsed.pathname = nextPath;
      return parsed.toString();
    }
    if (url.startsWith("/")) {
      const parsed = new URL(url, origin);
      parsed.pathname = prefixPath(parsed.pathname, prefix);
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    /* ignore malformed URLs */
  }
  return url;
}

/**
 * Apache strips `/user` before Next.js. Keep the public URL and RSC fetches
 * under `/user` so the browser does not request `/_next` or `/login` at the
 * domain root (those 404).
 */
export function useKeepPublicPrefix(): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isProductionHost(window.location.hostname)) return;

    const prefix = PUBLIC_URL_PREFIX;
    const origin = window.location.origin;
    const historyObj = window.history;
    const origPush = historyObj.pushState.bind(historyObj);
    const origReplace = historyObj.replaceState.bind(historyObj);
    const origFetch = window.fetch.bind(window);

    historyObj.pushState = (data, unused, url) => {
      if (typeof url === "string") url = rewriteHref(url, prefix, origin);
      return origPush(data, unused, url);
    };
    historyObj.replaceState = (data, unused, url) => {
      if (typeof url === "string") url = rewriteHref(url, prefix, origin);
      return origReplace(data, unused, url);
    };

    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      if (typeof input === "string") {
        input = rewriteHref(input, prefix, origin);
      } else if (input instanceof URL) {
        const next = rewriteHref(input.toString(), prefix, origin);
        input = new URL(next, origin);
      } else if (input instanceof Request) {
        const next = rewriteHref(input.url, prefix, origin);
        if (next !== input.url) input = new Request(next, input);
      }
      return origFetch(input, init);
    };

    const { pathname, search, hash } = window.location;
    const nextPath = prefixPath(pathname, prefix);
    if (nextPath !== pathname) {
      origReplace(historyObj.state, "", `${nextPath}${search}${hash}`);
    }

    return () => {
      historyObj.pushState = origPush;
      historyObj.replaceState = origReplace;
      window.fetch = origFetch;
    };
  }, []);
}
