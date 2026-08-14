"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addFavorite,
  removeFavorite,
  listBuySellFavoriteProducts,
  invalidateBuySellFavoritesCache,
} from "@/model/services/favoriteapi";
import { getBuySellRowId, type BuySellProduct } from "@/model/services/buysellapi";
import { seedFavoriteIds } from "@/lib/buySellListUtils";
import { useMarketplaceAuthOptional } from "@/components/marketplace/MarketplaceAuthProvider";
import {
  consumePendingFavorite,
  peekPendingFavorite,
} from "@/lib/pendingFavorite";
import { ensureLoggedInToFavorite } from "@/lib/requireMarketplaceLogin";
import { isAuthFailure, toErrorMessage } from "@/lib/errors";

type NotifyFn = (payload: { type: "success" | "error"; message: string }) => void;

export type BuySellFavoritesState = {
  favoriteIds: Set<string>;
  togglingIds: Set<string>;
  authReady: boolean;
  isLoggedIn: boolean;
  syncFromProducts: (products: BuySellProduct[]) => void;
  refreshFavorites: () => Promise<Set<string>>;
  toggleFavorite: (productId: string, options?: { forceAdd?: boolean }) => Promise<void>;
};

export function useBuySellFavorites(notify?: NotifyFn): BuySellFavoritesState {
  const router = useRouter();
  const auth = useMarketplaceAuthOptional();
  const isLoggedIn = Boolean(auth?.isLoggedIn);
  const authReady = auth ? auth.authReady : true;

  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const favoriteIdsRef = useRef(favoriteIds);
  favoriteIdsRef.current = favoriteIds;
  const inFlightRef = useRef(new Set<string>());
  const notifyRef = useRef(notify);
  notifyRef.current = notify;
  const resumeLockRef = useRef(false);

  const applyFavoriteIds = useCallback((ids: Iterable<string>) => {
    setFavoriteIds(new Set([...ids].map(String)));
  }, []);

  const clearFavoriteState = useCallback(() => {
    applyFavoriteIds([]);
    setTogglingIds(new Set());
    inFlightRef.current.clear();
  }, [applyFavoriteIds]);

  const refreshFavorites = useCallback(async () => {
    if (!isLoggedIn) {
      clearFavoriteState();
      return new Set<string>();
    }
    try {
      const products = await listBuySellFavoriteProducts();
      const ids = new Set(products.map((p) => String(getBuySellRowId(p))));
      applyFavoriteIds(ids);
      return ids;
    } catch (err) {
      if (isAuthFailure(err)) {
        clearFavoriteState();
        return new Set<string>();
      }
      return favoriteIdsRef.current;
    }
  }, [isLoggedIn, applyFavoriteIds, clearFavoriteState]);

  useEffect(() => {
    if (!authReady) return;
    if (!isLoggedIn) {
      resumeLockRef.current = false;
      invalidateBuySellFavoritesCache();
      clearFavoriteState();
      return;
    }
    void refreshFavorites();
  }, [authReady, isLoggedIn, refreshFavorites, clearFavoriteState]);

  const redirectToLogin = useCallback(
    (productId: string) => {
      ensureLoggedInToFavorite(productId, {
        isLoggedIn: false,
        authReady: true,
        onNeedLogin: (loginPath) => router.push(loginPath),
      });
    },
    [router],
  );

  const toggleFavorite = useCallback(
    async (productId: string, options?: { forceAdd?: boolean }) => {
      const pid = String(productId || "").trim();
      if (!pid || !authReady) return;

      if (!isLoggedIn) {
        redirectToLogin(pid);
        return;
      }

      if (inFlightRef.current.has(pid)) return;

      const isFav = favoriteIdsRef.current.has(pid);
      const shouldRemove = isFav && !options?.forceAdd;
      if (options?.forceAdd && isFav) {
        return;
      }

      inFlightRef.current.add(pid);
      setTogglingIds((prev) => new Set(prev).add(pid));
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (shouldRemove) next.delete(pid);
        else next.add(pid);
        return next;
      });

      try {
        if (shouldRemove) {
          await removeFavorite("buySell", pid);
          notifyRef.current?.({ type: "success", message: "Removed from favourites." });
        } else {
          await addFavorite("buySell", pid);
          notifyRef.current?.({ type: "success", message: "Added to favourites." });
        }
        await refreshFavorites();
      } catch (err) {
        if (isAuthFailure(err)) {
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            next.delete(pid);
            return next;
          });
          redirectToLogin(pid);
          return;
        }

        const ids = await refreshFavorites();
        if (!shouldRemove && ids.has(pid)) {
          return;
        }

        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (shouldRemove) next.add(pid);
          else next.delete(pid);
          return next;
        });
        notifyRef.current?.({
          type: "error",
          message: toErrorMessage(err, "Failed to update favourite"),
        });
      } finally {
        inFlightRef.current.delete(pid);
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(pid);
          return next;
        });
      }
    },
    [authReady, isLoggedIn, redirectToLogin, refreshFavorites],
  );

  useEffect(() => {
    if (!authReady || !isLoggedIn || resumeLockRef.current) return;
    const pending = peekPendingFavorite();
    if (!pending?.productId) return;
    resumeLockRef.current = true;
    consumePendingFavorite();
    void toggleFavorite(pending.productId, { forceAdd: true });
  }, [authReady, isLoggedIn, toggleFavorite]);

  const syncFromProducts = useCallback(
    (products: BuySellProduct[]) => {
      if (!isLoggedIn) return;
      applyFavoriteIds(seedFavoriteIds(products));
    },
    [isLoggedIn, applyFavoriteIds],
  );

  return {
    favoriteIds,
    togglingIds,
    authReady,
    isLoggedIn,
    syncFromProducts,
    refreshFavorites,
    toggleFavorite,
  };
}
