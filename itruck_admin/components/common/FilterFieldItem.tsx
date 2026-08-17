// components/common/FilterFieldItem.tsx

import Grid from "@mui/material/Grid";
import type { ReactNode } from "react";

interface FilterFieldItemProps {
  children: ReactNode;
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
}

export function FilterFieldItem({
  children,
  xs = 12,
  sm = 6,
  md = 4,
  lg,
}: FilterFieldItemProps) {
  return (
    <Grid size={{ xs, sm, md, lg }}>
      {children}
    </Grid>
  );
}