"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";

type ProductOfferListHeaderProps = {
  count: number;
  title: string;
  showExport?: boolean;
  onExportCsv?: () => void;
  onExportPdf?: () => void;
  exportDisabled?: boolean;
};

export function ProductOfferListHeader({
  count,
  title,
  showExport = false,
  onExportCsv,
  onExportPdf,
  exportDisabled = false,
}: ProductOfferListHeaderProps) {
  const exportBtnSx = {
    textTransform: "none" as const,
    fontWeight: 600,
    fontSize: 13,
    color: T.color.textSecondary,
    borderColor: T.color.border,
    px: 1.5,
    py: 0.75,
    minHeight: 36,
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: { xs: "flex-start", sm: "center" },
        justifyContent: "space-between",
        gap: 1.5,
        flexWrap: "wrap",
        mb: 1.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            bgcolor: INFO,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 15,
            flexShrink: 0,
          }}
        >
          {count}
        </Box>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: 18, md: 20 }, color: T.color.textPrimary }}>
          {title}
        </Typography>
      </Box>

      {showExport ? (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
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
        </Box>
      ) : null}
    </Box>
  );
}
