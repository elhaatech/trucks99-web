"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useNotification } from "@/hooks/useNotification";
import {
  useBuySellFavorites,
  type BuySellFavoritesState,
} from "@/lib/useBuySellFavorites";

const MarketplaceFavoritesContext = createContext<BuySellFavoritesState | null>(
  null,
);

export function MarketplaceFavoritesProvider({ children }: { children: ReactNode }) {
  const { notify } = useNotification();
  const value = useBuySellFavorites(notify);
  return (
    <MarketplaceFavoritesContext.Provider value={value}>
      {children}
    </MarketplaceFavoritesContext.Provider>
  );
}

export function useMarketplaceFavorites(): BuySellFavoritesState {
  const ctx = useContext(MarketplaceFavoritesContext);
  if (!ctx) {
    throw new Error("useMarketplaceFavorites must be used within MarketplaceFavoritesProvider");
  }
  return ctx;
}

export function useMarketplaceFavoritesOptional(): BuySellFavoritesState | null {
  return useContext(MarketplaceFavoritesContext);
}
