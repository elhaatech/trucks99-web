"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import VerifiedIcon from "@mui/icons-material/Verified";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import BoltOutlinedIcon from "@mui/icons-material/BoltOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import { PRODUCT_THEME as T } from "./theme";

export interface HighlightItem {
  icon: React.ReactNode;
  label: string;
}

const DEFAULT_HIGHLIGHTS: HighlightItem[] = [
  { icon: <VerifiedIcon fontSize="small" />, label: "Verified Product" },
  { icon: <LockOutlinedIcon fontSize="small" />, label: "Secure Payment" },
  { icon: <EventAvailableOutlinedIcon fontSize="small" />, label: "Easy Booking" },
  { icon: <BoltOutlinedIcon fontSize="small" />, label: "Fast Response" },
  { icon: <FactCheckOutlinedIcon fontSize="small" />, label: "Quality Checked" },
];

/** Static trust-highlight strip. Pass `items` to override the defaults. */
export function ProductHighlights({ items = DEFAULT_HIGHLIGHTS }: { items?: HighlightItem[] }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 1,
        bgcolor: T.color.trustNavySoft,
        border: `1px solid ${T.color.border}`,
        borderRadius: T.radius.md,
        p: 1.5,
      }}
    >
      {items.map(({ icon, label }) => (
        <Box
          key={label}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            bgcolor: T.color.surface,
            border: `1px solid ${T.color.border}`,
            borderRadius: "999px",
            px: 1.4,
            py: 0.6,
            color: T.color.trustNavy,
          }}
        >
          {icon}
          <Typography sx={{ fontFamily: T.font.body, fontSize: 12.5, fontWeight: 600, color: T.color.textPrimary }}>
            {label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
