"use client";

import * as React from "react";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import dayjs, { type Dayjs } from "dayjs";

import { DatePickerProvider } from "@/providers/DatePickerProvider";

const PICKUP_OPTIONS = ["", "Now", "Today 2 PM", "Today 5 PM", "Schedule Later", "Schedule"] as const;

/** Convert ISO string to datetime-local value (YYYY-MM-DDTHH:mm). */
export function isoToDatetimeLocal(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${m}-${day}T${h}:${min}`;
  } catch {
    return "";
  }
}

/** Convert option + optional schedule datetime to ISO 8601 (e.g. 2026-03-07T08:30:00.000Z). */
export function pickupTimeToISO(
  option: string,
  scheduleDateTime?: string
): string | undefined {
  const trimmed = option?.trim();
  if (!trimmed) return undefined;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmed)) return trimmed;
  if (trimmed === "Now") return new Date().toISOString();
  if (trimmed === "Today 2 PM") {
    const d = new Date();
    d.setHours(14, 0, 0, 0);
    return d.toISOString();
  }
  if (trimmed === "Today 5 PM") {
    const d = new Date();
    d.setHours(17, 0, 0, 0);
    return d.toISOString();
  }
  if (trimmed === "Schedule Later" || trimmed === "Schedule") {
    const dt = scheduleDateTime?.trim();
    if (!dt) return undefined;
    const date = new Date(dt);
    return isNaN(date.getTime()) ? undefined : date.toISOString();
  }
  return undefined;
}

/** Detect which option an ISO value corresponds to (for initializing from server). */
function isoToOption(iso: string): (typeof PICKUP_OPTIONS)[number] {
  if (!iso?.trim() || !/^\d{4}-\d{2}-\d{2}T/.test(iso)) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const diffMs = Math.abs(d.getTime() - now.getTime());
  if (diffMs < 2 * 60 * 1000) return "Now";
  const sameDay = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (sameDay && d.getHours() === 14 && d.getMinutes() === 0) return "Today 2 PM";
  if (sameDay && d.getHours() === 17 && d.getMinutes() === 0) return "Today 5 PM";
  return "Schedule Later";
}

export interface PickupDateTimePickerProps {
  /** Current value as ISO 8601 string (e.g. 2026-03-07T08:30:00.000Z) or empty. */
  value: string;
  /** Called with ISO string or undefined when selection changes. */
  onChange: (iso: string | undefined) => void;
  label?: string;
  /** Include "Schedule" option (in addition to "Schedule Later"). Default false. */
  includeScheduleOption?: boolean;
  /** Show quick-pick dropdown (Now, Today 2 PM, ...). Default true. */
  showPresetSelect?: boolean;
  sx?: SxProps<Theme>;
  /** Min width for the dropdown. */
  minWidth?: number;
}

export function PickupDateTimePicker({
  value,
  onChange,
  label = "Pickup time",
  includeScheduleOption = false,
  showPresetSelect = true,
  sx,
  minWidth = 160,
}: PickupDateTimePickerProps) {
  const isIso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value?.trim() ?? "");
  const [option, setOption] = React.useState<string>(() =>
    value?.trim() ? (isIso ? isoToOption(value) : value) : ""
  );
  const [scheduleDateTime, setScheduleDateTime] = React.useState<Dayjs | null>(() =>
    value?.trim() && isIso ? dayjs(value) : null
  );

  React.useEffect(() => {
    if (!value?.trim()) {
      setOption("");
      setScheduleDateTime(null);
      return;
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) {
      setOption(isoToOption(value));
      const d = dayjs(value);
      setScheduleDateTime(d);
    } else {
      setOption(value);
      setScheduleDateTime(null);
    }
  }, [value]);

  const options = includeScheduleOption
    ? PICKUP_OPTIONS
    : PICKUP_OPTIONS.filter((o) => o !== "Schedule");

  const handleOptionChange = (newOption: string) => {
    setOption(newOption);
    if (newOption === "Now") {
      const now = dayjs();
      setScheduleDateTime(now);
      onChange(now.toISOString());
    } else if (newOption === "Today 2 PM") {
      const d = dayjs().hour(14).minute(0).second(0).millisecond(0);
      setScheduleDateTime(d);
      onChange(d.toISOString());
    } else if (newOption === "Today 5 PM") {
      const d = dayjs().hour(17).minute(0).second(0).millisecond(0);
      setScheduleDateTime(d);
      onChange(d.toISOString());
    } else if (newOption === "Schedule Later" || newOption === "Schedule") {
      const dt = scheduleDateTime ?? dayjs();
      setScheduleDateTime(dt);
      onChange(dt.toISOString());
    } else {
      setScheduleDateTime(null);
      onChange(undefined);
    }
  };

  const handleDateTimeChange = (newDateTime: Dayjs | null) => {
    setScheduleDateTime(newDateTime);
    onChange(newDateTime?.toISOString() ?? undefined);
  };

  return (
    <DatePickerProvider>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, alignItems: "stretch", width: "100%", minWidth: 0, ...sx }}>
        {showPresetSelect && (
          <TextField
            size="small"
            select
            label={label}
            value={option}
            onChange={(e) => handleOptionChange(e.target.value)}
            sx={{ minWidth }}
          >
            <MenuItem value="">— Select —</MenuItem>
            {options.filter(Boolean).map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </TextField>
        )}
        <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "stretch" }}>
          <DateTimePicker
            label="Date & Time"
            value={scheduleDateTime}
            onChange={handleDateTimeChange}
            format="MM/DD/YYYY hh:mm A"
            slotProps={{
              textField: {
                size: "small",
                fullWidth: true,
                variant: "outlined",
                sx: {
                  width: "100%",
                  "& .MuiFormControl-root": { width: "100%" },
                  "& .MuiInputBase-root": { minHeight: 40 },
                  "& .MuiOutlinedInput-root": { minHeight: 40 },
                },
              },
            }}
            minDateTime={dayjs()}
          />
        </Box>
      </Box>
    </DatePickerProvider>
  );
}
