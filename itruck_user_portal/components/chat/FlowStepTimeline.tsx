"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { NEUTRAL, PRIMARY } from "@/lib/theme";

export type FlowStepView = {
  order: number;
  title: string;
  body?: string;
  bullets?: string[];
};

type Props = {
  title?: string;
  steps: FlowStepView[];
};

/** Visual step timeline for knowledge-base guide replies. */
export function FlowStepTimeline({ title, steps }: Props) {
  if (!steps?.length) return null;

  return (
    <Box sx={{ my: 1 }}>
      {title ? (
        <Typography fontWeight={800} sx={{ mb: 1.25, fontSize: 16 }}>
          {title}
        </Typography>
      ) : null}
      {steps.map((step, idx) => (
        <Box
          key={`${step.order}-${step.title}`}
          sx={{
            display: "flex",
            gap: 1.25,
            alignItems: "flex-start",
            mb: 1.25,
            position: "relative",
            "&::before":
              idx < steps.length - 1
                ? {
                    content: '""',
                    position: "absolute",
                    left: 11,
                    top: 26,
                    bottom: -10,
                    width: 2,
                    bgcolor: "rgba(37,99,235,0.22)",
                  }
                : undefined,
          }}
        >
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              flexShrink: 0,
              display: "grid",
              placeItems: "center",
              bgcolor: PRIMARY,
              color: "#fff",
              fontSize: 11,
              fontWeight: 800,
              zIndex: 1,
            }}
          >
            {step.order}
          </Box>
          <Box sx={{ minWidth: 0, pt: 0.1 }}>
            <Typography fontWeight={700} fontSize={13.5}>
              {step.title}
            </Typography>
            {step.body ? (
              <Typography variant="body2" sx={{ color: NEUTRAL[600], fontSize: 13, mt: 0.25 }}>
                {step.body}
              </Typography>
            ) : null}
            {step.bullets?.length ? (
              <Box component="ul" sx={{ m: 0, pl: 2, mt: 0.5 }}>
                {step.bullets.map((b) => (
                  <Typography
                    component="li"
                    key={b}
                    variant="body2"
                    sx={{ color: NEUTRAL[600], fontSize: 12.5 }}
                  >
                    {b}
                  </Typography>
                ))}
              </Box>
            ) : null}
          </Box>
        </Box>
      ))}
    </Box>
  );
}
