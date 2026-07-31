"use client";

import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import type { AssistantAction, AssistantQuickReply } from "@/types/assistant";
import { PRIMARY, NEUTRAL, PRIMARY_DARK } from "@/lib/theme";
import { alpha } from "@mui/material/styles";

type Props = {
  quickReplies?: AssistantQuickReply[];
  actions?: AssistantAction[];
  onQuickReply: (value: string) => void;
  onAction: (action: AssistantAction) => void;
  disabled?: boolean;
};

export function QuickActions({
  quickReplies = [],
  actions = [],
  onQuickReply,
  onAction,
  disabled,
}: Props) {
  if (!quickReplies.length && !actions.length) return null;

  return (
    <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mt: 1.25 }}>
      {actions.map((action, idx) => (
        <Button
          key={`a-${idx}-${action.type}`}
          size="small"
          variant="contained"
          disabled={disabled}
          onClick={() => onAction(action)}
          sx={{
            textTransform: "none",
            borderRadius: 999,
            background: PRIMARY,
            boxShadow: "none",
            "&:hover": { boxShadow: "none", bgcolor: PRIMARY_DARK },
          }}
        >
          {action.label}
        </Button>
      ))}
      {quickReplies.map((qr) => (
        <Button
          key={`${qr.label}-${qr.value}`}
          size="small"
          variant="outlined"
          disabled={disabled}
          onClick={() => onQuickReply(qr.value)}
          sx={{
            textTransform: "none",
            borderRadius: 999,
            borderColor: NEUTRAL[300],
            color: NEUTRAL[800],
            bgcolor: "#fff",
            "&:hover": { borderColor: PRIMARY, bgcolor: alpha(PRIMARY, 0.06) },
          }}
        >
          {qr.label}
        </Button>
      ))}
    </Stack>
  );
}
