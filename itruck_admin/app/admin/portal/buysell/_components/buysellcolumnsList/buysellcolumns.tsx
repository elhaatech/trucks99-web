"use client";

import { useMemo } from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import type { DataTableColumn } from "@/components/common";
import { createdAtColumn } from "@/components/common";
import { BuySellProduct, getBuySellRowId } from "@/model/services/buysellapi";
import { ProductStatusChip } from "../ProductStatusChip";
import { renderClickableName } from "@/components/common/table/tableColumnHelpers";
import { routes } from "@/lib/routes";
import { renderNumberColumn } from "@/components/common/table/renderNumberColumn";
import { getFirstBuySellImageUrl } from "@/lib/buysellUtils";
import { PRIMARY } from "@/lib/theme";
import { BuySellImage } from "@/components/common/BuySellImage";

interface UseBuySellColumnsOptions {
  favoriteIds: Set<string>;
  togglingIds: Set<string>;
  onToggleFavorite: (row: BuySellProduct) => void;
}

// ─── Image thumbnail ──────────────────────────────────────────────────────────

function ImageThumb({ src }: { src?: string }) {
  return (
    <Box
      sx={{
        width: 48,
        height: 48,
        borderRadius: 1,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "grey.100",
        flexShrink: 0,
      }}
    >
      <BuySellImage src={src} alt="product" />
    </Box>
  );
}
// ─── Columns hook ─────────────────────────────────────────────────────────────

export function useBuySellColumns({
  favoriteIds,
  togglingIds,
  onToggleFavorite,

}: UseBuySellColumnsOptions) {

/**
 * Converts a relative path like "/uploads/xyz.jpg" (as stored in DB)
 * into a full URL the browser can load, since the backend and frontend
 * run on different ports/origins.
 */

  return useMemo<Array<DataTableColumn<BuySellProduct>>>(
    () => [
      // ── BS Number ───────────────────────────────────────────────────────
   
      {
        id: "vehicleId",
        label: "Vehicle ID",
        minWidth: 140,
        render: (row: BuySellProduct) => {
          const display =
            row.vehicleId ||
            (/^\d{10}$/.test(String(row.bsNumber ?? "")) ? row.bsNumber : "—");
          if (display === "—") {
            return (
              <Typography variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
                —
              </Typography>
            );
          }
          return (
            <Link
              component={NextLink}
              href={routes.buysell.view(getBuySellRowId(row))}
              onClick={(e) => e.stopPropagation()}
              sx={{
                color: PRIMARY,
                textDecoration: "none",
                fontVariantNumeric: "tabular-nums",
                cursor: "pointer",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              {display}
            </Link>
          );
        },
      },
      {
        id: "created_by",
        label: "Owner Name",
        sortable: true,
        minWidth: 140,
        render: (row) => (
          <Typography variant="body2">{row.created_by || "—"}</Typography>
        ),
      },

      // ── Image thumbnail ─────────────────────────────────────────────────
    // ── Image thumbnail ─────────────────────────────────────────────────
      {
        id: "images" as keyof BuySellProduct,
        label: "Image",
        minWidth: 70,
        align: "center",
        sortable: true,
        render: (row) => (
          <ImageThumb src={getFirstBuySellImageUrl(row.images)} />
        ),
      },

      // ── Category ────────────────────────────────────────────────────────
      {
        id: "category_id",
        label: "Category",
        sortable: true,
        minWidth: 130,
        render: (row) => {
          const name =
            typeof row.category_id === "object" && row.category_id
              ? row.category_id.category_name
              : "—";
          return <Typography variant="body2">{name}</Typography>;
        },
      },

      // ── Sub category ────────────────────────────────────────────────────
      {
        id: "subcategory_id",
        label: "Sub Category",
        sortable: true,
        minWidth: 140,
        render: (row) => {
          const name =
            typeof row.subcategory_id === "object" && row.subcategory_id
              ? row.subcategory_id.sub_category_name
              : "—";
          return <Typography variant="body2">{name}</Typography>;
        },
      },

      // ── Price ───────────────────────────────────────────────────────────
      {
        id: "price",
        label: "Price",
        sortable: true,
        minWidth: 110,
        render: (row) => (
          <Typography variant="body2" fontWeight={600}>
            ₹{Number(row.price).toLocaleString("en-IN")}
          </Typography>
        ),
      },


      // ── Location ────────────────────────────────────────────────────────
      {
        id: "address",
        label: "Location",
        minWidth: 150,
        sortable: true,
        render: (row) => (
          <Typography variant="body2" color="text.secondary">
            {[row.city_info?.name, row.state_info?.name]
              .filter(Boolean)
              .join(", ") ||
              row.address ||
              "—"}
          </Typography>
        ),
      },

      // ── Status ──────────────────────────────────────────────────────────
      // Uses local StatusChip instead of BlockStatusChip so it correctly
      // handles "pending" | "draft" | "active" | "inactive" (all lowercase).
      {
        id: "status",
        label: "Status",
        sortable: true,
        minWidth: 100,
        render: (row) => <ProductStatusChip status={row.status} />,
      },
      createdAtColumn<BuySellProduct>(),
      {
        id: "_favorite" as keyof BuySellProduct,
        label: "Favourite",
        minWidth: 80,
        align: "center",
        render: (row) => {
          const id = getBuySellRowId(row);
          const isFav = favoriteIds.has(id);
          const isToggling = togglingIds.has(id);
          return (
            <Tooltip
              title={isFav ? "Remove from favourites" : "Add to favourites"}
            >
              <span>
                <IconButton
                  size="small"
                  disabled={isToggling}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(row);
                  }}
                  sx={{
                    color: isFav ? "error.main" : "action.disabled",
                    transition: "color 0.2s",
                    "&:hover": { color: "error.main" },
                  }}
                >
                  {isFav ? (
                    <FavoriteIcon fontSize="small" />
                  ) : (
                    <FavoriteBorderIcon fontSize="small" />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          );
        },
      },
    ],
    [favoriteIds, togglingIds, onToggleFavorite],
  );
}
