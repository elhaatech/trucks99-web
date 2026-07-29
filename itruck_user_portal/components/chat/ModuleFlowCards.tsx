"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import SellOutlinedIcon from "@mui/icons-material/SellOutlined";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import RocketLaunchOutlinedIcon from "@mui/icons-material/RocketLaunchOutlined";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import type { ModuleFlow } from "@/types/moduleFlow";
import { NEUTRAL, PRIMARY, GRADIENT } from "@/lib/theme";

type Props = {
  flows: ModuleFlow[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
};

const CATEGORY_META: Record<
  string,
  { icon: React.ReactNode; color: string; blurb: string }
> = {
  Sell: {
    icon: <SellOutlinedIcon fontSize="small" />,
    color: "#5c4d96",
    blurb: "Post, edit, delete, renew, and manage visibility",
  },
  Buy: {
    icon: <ShoppingBagOutlinedIcon fontSize="small" />,
    color: "#c2185b",
    blurb: "Search, offer, favorites, chat, and purchase",
  },
  Grow: {
    icon: <RocketLaunchOutlinedIcon fontSize="small" />,
    color: "#2563eb",
    blurb: "Featured packages, payments, and seller offers",
  },
  Guide: {
    icon: <MenuBookOutlinedIcon fontSize="small" />,
    color: "#64748b",
    blurb: "General marketplace help",
  },
};

/**
 * Visual catalog of Buy & Sell module flows.
 * Content comes from /api/assistant/flows (knowledge base) — not hardcoded copy.
 */
export function ModuleFlowCards({ flows, onSelect, disabled }: Props) {
  const [activeCategory, setActiveCategory] = useState<string>("Sell");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const set = new Set(flows.map((f) => f.category || "Guide"));
    const order = ["Sell", "Buy", "Grow", "Guide"];
    return order.filter((c) => set.has(c)).concat([...set].filter((c) => !order.includes(c)));
  }, [flows]);

  const visible = useMemo(
    () => flows.filter((f) => (f.category || "Guide") === activeCategory),
    [flows, activeCategory],
  );

  if (!flows.length) return null;

  return (
    <Box sx={{ width: "100%", maxWidth: 720, mx: "auto", textAlign: "left" }}>
      <Typography
        variant="subtitle2"
        sx={{ color: NEUTRAL[500], fontWeight: 700, mb: 1, letterSpacing: 0.3 }}
      >
        HOW EACH FLOW WORKS
      </Typography>

      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mb: 1.5 }}>
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat] || CATEGORY_META.Guide;
          const selected = activeCategory === cat;
          return (
            <Chip
              key={cat}
              icon={<>{meta.icon}</>}
              label={cat}
              clickable
              onClick={() => {
                setActiveCategory(cat);
                setExpandedId(null);
              }}
              sx={{
                fontWeight: 700,
                bgcolor: selected ? meta.color : NEUTRAL[50],
                color: selected ? "#fff" : NEUTRAL[700],
                border: `1px solid ${selected ? meta.color : NEUTRAL[200]}`,
                "& .MuiChip-icon": { color: selected ? "#fff" : meta.color },
              }}
            />
          );
        })}
      </Stack>

      <Typography variant="caption" sx={{ color: NEUTRAL[500], display: "block", mb: 1.25 }}>
        {(CATEGORY_META[activeCategory] || CATEGORY_META.Guide).blurb}
      </Typography>

      <Stack spacing={1}>
        {visible.map((flow) => {
          const open = expandedId === flow.id;
          const meta = CATEGORY_META[flow.category] || CATEGORY_META.Guide;
          return (
            <Box
              key={flow.id}
              sx={{
                border: `1px solid ${NEUTRAL[200]}`,
                borderRadius: 2.5,
                bgcolor: "#fff",
                overflow: "hidden",
                transition: "box-shadow 0.2s ease",
                boxShadow: open ? "0 8px 24px rgba(15,23,42,0.08)" : "none",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  px: 1.5,
                  py: 1.25,
                  cursor: "pointer",
                }}
                onClick={() => setExpandedId(open ? null : flow.id)}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    flexShrink: 0,
                    display: "grid",
                    placeItems: "center",
                    bgcolor: `${meta.color}14`,
                    color: meta.color,
                  }}
                >
                  {meta.icon}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={700} fontSize={14} noWrap>
                    {flow.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {flow.stepCount} steps · tap to preview
                  </Typography>
                </Box>
                <Button
                  size="small"
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(flow.prompt);
                  }}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    borderRadius: 999,
                    px: 1.5,
                    background: GRADIENT,
                    color: "#fff",
                    "&:hover": { filter: "brightness(1.05)" },
                  }}
                >
                  Ask
                </Button>
              </Box>

              <Collapse in={open}>
                <Box sx={{ px: 1.5, pb: 1.5, pt: 0.25 }}>
                  {flow.intro ? (
                    <Typography variant="body2" sx={{ color: NEUTRAL[600], mb: 1.25 }}>
                      {flow.intro}
                    </Typography>
                  ) : null}

                  <Stack spacing={1}>
                    {flow.steps.map((step) => (
                      <Box
                        key={`${flow.id}-${step.order}`}
                        sx={{
                          display: "flex",
                          gap: 1.25,
                          alignItems: "flex-start",
                        }}
                      >
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            flexShrink: 0,
                            mt: 0.15,
                            display: "grid",
                            placeItems: "center",
                            bgcolor: PRIMARY,
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: 800,
                          }}
                        >
                          {step.order}
                        </Box>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography fontWeight={700} fontSize={13}>
                            {step.title}
                          </Typography>
                          {step.body ? (
                            <Typography variant="body2" sx={{ color: NEUTRAL[600], fontSize: 13 }}>
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
                  </Stack>
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}
