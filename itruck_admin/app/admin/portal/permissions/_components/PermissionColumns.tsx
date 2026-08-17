"use client";

import { useMemo } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import { alpha, useTheme } from "@mui/material/styles";
import type { PermissionGroup } from "@/model/services/permission";
import { createdAtColumn } from "@/components/common";

export function usePermissionColumns() {
  const theme = useTheme();

  return useMemo(
    () => [
      { id: "name", label: "Name", minWidth: 160 },
      {
        id: "permissions",
        label: "Permissions",
        minWidth: 320,
        render: (row: PermissionGroup) => {
          const items = row.permissions || [];
          return (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {items.slice(0, 4).map((p, idx) => {
                const a = p.access;
                const active = a ? (["create", "view", "edit", "delete"] as const).filter((k) => a[k]) : [];
                const accessStr = active.length ? active.map((k) => k.charAt(0).toUpperCase() + k.slice(1)).join(", ") : "—";
                
                return (
                  <Chip
                    key={p.title_name + String(idx)}
                    label={`${p.display_name || p.title_name} (${accessStr})`}
                    size="small"
                    sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: "primary.main" }}
                  />
                );
              })}
              {items.length > 4 && (
                <Chip label={`+${items.length - 4}`} size="small" variant="outlined" />
              )}
            </Box>
          );
        },
      },
      createdAtColumn<PermissionGroup>({ sortable: true }),
    ],
    [theme]
  );
}
