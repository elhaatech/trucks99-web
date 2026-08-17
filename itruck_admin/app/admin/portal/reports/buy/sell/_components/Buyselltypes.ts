import type { BuySellFilters } from "@/model/services/report";

export type BuySellFilterState = {
  dateFrom:  string;
  dateTo:    string;
  user_type: string;  // "buy" | "sell" | ""
  status:    string;  // "Active" | "Inactive" | ""
  search:    string;
};

export const EMPTY_BUYSELL_FILTERS: BuySellFilterState = {
  dateFrom:  "",
  dateTo:    "",
  user_type: "",
  status:    "",
  search:    "",
};

export function toBuySellApiFilters(f: BuySellFilterState): BuySellFilters {
  const out: BuySellFilters = {};
  if (f.dateFrom)  out.dateFrom  = f.dateFrom;
  if (f.dateTo)    out.dateTo    = f.dateTo;
  if (f.user_type) out.user_type = f.user_type as "buy" | "sell";
  if (f.status)    out.status    = f.status as "Active" | "Inactive";
  if (f.search)    out.search    = f.search;
  return out;
}

export type BuySellTab =
  | "summary"
  | "daily-activity"
  | "type-summary"
  | "status-summary"
  | "category-posted"   // NEW – category-wise vehicles posted for sell
  | "category-sold";    // NEW – category-wise vehicles sold

export const BUYSELL_TABS: { id: BuySellTab; label: string }[] = [
  { id: "summary",          label: "Summary"          },
  { id: "daily-activity",   label: "Daily Activity"   },
  { id: "type-summary",     label: "By Type"          },
  { id: "status-summary",   label: "By Status"        },
  { id: "category-posted",  label: "Posted by Category" },
  { id: "category-sold",    label: "Sold by Category"   },
];