"use client";

import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import {
  getPlaceAutocomplete,
  getPlaceDetails,
  type PlacePrediction,
} from "@/model/services/places";

export interface AddressAutocompleteProps {
  label: string;
  value: string;
  onChange: (address: string, lat?: number, lng?: number) => void;
  required?: boolean;
  disabled?: boolean;
}

export function AddressAutocomplete({
  label,
  value,
  onChange,
  required,
  disabled,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const justSelectedRef = useRef(false);

  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      setSuggestions([]);
      return;
    }
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(() => {
      getPlaceAutocomplete(value)
        .then(setSuggestions)
        .catch(() => setSuggestions([]));
    }, 300);
    return () => clearTimeout(t);
  }, [value]);

  const handleSelect = (placeId: string, description: string) => {
    justSelectedRef.current = true;
    setSuggestions([]);
    getPlaceDetails(placeId)
      .then((result) => {
        const addr: string = result?.formatted_address || description;
        const loc = result?.geometry?.location;
        onChange(addr, loc?.lat, loc?.lng);
      })
      .catch(() => onChange(description));
  };

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 180,
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
      }}
    >
      <TextField
        label={label}
        value={value}
        required={required}
        disabled={disabled}
        fullWidth
        onChange={(e) => onChange(e.target.value)}
        placeholder="Start typing to see suggestions..."
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
