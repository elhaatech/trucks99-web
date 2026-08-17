import type { ReportFilters } from "@/model/services/report";

export type ReportFilterState = {
  dateFrom: string;
  dateTo: string;
  origin: string;
  destination: string;
  truckType: string;
  vehicleType: string;
};

export const EMPTY_REPORT_FILTERS: ReportFilterState = {
  dateFrom: "",
  dateTo: "",
  origin: "",
  destination: "",
  truckType: "",
  vehicleType: "",
};

export function toApiFilters(f: ReportFilterState): ReportFilters {
  const out: ReportFilters = {};
  if (f.dateFrom)    out.dateFrom    = f.dateFrom;
  if (f.dateTo)      out.dateTo      = f.dateTo;
  if (f.origin)      out.origin      = f.origin;
  if (f.destination) out.destination = f.destination;
  if (f.truckType)   out.truckType   = f.truckType;
  if (f.vehicleType) out.vehicleType = f.vehicleType;
  return out;
}

export type ReportTab =
  | "overview"
  | "daily-activity"
  | "load-status"
  | "truck-status"
  | "truck-body"
  | "fulfillment"
  | "routes"
  | "no-offer"
  | "idle-trucks"
  | "pricing"
  | "top-users"
  | "cancellations"
  | "material-demand"
  | "vehicle-demand"
  | "load-truck-match";

export type TabConfig = {
  id: ReportTab;
  label: string;
  group: "Overview" | "Loads" | "Trucks" | "Analytics";
};

export const REPORT_TABS: TabConfig[] = [
  { id: "overview",        label: "Overview",           group: "Overview"   },
  { id: "daily-activity",  label: "Daily Activity",     group: "Overview"   },
  { id: "load-status",     label: "Load Status",        group: "Loads"      },
  { id: "no-offer",        label: "Unassigned Loads",   group: "Loads"      },
  { id: "fulfillment",     label: "Fulfillment Time",   group: "Loads"      },
  { id: "routes",          label: "Route Popularity",   group: "Loads"      },
  { id: "truck-status",    label: "Truck Status",       group: "Trucks"     },
  { id: "truck-body",      label: "Body Utilization",   group: "Trucks"     },
  { id: "idle-trucks",     label: "Idle Trucks",        group: "Trucks"     },
  { id: "pricing",         label: "Pricing Comparison", group: "Analytics"  },
  { id: "top-users",       label: "Top Users",          group: "Analytics"  },
  { id: "cancellations",   label: "Cancellations",      group: "Analytics"  },
  { id: "material-demand",  label: "Material Demand",     group: "Analytics"  },
  { id: "vehicle-demand",   label: "Vehicle Demand",      group: "Analytics"  },
  { id: "load-truck-match", label: "Load-Truck Matching", group: "Analytics"  },
];