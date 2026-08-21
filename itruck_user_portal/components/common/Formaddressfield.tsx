import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { getPlaceAutocomplete, getPlaceDetails } from "@/model/services/places";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface FormAddressFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (address: string, coords: LatLng) => void;
  required?: boolean;
  placeholder?: string;
}

type Suggestion = { description: string; place_id: string };

/**
 * Address input with Google Places autocomplete suggestions.
 * When the user picks a suggestion, `onPlaceSelect` is called with the
 * formatted address and lat/lng so the parent can store coordinates.
 *
 * Usage:
 *   <FormAddressField
 *     label="Pickup Address*"
 *     value={address}
 *     onChange={setAddress}
 *     onPlaceSelect={(addr, { lat, lng }) => {
 *       setAddress(addr);
 *       setLat(String(lat));
 *       setLng(String(lng));
 *     }}
 *     required
 *   />
 */
export default function FormAddressField({
  label,
  value,
  onChange,
  onPlaceSelect,
  required = false,
  placeholder = "Start typing…",
}: FormAddressFieldProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const justSelectedRef = useRef(false);

  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      setSuggestions([]);
      return;
    }
    const query = value.trim();
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      getPlaceAutocomplete(query)
        .then((predictions) => {
          setSuggestions(
            predictions.map((p) => ({
              description: p.description,
              place_id: p.place_id,
            })),
          );
        })
        .catch(() => setSuggestions([]));
    }, 300);
    return () => clearTimeout(t);
  }, [value]);

  const handleSelect = (placeId: string, description: string) => {
    justSelectedRef.current = true;
    setSuggestions([]);
    getPlaceDetails(placeId)
      .then((result) => {
        const address = result?.formatted_address || description;
        onChange(address);
        const loc = result?.geometry?.location;
        if (onPlaceSelect && loc?.lat != null && loc?.lng != null) {
          onPlaceSelect(address, { lat: loc.lat, lng: loc.lng });
        }
      })
      .catch(() => onChange(description));
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
      <TextField
        size="small"
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        fullWidth
      />
      {suggestions.length > 0 && (
        <Box
          sx={{
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
            maxHeight: 200,
            overflowY: "auto",
            bgcolor: "background.paper",
            zIndex: 10,
          }}
        >
          {suggestions.map((s) => (
            <MenuItem
              key={s.place_id}
              onClick={() => handleSelect(s.place_id, s.description)}
              sx={{ fontSize: 14 }}
            >
              {s.description}
            </MenuItem>
          ))}
        </Box>
      )}
    </Box>
  );
}