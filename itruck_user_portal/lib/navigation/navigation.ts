"use client";

const NAV_STACK_KEY = "itruck:navStack";
const SCROLL_KEY_PREFIX = "itruck:scroll:";
const LIST_STATE_KEY_PREFIX = "itruck:listState:";
const RETURN_URL_KEY = "itruck:returnUrl";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getCurrentPath(): string {
  if (!isBrowser()) return "";
  return window.location.pathname + window.location.search;
}

function getNavStack(): string[] {
  if (!isBrowser()) return [];
  try {
    const raw = sessionStorage.getItem(NAV_STACK_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveNavStack(stack: string[]): void {
  if (!isBrowser()) return;
  sessionStorage.setItem(NAV_STACK_KEY, JSON.stringify(stack));
}

export function pushNavStack(path: string): void {
  if (!path || !isBrowser()) return;
  const stack = getNavStack();
  const last = stack[stack.length - 1];
  if (last !== path) {
    stack.push(path);
    if (stack.length > 100) stack.shift();
    saveNavStack(stack);
  }
}

export function trimNavStackTo(path: string): void {
  if (!path || !isBrowser()) return;
  const stack = getNavStack();
  const index = stack.lastIndexOf(path);
  if (index >= 0) {
    saveNavStack(stack.slice(0, index + 1));
  }
}

export function hasInternalHistory(currentPath: string): boolean {
  const stack = getNavStack();
  if (stack.length > 1) {
    const prev = stack[stack.length - 2];
    return Boolean(prev && prev !== currentPath);
  }
  if (!isBrowser()) return false;
  return window.history.length > 1;
}

export function getPreviousInternalPath(currentPath: string): string | null {
  const stack = getNavStack();
  if (stack.length > 1) {
    const prev = stack[stack.length - 2];
    if (prev && prev !== currentPath) return prev;
  }
  return null;
}

export function saveScrollPosition(path?: string): void {
  if (!isBrowser()) return;
  const key = SCROLL_KEY_PREFIX + (path ?? getCurrentPath());
  sessionStorage.setItem(key, String(window.scrollY));
}

export function restoreScrollPosition(path: string): void {
  if (!isBrowser()) return;
  const key = SCROLL_KEY_PREFIX + path;
  const y = sessionStorage.getItem(key);
  if (y == null) return;
  sessionStorage.removeItem(key);
  const top = Number.parseInt(y, 10);
  if (Number.isNaN(top)) return;
  requestAnimationFrame(() => {
    window.scrollTo({ top, behavior: "auto" });
  });
}

export function saveListState<T>(path: string, state: T): void {
  if (!isBrowser() || !path) return;
  sessionStorage.setItem(LIST_STATE_KEY_PREFIX + path, JSON.stringify(state));
}

export function loadListState<T>(path: string): T | null {
  if (!isBrowser() || !path) return null;
  const raw = sessionStorage.getItem(LIST_STATE_KEY_PREFIX + path);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearListState(path: string): void {
  if (!isBrowser() || !path) return;
  sessionStorage.removeItem(LIST_STATE_KEY_PREFIX + path);
}

export function setReturnUrl(url: string): void {
  if (!isBrowser() || !url) return;
  sessionStorage.setItem(RETURN_URL_KEY, url);
}

export function peekReturnUrl(): string | null {
  if (!isBrowser()) return null;
  return sessionStorage.getItem(RETURN_URL_KEY);
}

export function consumeReturnUrl(): string | null {
  if (!isBrowser()) return null;
  const url = sessionStorage.getItem(RETURN_URL_KEY);
  if (url) sessionStorage.removeItem(RETURN_URL_KEY);
  return url;
}

export function clearNavigationState(): void {
  if (!isBrowser()) return;
  sessionStorage.removeItem(NAV_STACK_KEY);
  sessionStorage.removeItem(RETURN_URL_KEY);
  const keysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(SCROLL_KEY_PREFIX) || key?.startsWith(LIST_STATE_KEY_PREFIX)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((key) => sessionStorage.removeItem(key));
}
