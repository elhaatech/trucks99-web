import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormAddressField, { LatLng } from "./Formaddressfield";

export interface StopItem {
  address: string;
  lat: string;
  lng: string;
}

export interface FormStopsProps {
  stops: StopItem[];
  onChange: (stops: StopItem[]) => void;
}

/**
 * Manages a dynamic list of intermediate stops between pickup and drop.
 * Each stop uses `FormAddressField` for autocomplete.
 *
 * Usage:
 *   <FormStops stops={formStops} onChange={setFormStops} />
 */
export default function FormStops({ stops, onChange }: FormStopsProps) {
  const handleAdd = () =>
    onChange([...stops, { address: "", lat: "", lng: "" }]);

  const handleRemove = (index: number) =>
    onChange(stops.filter((_, i) => i !== index));

  const handleAddressChange = (index: number, value: string) =>
    onChange(stops.map((s, i) => (i === index ? { ...s, address: value } : s)));

  const handlePlaceSelect = (index: number, address: string, coords: LatLng) =>
    onChange(
      stops.map((s, i) =>
        i === index
          ? { address, lat: String(coords.lat), lng: String(coords.lng) }
          : s
      )
    );

  return (
    <Box className="fullWidth" sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box sx={{ fontSize: 14, fontWeight: 600 }}>Intermediate stops</Box>
        <Button type="button" size="small" variant="outlined" onClick={handleAdd}>
          Add stop
        </Button>
      </Box>

      {stops.length === 0 && (
        <Box sx={{ fontSize: 12, color: "text.secondary" }}>
          No stops added. Click &quot;Add stop&quot; to insert stops between pickup and drop.
        </Box>
      )}

      {stops.map((s, index) => (
        <Box
          key={index}
          sx={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: 1,
            alignItems: "flex-start",
          }}
        >
          <FormAddressField
            label={`Stop address ${index + 1}`}
            value={s.address}
            onChange={(val) => handleAddressChange(index, val)}
            onPlaceSelect={(addr, coords) => handlePlaceSelect(index, addr, coords)}
          />
          <Button
            type="button"
            size="small"
            color="error"
            variant="outlined"
            onClick={() => handleRemove(index)}
            sx={{ mt: "4px" }}
          >
            Remove
          </Button>
        </Box>
      ))}
    </Box>
  );
}