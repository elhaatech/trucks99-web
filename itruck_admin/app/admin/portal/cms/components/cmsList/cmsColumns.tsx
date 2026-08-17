"use client";

import { useMemo } from "react";

import { getRowId } from "@/model/api";

import type { DataTableColumn } from "@/components/common";
import { BlockStatusChip } from "@/components/common";
import { createdAtColumn } from "@/components/common";

import { routes } from "@/lib/routes";
import { renderClickableName } from "@/components/common/table/tableColumnHelpers";
import { CMSPage } from "@/model/services/cms";

function truncate(text: string, max = 70) {
  if (!text) return "—";
  const plain = text.replace(/<[^>]*>/g, "").trim();
  return plain.length > max ? `${plain.slice(0, max)}…` : plain || "—";
}

export function useCMSColumns() {
  return useMemo<Array<DataTableColumn<CMSPage>>>(
    () => [
      {
        id: "page_title",
        label: "Title",
        minWidth: 200,
        sortable: true,
        render: (row) =>
          renderClickableName(
            row.page_title,
            routes.cms.view(getRowId(row)),
          ),
      },
      {
        id: "slug",
        label: "Slug",
        minWidth: 160,
        render: (row) => (
          <span style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>
            {row.slug}
          </span>
        ),
      },
      {
        id: "page_description",
        label: "Description",
        minWidth: 220,
        render: (row) => truncate(row.page_description),
      },
      {
        id: "status",
        label: "Status",
        sortable: true,
        minWidth: 110,
        render: (row) => <BlockStatusChip status={row.status} size="small" />,
      },
      createdAtColumn<CMSPage>(),
    ],
    [],
  );
}