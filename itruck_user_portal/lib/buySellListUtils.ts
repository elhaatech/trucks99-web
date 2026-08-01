import type { BuySellListFilter, BuySellProduct } from "@/model/services/buysellapi";
import { getBuySellRowId } from "@/model/services/buysellapi";
import type { FilterState } from "@/app/admin/portal/buysell/_components/interface/buysell_interface";

/** Map UI filter state to POST /api/buy-sell/list body (same as admin portal). */
export function toBuySellListPayload(
  filters: Pick<
    FilterState,
    | "usear_type"
    | "category_id"
    | "subcategory_id"
    | "status"
    | "min_price"
    | "max_price"
    | "userid"
    | "search"
  >,
): BuySellListFilter {
  const minPrice = filters.min_price ? Number(filters.min_price) : undefined;
  const maxPrice = filters.max_price ? Number(filters.max_price) : undefined;
  const search = filters.search?.trim();

  return {
    status: filters.status || undefined,
    usear_type: filters.usear_type || "buy",
    category_id: filters.category_id || undefined,
    subcategory_id: filters.subcategory_id || undefined,
    userid: filters.userid || undefined,
    search: search || undefined,
    min_price:
      minPrice !== undefined && !Number.isNaN(minPrice) ? minPrice : undefined,
    max_price:
      maxPrice !== undefined && !Number.isNaN(maxPrice) ? maxPrice : undefined,
  };
}

/** Client-side search filter — matches admin BuySellListPage filteredItems logic. */
export function filterBuySellBySearch(
  products: BuySellProduct[],
  search: string,
  userid?: string,
): BuySellProduct[] {
  const q = search.trim().toLowerCase();
  return products.filter((row) => {
    const desc = (row.description ?? "").toLowerCase();
    const addr = (row.address ?? "").toLowerCase();
    const bs = (row.bsNumber ?? "").toLowerCase();
    const matchesSearch =
      !q || desc.includes(q) || addr.includes(q) || bs.includes(q);
    const matchesUser = !userid || row.userid === userid;
    return matchesSearch && matchesUser;
  });
}

export function seedFavoriteIds(products: BuySellProduct[]): Set<string> {
  return new Set(
    products
      .filter((p) => Boolean(p.is_favorite))
      .map((p) => String(getBuySellRowId(p))),
  );
}
