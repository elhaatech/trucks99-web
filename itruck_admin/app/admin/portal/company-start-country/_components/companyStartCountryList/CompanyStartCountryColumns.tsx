"use client";

import { useMemo } from "react";
import type { CompanyStartCountry } from "@/model/api";
import { getRowId } from "@/model/api";

import type { DataTableColumn } from "@/components/common";
import { BlockStatusChip, createdAtColumn } from "@/components/common";

import { routes } from "@/lib/routes";
import { renderClickableName } from "@/components/common/table/tableColumnHelpers";

export function useCompanyStartCountryColumns() {
  return useMemo<Array<DataTableColumn<CompanyStartCountry>>>(
    () => [
      {
        id: "city",
        label: "City",
        minWidth: 160,
        sortable: true,
        render: (row) => {
          const anyRow = row as unknown as Record<string, unknown>;
          const city =
            row.city ??
            anyRow.startCity ??
            anyRow.start_city ??
            anyRow.city_name ??
            anyRow.cityName;

          return renderClickableName(
            city ? String(city) : "",
            routes.companyStartCountry.view(getRowId(row)),
          );
        },
      },

      {
        id: "state",
        label: "State",
        sortable: true,
        minWidth: 160,
        render: (row) => {
          const anyRow = row as unknown as Record<string, unknown>;
          const state =
            row.state ??
            anyRow.startState ??
            anyRow.start_state ??
            anyRow.state_name ??
            anyRow.stateName;

          return renderClickableName(
            state ? String(state) : "",
            routes.companyStartCountry.view(getRowId(row)),
          );
        },
      },

      {
        id: "country",
        label: "Country",
        sortable: true,
        minWidth: 180,
        render: (row) => {
          const anyRow = row as unknown as Record<string, unknown>;
          const country =
            row.country ??
            anyRow.startCountry ??
            anyRow.start_country ??
            anyRow.country_name ??
            anyRow.countryName;

          return renderClickableName(
            country ? String(country) : "",
            routes.companyStartCountry.view(getRowId(row)),
          );
        },
      },

      {
        id: "status",
        label: "Status",
        sortable: true,
        minWidth: 120,
        render: (row) => <BlockStatusChip status={row.status} size="small" />,
      },
      createdAtColumn<CompanyStartCountry>(),
    ],
    [],
  );
}
