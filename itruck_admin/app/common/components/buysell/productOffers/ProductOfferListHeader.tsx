"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { PRODUCT_THEME as T, INFO, RADIUS } from "@/lib/theme";
import type { ReactNode } from "react";

type ProductOfferListHeaderProps = {
  count: number;
  title: string;
  showExport?: boolean;
  onExportCsv?: () => void;
  onExportPdf?: () => void;
  exportDisabled?: boolean;
  trailingAction?: ReactNode;
};

export function ProductOfferListHeader({
  count,
  title,
  showExport = false,
  onExportCsv,
  onExportPdf,
  exportDisabled = false,
  trailingAction,
}: ProductOfferListHeaderProps) {
  const exportBtnSx = {
    textTransform: "none" as const,
    fontWeight: 600,
    fontSize: 13,
    color: T.color.textPrimary,
    borderColor: "#d1d5db",
    bgcolor: T.color.surface,
    px: 1.75,
    py: 0.65,
    minHeight: 38,
    borderRadius: `${RADIUS.sm}px`,
    "&:hover": { bgcolor: "#f9fafb", borderColor: "#9ca3af" },
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: { xs: "flex-start", md: "center" },
        justifyContent: "space-between",
        gap: 2,
        flexWrap: "wrap",
        pb: 2,
        mb: 0,
        borderBottom: `1px solid ${T.color.border}`,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            bgcolor: INFO,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 16,
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(37,99,235,0.35)",
          }}
        >
          {count}
        </Box>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: { xs: 20, md: 22 },
            color: "#0f172a",
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        {showExport ? (
          <>
            <Button
              variant="outlined"
              size="small"
              disabled={exportDisabled}
              startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 18 }} />}
              onClick={onExportCsv}
              sx={exportBtnSx}
            >
              Export CSV
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled={exportDisabled}
              startIcon={<FileDownloadOutlinedIcon sx={{ fontSize: 18 }} />}
              onClick={onExportPdf}
              sx={exportBtnSx}
            >
              Export PDF
            </Button>
          </>
        ) : null}
        {trailingAction}
      </Box>
    </Box>
  );
}
