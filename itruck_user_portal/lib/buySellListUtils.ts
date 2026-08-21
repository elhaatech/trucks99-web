import type { BuySellListFilter, BuySellProduct } from "@/model/services/buysellapi";
import { getBuySellRowId } from "@/model/services/buysellapi";
import type { FilterState } from "@/app/admin/portal/buysell/_components/interface/buysell_interface";
import { INDIA_COUNTRY_ID } from "@/model/services/location";

const COUNTRY_ID = INDIA_COUNTRY_ID;
// Fallback used when only a city is filtered (existing Tamil Nadu behaviour).
const TAMIL_NADU_STATE_ID = "69c60e80e9c7314beecc1fbb";

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
    | "no_of_owners_min"
    | "no_of_owners_max"
    | "km_min"
    | "km_max"
    | "make_year_min"
    | "make_year_max"
    | "city_id"
    | "state_id"
  >,
): BuySellListFilter {
  const minPrice = filters.min_price ? Number(filters.min_price) : undefined;
  const maxPrice = filters.max_price ? Number(filters.max_price) : undefined;
  const search = filters.search?.trim();

  const noOfOwnersMin = filters.no_of_owners_min ? Number(filters.no_of_owners_min) : 1;
  const noOfOwnersMax = filters.no_of_owners_max ? Number(filters.no_of_owners_max) : undefined;
  const kmMin = filters.km_min ? Number(filters.km_min) : 10000;
  const kmMax = filters.km_max ? Number(filters.km_max) : undefined;
  const makeYearMin = filters.make_year_min ? Number(filters.make_year_min) : undefined;
  const makeYearMax = filters.make_year_max ? Number(filters.make_year_max) : undefined;

  const cityId = filters.city_id || undefined;
  // The State dropdown stores the state's id (same as category/subcategory), so
  // it is already in the shape the server-side filter expects.
  const stateId = filters.state_id || undefined;

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
    no_of_owners_min:
      noOfOwnersMin !== undefined && !Number.isNaN(noOfOwnersMin)
        ? noOfOwnersMin
        : 1,
    ...(noOfOwnersMax !== undefined && !Number.isNaN(noOfOwnersMax)
      ? { no_of_owners_max: noOfOwnersMax }
      : {}),
    km_min:
      kmMin !== undefined && !Number.isNaN(kmMin) ? kmMin : 10000,
    ...(kmMax !== undefined && !Number.isNaN(kmMax) ? { km_max: kmMax } : {}),
    ...(makeYearMin !== undefined && !Number.isNaN(makeYearMin)
      ? { make_year_min: makeYearMin }
      : {}),
    ...(makeYearMax !== undefined && !Number.isNaN(makeYearMax)
      ? { make_year_max: makeYearMax }
      : {}),
    ...(cityId
      ? {
          city_id: cityId,
          country_id: COUNTRY_ID,
          state_id: stateId ?? TAMIL_NADU_STATE_ID,
        }
      : {}),
    ...(stateId && !cityId ? { state_id: stateId, country_id: COUNTRY_ID } : {}),
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
    const vehicleId = (row.vehicleId ?? "").toLowerCase();
    const matchesSearch =
      !q || desc.includes(q) || addr.includes(q) || bs.includes(q) || vehicleId.includes(q);
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
