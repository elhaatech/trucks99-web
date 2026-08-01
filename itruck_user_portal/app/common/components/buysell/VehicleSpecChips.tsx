"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import LocalGasStationOutlinedIcon from "@mui/icons-material/LocalGasStationOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import SpeedOutlinedIcon from "@mui/icons-material/SpeedOutlined";
import TagOutlinedIcon from "@mui/icons-material/TagOutlined";
import type { BuySellProduct } from "@/model/services/buysellapi";
import { PRODUCT_THEME as T } from "@/lib/theme";
import { getListingSpecChips, type ListingSpecChip } from "./utils";

const CHIP_META: Record<
  ListingSpecChip["key"],
  { color: string; Icon: typeof CalendarMonthOutlinedIcon }
> = {
  year: { color: "#2563eb", Icon: CalendarMonthOutlinedIcon },
  km: { color: "#0f766e", Icon: SpeedOutlinedIcon },
  fuel: { color: "#ea580c", Icon: LocalGasStationOutlinedIcon },
  owners: { color: "#7c3aed", Icon: PersonOutlineOutlinedIcon },
  listingId: { color: "#0f766e", Icon: TagOutlinedIcon },
};

type VehicleSpecChipsProps = {
  product: BuySellProduct;
  /** denser chips for compact list rows */
  dense?: boolean;
};

export function VehicleSpecChips({ product, dense = false }: VehicleSpecChipsProps) {
  const chips = getListingSpecChips(product);
  if (!chips.length) return null;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: dense ? 0.75 : 1,
        mt: dense ? 1 : 1.25,
        maxWidth: 360,
      }}
    >
      {chips.map(({ key, caption, label }) => {
        const { color, Icon } = CHIP_META[key];
        return (
          <Box
            key={key}
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 0.75,
              minWidth: 0,
              bgcolor: T.color.surfaceMuted,
              borderRadius: 1.5,
              px: dense ? 1 : 1.15,
              py: dense ? 0.7 : 0.9,
            }}
          >
            <Icon sx={{ fontSize: dense ? 16 : 18, color, flexShrink: 0, mt: "1px" }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: T.color.textMuted,
                  lineHeight: 1.2,
                  mb: 0.2,
                }}
              >
                {caption}
              </Typography>
              <Typography
                sx={{
                  fontSize: dense ? 12 : 12.5,
                  fontWeight: 700,
                  color: T.color.textPrimary,
                  lineHeight: 1.25,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={label}
              >
                {label}
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
