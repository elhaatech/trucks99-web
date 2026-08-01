"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getCurrentUser, logout as logoutApi, type User, invalidateCurrentUserCache } from "@/model/services/user";
import {
  hasMarketplaceBearerToken,
  MARKETPLACE_AUTH_CHANGED_EVENT,
  notifyMarketplaceAuthChanged,
  resolveMarketplaceUserIdFromUser,
} from "@/lib/marketplaceAuth";

type MarketplaceAuthContextValue = {
  user: User | null;
  userId: string | null;
  authReady: boolean;
  isLoggedIn: boolean;
  refresh: (opts?: { force?: boolean }) => Promise<void>;
  logout: () => Promise<void>;
};

const MarketplaceAuthContext = createContext<MarketplaceAuthContextValue | null>(
  null,
);

export function MarketplaceAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const refresh = useCallback(async (opts?: { force?: boolean }) => {
    if (!hasMarketplaceBearerToken()) {
      if (opts?.force) invalidateCurrentUserCache();
      setUser(null);
      setAuthReady(true);
      return;
    }
    try {
      if (opts?.force) invalidateCurrentUserCache();
      const profile = await getCurrentUser();
      setUser(profile);
      resolveMarketplaceUserIdFromUser(profile);
    } catch {
      setUser(null);
    } finally {
      setAuthReady(true);
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutApi();
    setUser(null);
    notifyMarketplaceAuthChanged();
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onAuthChanged = () => {
      setAuthReady(false);
      void refresh({ force: true });
    };
    window.addEventListener(MARKETPLACE_AUTH_CHANGED_EVENT, onAuthChanged);
    return () =>
      window.removeEventListener(MARKETPLACE_AUTH_CHANGED_EVENT, onAuthChanged);
  }, [refresh]);

  const value = useMemo((): MarketplaceAuthContextValue => {
    const userId = resolveMarketplaceUserIdFromUser(user);
    return {
      user,
      userId,
      authReady,
      isLoggedIn: Boolean(userId && hasMarketplaceBearerToken()),
      refresh,
      logout,
    };
  }, [user, authReady, refresh, logout]);

  return (
    <MarketplaceAuthContext.Provider value={value}>
      {children}
    </MarketplaceAuthContext.Provider>
  );
}

export function useMarketplaceAuth(): MarketplaceAuthContextValue {
  const ctx = useContext(MarketplaceAuthContext);
  if (!ctx) {
    throw new Error("useMarketplaceAuth must be used within MarketplaceAuthProvider");
  }
  return ctx;
}

/** Optional hook for login/register pages outside the portal shell. */
export function useMarketplaceAuthOptional(): MarketplaceAuthContextValue | null {
  return useContext(MarketplaceAuthContext);
}
