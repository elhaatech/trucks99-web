import {
  GOOGLE_ADS_CLIENT,
  GOOGLE_ADS_INLINE_UNIT,
  GOOGLE_ADS_POPUP_UNIT,
} from "./adsConfig";

declare global {
  interface Window {
    adsbygoogle?: { push: (item?: Record<string, unknown>) => number } | Record<string, unknown>[];
    __itruckAdsenseReady?: boolean;
  }
}

export {
  GOOGLE_ADS_CLIENT,
  GOOGLE_ADS_INLINE_UNIT,
  GOOGLE_ADS_POPUP_UNIT,
} from "./adsConfig";

export function adsenseScriptSrc(client: string = GOOGLE_ADS_CLIENT): string {
  return `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
}

const scriptPromises = new Map<string, Promise<void>>();
let unitInitQueue: Promise<void> = Promise.resolve();

function markAdsenseReady(): void {
  if (typeof window !== "undefined") {
    window.__itruckAdsenseReady = true;
  }
}

function findAdsenseScriptTag(
  client: string = GOOGLE_ADS_CLIENT,
): HTMLScriptElement | null {
  if (typeof document === "undefined") return null;
  return (
    document.querySelector<HTMLScriptElement>(`script[src="${adsenseScriptSrc(client)}"]`) ??
    document.querySelector<HTMLScriptElement>('script[src*="adsbygoogle.js"]')
  );
}

function isAdsenseReady(): boolean {
  return (
    typeof window !== "undefined" &&
    (window.__itruckAdsenseReady === true ||
      findAdsenseScriptTag()?.dataset.loaded === "true" ||
      window.adsbygoogle != null)
  );
}

function waitForAdsenseScriptTag(timeoutMs = 12000): Promise<HTMLScriptElement | null> {
  return new Promise((resolve) => {
    const started = Date.now();

    const tick = () => {
      const tag = findAdsenseScriptTag();
      if (tag) {
        resolve(tag);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(null);
        return;
      }
      window.setTimeout(tick, 50);
    };

    tick();
  });
}

function waitForScriptLoad(tag: HTMLScriptElement, timeoutMs = 12000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (tag.dataset.loaded === "true" || isAdsenseReady()) {
      resolve();
      return;
    }

    const onLoad = () => {
      tag.dataset.loaded = "true";
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("Failed to load Google AdSense script."));
    };

    const cleanup = () => {
      tag.removeEventListener("load", onLoad);
      tag.removeEventListener("error", onError);
      window.clearTimeout(timer);
    };

    tag.addEventListener("load", onLoad, { once: true });
    tag.addEventListener("error", onError, { once: true });

    const timer = window.setTimeout(() => {
      if (isAdsenseReady()) {
        tag.dataset.loaded = "true";
        cleanup();
        resolve();
        return;
      }
      cleanup();
      reject(new Error("Timed out waiting for Google AdSense script."));
    }, timeoutMs);
  });
}

function injectAdsenseScript(client: string = GOOGLE_ADS_CLIENT): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = findAdsenseScriptTag(client);
    if (existing) {
      waitForScriptLoad(existing)
        .then(() => {
          markAdsenseReady();
          resolve();
        })
        .catch(reject);
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = adsenseScriptSrc(client);
    script.crossOrigin = "anonymous";
    script.onload = () => {
      script.dataset.loaded = "true";
      markAdsenseReady();
      resolve();
    };
    script.onerror = () => {
      reject(new Error("Failed to load Google AdSense script."));
    };
    document.head.appendChild(script);
  });
}

/**
 * Wait for the single global AdSense script (loaded via next/script in ThemeRegistry).
 * Only injects a fallback script if none appears after a short wait.
 */
export function loadAdsenseScript(client: string = GOOGLE_ADS_CLIENT): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  const cached = scriptPromises.get(client);
  if (cached) return cached;

  const promise = (async () => {
    if (isAdsenseReady()) return;

    let tag = findAdsenseScriptTag(client);
    if (!tag) {
      tag = await waitForAdsenseScriptTag(12000);
    }

    if (tag) {
      await waitForScriptLoad(tag);
      markAdsenseReady();
      return;
    }

    await injectAdsenseScript(client);
  })();

  scriptPromises.set(client, promise);
  return promise;
}

function waitForElementReady(element: HTMLElement): Promise<void> {
  return new Promise((resolve) => {
    let attempts = 0;
    const maxAttempts = 120;

    const tick = () => {
      attempts += 1;
      const rect = element.getBoundingClientRect();
      const parentWidth = element.parentElement?.getBoundingClientRect().width ?? 0;
      const hasWidth = rect.width > 0 || parentWidth > 0;

      if ((hasWidth && element.isConnected) || attempts >= maxAttempts) {
        resolve();
        return;
      }
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  });
}

function isUnitFilled(element: HTMLElement): boolean {
  const status = element.getAttribute("data-adsbygoogle-status");
  return status === "done" || status === "filled";
}

async function initAdsenseUnitInternal(
  element: HTMLElement,
  client: string = GOOGLE_ADS_CLIENT,
): Promise<void> {
  if (!element || element.dataset.adsenseInitialized === "true" || isUnitFilled(element)) {
    return;
  }

  await loadAdsenseScript(client);
  await waitForElementReady(element);

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });

  if (!element.isConnected || element.dataset.adsenseInitialized === "true" || isUnitFilled(element)) {
    return;
  }

  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    element.dataset.adsenseInitialized = "true";
  } catch (error) {
    element.dataset.adsenseInitialized = "false";
    throw error;
  }
}

/** Initialize a single <ins class="adsbygoogle"> element once (serialized to avoid push races). */
export async function initAdsenseUnit(
  element: HTMLElement,
  client: string = GOOGLE_ADS_CLIENT,
): Promise<void> {
  const run = () => initAdsenseUnitInternal(element, client);
  const queued = unitInitQueue.then(run, run);
  unitInitQueue = queued.catch(() => undefined);
  return queued;
}

export function isAdsenseUnitFilled(element: HTMLElement | null): boolean {
  if (!element) return false;
  return isUnitFilled(element);
}
