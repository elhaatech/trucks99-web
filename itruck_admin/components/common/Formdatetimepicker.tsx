import Box from "@mui/material/Box";
import { PickupDateTimePicker } from "@/components/ui";

export interface FormDateTimePickerProps {
  label?: string;
  value: string;
  onChange: (iso: string) => void;
  showPresetSelect?: boolean;
}

/**
 * Thin wrapper around PickupDateTimePicker that applies the consistent
 * min-height styling used across all Load forms.
 *
 * Usage:
 *   <FormDateTimePicker label="Pickup time" value={isoString} onChange={setIsoString} />
 */
export default function FormDateTimePicker({
  label = "Pickup time",
  value,
  onChange,
  showPresetSelect = false,
}: FormDateTimePickerProps) {
  return (
    <Box
      sx={{
        width: "100%",
        minWidth: 0,
        alignSelf: "stretch",
        display: "flex",
        alignItems: "stretch",
        "& .MuiInputBase-root": { minHeight: "40px !important" },
      }}
    >
      <PickupDateTimePicker
        label={label}
        value={value}
        onChange={(iso) => onChange(iso ?? "")}
        showPresetSelect={showPresetSelect}
      />
    </Box>
  );
}