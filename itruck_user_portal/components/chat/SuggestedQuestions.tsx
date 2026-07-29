"use client";

import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import { NEUTRAL, PRIMARY } from "@/lib/theme";

type Props = {
  items: string[];
  onSelect: (value: string) => void;
  disabled?: boolean;
};

export function SuggestedQuestions({ items, onSelect, disabled }: Props) {
  if (!items.length) return null;
  return (
    <Stack
      direction="row"
      flexWrap="wrap"
      useFlexGap
      spacing={1}
      sx={{ px: { xs: 1.5, md: 2 }, pb: 1 }}
    >
      {items.map((item) => (
        <Chip
          key={item}
          label={item}
          clickable
          disabled={disabled}
          onClick={() => onSelect(item)}
          sx={{
            bgcolor: NEUTRAL[50],
            border: `1px solid ${NEUTRAL[200]}`,
            "&:hover": { bgcolor: "rgba(92,77,150,0.08)", borderColor: PRIMARY },
          }}
        />
      ))}
    </Stack>
  );
}
