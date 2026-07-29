"use client";

import { useCallback, useState } from "react";
import { addFavorite, removeFavorite, listBuySellFavoriteProducts } from "@/model/services/favoriteapi";
import { getBuySellRowId, type BuySellProduct } from "@/model/services/buysellapi";
import { seedFavoriteIds } from "@/lib/buySellListUtils";

type NotifyFn = (payload: { type: "success" | "error"; message: string }) => void;

export function useBuySellFavorites(notify?: NotifyFn) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const applyFavoriteIds = useCallback((ids: Iterable<string>) => {
    setFavoriteIds(new Set([...ids].map(String)));
  }, []);

  const syncFromProducts = useCallback(
    (products: BuySellProduct[]) => {
      applyFavoriteIds(seedFavoriteIds(products));
    },
    [applyFavoriteIds],
  );

  /** Merge product flags with /api/favorite/list product rows when logged in. */
  const syncFromProductsAndApi = useCallback(
    async (products: BuySellProduct[]) => {
      const ids = seedFavoriteIds(products);
      try {
        const favProducts = await listBuySellFavoriteProducts();
        for (const p of favProducts) ids.add(String(getBuySellRowId(p)));
      } catch {
        // guest or API error — keep is_favorite from products only
      }
      applyFavoriteIds(ids);
    },
    [applyFavoriteIds],
  );

  const toggleFavorite = useCallback(
    async (productId: string, options?: { requireLogin?: boolean }) => {
      const pid = String(productId);
      if (options?.requireLogin) {
        notify?.({ type: "error", message: "Please log in to save favourites." });
        return;
      }

      const isFav = favoriteIds.has(pid);
      setTogglingIds((prev) => new Set(prev).add(pid));
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.delete(pid);
        else next.add(pid);
        return next;
      });

      try {
        if (isFav) {
          await removeFavorite("buySell", pid);
          notify?.({ type: "success", message: "Removed from favourites." });
        } else {
          await addFavorite("buySell", pid);
          notify?.({ type: "success", message: "Added to favourites." });
        }
      } catch (err) {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (isFav) next.add(pid);
          else next.delete(pid);
          return next;
        });
        notify?.({
          type: "error",
          message: err instanceof Error ? err.message : "Failed to update favourite",
        });
      } finally {
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(pid);
          return next;
        });
      }
    },
    [favoriteIds, notify],
  );

  return {
    favoriteIds,
    togglingIds,
    syncFromProducts,
    syncFromProductsAndApi,
    toggleFavorite,
  };
}
