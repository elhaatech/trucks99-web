"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import FormControlLabel from "@mui/material/FormControlLabel";
import Checkbox from "@mui/material/Checkbox";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import {
  MODULES_TEMPLATE,
  MODULE_LABELS,
  type ModulesState,
} from "@/lib/modules";
import { PRIMARY } from "@/lib/theme";

function ExpandIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
    >
      <path d="M7 10l5 5 5-5z" />
    </svg>
  );
}

export interface ModulesSelectorProps {
  value: ModulesState;
  onChange: (value: ModulesState) => void;
  disabled?: boolean;
  error?: boolean;
  helperText?: string;
}

export function ModulesSelector({
  value,
  onChange,
  disabled = false,
  error = false,
  helperText,
}: ModulesSelectorProps) {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set(Object.keys(MODULES_TEMPLATE)));

  const toggleModule = (moduleKey: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(moduleKey)) next.delete(moduleKey);
      else next.add(moduleKey);
      return next;
    });
  };

  const handleChange = (moduleKey: string, action: string, checked: boolean) => {
    const next = { ...value };
    if (!next[moduleKey]) next[moduleKey] = { ...MODULES_TEMPLATE[moduleKey as keyof typeof MODULES_TEMPLATE] };
    (next[moduleKey] as Record<string, boolean>)[action] = checked;
    onChange(next);
  };

  const selectedCount = React.useMemo(() => {
    let n = 0;
    for (const actions of Object.values(value)) {
      if (actions && typeof actions === "object") {
        n += Object.values(actions).filter(Boolean).length;
      }
    }
    return n;
  }, [value]);

  return (
    <Box>
      <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
        Modules <span style={{ color: "var(--mui-palette-error-main)" }}>*</span>
      </Typography>
      {helperText && (
        <Typography variant="caption" color={error ? "error" : "text.secondary"} sx={{ display: "block", mb: 1 }}>
          {helperText}
        </Typography>
      )}
      <Box
        sx={{
          border: "1px solid",
          borderColor: error ? "error.main" : "divider",
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "grey.50",
        }}
      >
        {Object.entries(MODULES_TEMPLATE).map(([moduleKey, actions]) => {
          const isExpanded = expanded.has(moduleKey);
          const moduleState = value[moduleKey] || {};
          const count = Object.entries(actions).filter(([a]) => moduleState[a]).length;
          const label = MODULE_LABELS[moduleKey] || moduleKey;

          return (
            <Box key={moduleKey}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  px: 2,
                  py: 1.25,
                  cursor: disabled ? "default" : "pointer",
                  "&:hover": disabled ? {} : { bgcolor: "grey.100" },
                  borderBottom: "1px solid",
                  borderColor: "divider",
                }}
                onClick={() => !disabled && toggleModule(moduleKey)}
              >
                <IconButton size="small" sx={{ mr: 1 }} disabled={disabled}>
                  <ExpandIcon open={isExpanded} />
                </IconButton>
                <Typography variant="body2" fontWeight={600} sx={{ flex: 1 }}>
                  {label}
                </Typography>
                {count > 0 && (
                  <Typography variant="caption" sx={{ color: PRIMARY, fontWeight: 600 }}>
                    {count} selected
                  </Typography>
                )}
              </Box>
              <Collapse in={isExpanded}>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, p: 2, pt: 0, bgcolor: "background.paper" }}>
                  {Object.keys(actions).map((action) => (
                    <FormControlLabel
                      key={action}
                      control={
                        <Checkbox
                          size="small"
                          checked={!!(moduleState as Record<string, boolean>)[action]}
                          onChange={(e) => handleChange(moduleKey, action, e.target.checked)}
                          disabled={disabled}
                          sx={{ color: PRIMARY, "&.Mui-checked": { color: PRIMARY } }}
                        />
                      }
                      label={
                        <Typography variant="caption" sx={{ textTransform: "capitalize" }}>
                          {action.replace(/_/g, " ")}
                        </Typography>
                      }
                    />
                  ))}
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
        {selectedCount} permission(s) selected. At least one is required.
      </Typography>
    </Box>
  );
}
