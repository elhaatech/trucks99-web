"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import { NEUTRAL, PRIMARY } from "@/lib/theme";

type Props = {
  onSend: (value: string) => void | Promise<unknown>;
  disabled?: boolean;
  placeholder?: string;
};

export function ChatInput({
  onSend,
  disabled,
  placeholder = "Ask about listings, search inventory, or create a sell listing…",
}: Props) {
  const [value, setValue] = useState("");

  const submit = async () => {
    const text = value.trim();
    if (!text || disabled) return;
    setValue("");
    await onSend(text);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  return (
    <Box
      component="form"
      onSubmit={onSubmit}
      sx={{
        display: "flex",
        gap: 1,
        alignItems: "flex-end",
        px: { xs: 1.5, md: 2 },
        py: 1.5,
        borderTop: `1px solid ${NEUTRAL[200]}`,
        bgcolor: "#fff",
      }}
    >
      <TextField
        fullWidth
        multiline
        maxRows={5}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        size="small"
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: 3,
            bgcolor: NEUTRAL[50],
          },
        }}
      />
      <IconButton
        type="submit"
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        sx={{
          bgcolor: PRIMARY,
          color: "#fff",
          width: 44,
          height: 44,
          "&:hover": { bgcolor: "#1D4ED8" },
          "&.Mui-disabled": { bgcolor: NEUTRAL[200], color: NEUTRAL[400] },
        }}
      >
        <SendRoundedIcon />
      </IconButton>
    </Box>
  );
}
