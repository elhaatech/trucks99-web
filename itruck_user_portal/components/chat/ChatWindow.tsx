"use client";

import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import type { AssistantAction, AssistantMessage } from "@/types/assistant";
import type { ModuleFlow } from "@/types/moduleFlow";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { EmptyState } from "./EmptyState";
import { SuggestedQuestions } from "./SuggestedQuestions";
import { NEUTRAL } from "@/lib/theme";

type Props = {
  messages: AssistantMessage[];
  loading?: boolean;
  sending?: boolean;
  error?: string | null;
  suggestions: string[];
  flows?: ModuleFlow[];
  onSend: (value: string) => void | Promise<unknown>;
  onAction: (action: AssistantAction) => void;
  showEmpty?: boolean;
};

export function ChatWindow({
  messages,
  loading,
  sending,
  error,
  suggestions,
  flows = [],
  onSend,
  onAction,
  showEmpty,
}: Props) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "#fff",
      }}
    >
      {error && (
        <Alert severity="error" sx={{ m: 1.5, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ flex: 1, overflowY: "auto", py: 1.5 }}>
        {loading ? (
          <Box sx={{ display: "grid", placeItems: "center", height: "100%" }}>
            <CircularProgress size={28} />
          </Box>
        ) : showEmpty && messages.length === 0 ? (
          <EmptyState
            suggestions={suggestions}
            flows={flows}
            onSelect={(v) => void onSend(v)}
            disabled={sending}
          />
        ) : (
          <>
            {messages.map((m) => (
              <MessageBubble
                key={m._id}
                message={m}
                onQuickReply={(v) => void onSend(v)}
                onAction={onAction}
                disabled={sending}
              />
            ))}
            {sending && (
              <Box sx={{ px: { xs: 1.5, md: 2 }, mb: 1.5 }}>
                <TypingIndicator />
              </Box>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </Box>

      {!showEmpty && messages.length > 0 && (
        <SuggestedQuestions
          items={
            lastAssistant?.meta?.quickReplies?.length
              ? []
              : suggestions.slice(0, 4)
          }
          onSelect={(v) => void onSend(v)}
          disabled={sending}
        />
      )}

      <ChatInput onSend={onSend} disabled={sending || loading} />
    </Box>
  );
}
