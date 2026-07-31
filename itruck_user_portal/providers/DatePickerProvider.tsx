"use client";

import type { ReactNode } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

/**
 * Scoped MUI X date adapter — prefer this over a global ThemeRegistry wrap
 * so marketplace pages that never open date fields avoid the adapter cost.
 */
export function DatePickerProvider({ children }: { children: ReactNode }) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      {children}
    </LocalizationProvider>
  );
}
