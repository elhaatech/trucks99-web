"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ModuleFlowCards } from "./ModuleFlowCards";
import type { ModuleFlow } from "@/types/moduleFlow";
import { NEUTRAL, PRIMARY } from "@/lib/theme";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { alpha } from "@mui/material/styles";

type Props = {
  suggestions: string[];
  flows?: ModuleFlow[];
  onSelect: (value: string) => void;
  disabled?: boolean;
};

export function EmptyState({ suggestions, flows = [], onSelect, disabled }: Props) {
  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        px: 2,
        py: 3,
        textAlign: "center",
        overflowY: "auto",
      }}
    >
      <BrandLogo height={56} sx={{ mb: 1.5 }} />
      <Typography variant="h5" fontWeight={800} sx={{ color: NEUTRAL[900], mb: 0.75 }}>
        TRUCKS99 AI Assistant
      </Typography>
      <Typography sx={{ color: NEUTRAL[500], maxWidth: 480, mb: 2.5, fontSize: 14 }}>
        Explore how each Buy &amp; Sell flow works, then ask the assistant — or create a
        listing conversationally.
      </Typography>

      {flows.length > 0 ? (
        <Box sx={{ width: "100%", mb: 2.5 }}>
          <ModuleFlowCards flows={flows} onSelect={onSelect} disabled={disabled} />
        </Box>
      ) : null}

      <Typography
        variant="subtitle2"
        sx={{ color: NEUTRAL[500], fontWeight: 700, mb: 1, letterSpacing: 0.3 }}
      >
        QUICK ASK
      </Typography>
      <Stack
        direction="row"
        flexWrap="wrap"
        useFlexGap
        spacing={1}
        justifyContent="center"
        sx={{ maxWidth: 640 }}
      >
        {suggestions.slice(0, 8).map((s) => (
          <Button
            key={s}
            size="small"
            variant="outlined"
            disabled={disabled}
            onClick={() => onSelect(s)}
            sx={{
              borderColor: NEUTRAL[200],
              color: NEUTRAL[700],
              textTransform: "none",
              borderRadius: 999,
              "&:hover": { borderColor: PRIMARY, bgcolor: alpha(PRIMARY, 0.06) },
            }}
          >
            {s}
          </Button>
        ))}
      </Stack>
    </Box>
  );
}
