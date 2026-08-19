"use client";

import { useMemo } from "react";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";

import type { ContactEnquiry } from "@/model/services/contact";
import { resolveContactAttachmentUrl } from "@/model/services/contact";
import { getRowId } from "@/model/api";
import type { DataTableColumn } from "@/components/common";
import { createdAtColumn } from "@/components/common";
import { renderClickableName } from "@/components/common/table/tableColumnHelpers";
import { routes } from "@/lib/routes";

const STATUS_COLOR: Record<string, "warning" | "info" | "success" | "default"> = {
  new: "warning",
  read: "info",
  closed: "success",
};

function truncate(text: string, max = 80) {
  const plain = (text || "").replace(/\s+/g, " ").trim();
  if (!plain) return "—";
  return plain.length > max ? `${plain.slice(0, max)}…` : plain;
}

export function useEnquiryColumns() {
  return useMemo<Array<DataTableColumn<ContactEnquiry>>>(
    () => [
      {
        id: "name",
        label: "Name",
        minWidth: 160,
        sortable: true,
        render: (row) =>
          renderClickableName(
            row.name || "—",
            routes.enquiry.view(getRowId(row)),
          ),
      },
      {
        id: "mobile",
        label: "Mobile",
        minWidth: 130,
        sortable: true,
        render: (row) => row.mobile || "—",
      },
      {
        id: "email",
        label: "Email",
        minWidth: 180,
        sortable: true,
        render: (row) => row.email || "—",
      },
      {
        id: "message",
        label: "Message",
        minWidth: 220,
        render: (row) => truncate(row.message),
      },
      {
        id: "attachment",
        label: "Attachment",
        minWidth: 110,
        render: (row) => {
          const href = resolveContactAttachmentUrl(row.attachment);
          if (!href) return "—";
          return (
            <Link href={href} target="_blank" rel="noopener noreferrer">
              View file
            </Link>
          );
        },
      },
      {
        id: "status",
        label: "Status",
        minWidth: 110,
        sortable: true,
        render: (row) => {
          const status = String(row.status || "new").toLowerCase();
          return (
            <Chip
              size="small"
              label={status}
              color={STATUS_COLOR[status] || "default"}
            />
          );
        },
      },
      createdAtColumn<ContactEnquiry>(),
    ],
    [],
  );
}
