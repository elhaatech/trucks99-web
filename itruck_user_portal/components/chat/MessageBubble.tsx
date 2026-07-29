"use client";

import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import type { AssistantAction, AssistantMessage } from "@/types/assistant";
import {
  parseAssistantMarkdown,
  splitBoldSegments,
} from "@/utils/assistant/messageFormatter";
import { QuickActions } from "./QuickActions";
import { FlowStepTimeline } from "./FlowStepTimeline";
import { GRADIENT, NEUTRAL, PRIMARY } from "@/lib/theme";

type Props = {
  message: AssistantMessage;
  onQuickReply: (value: string) => void;
  onAction: (action: AssistantAction) => void;
  disabled?: boolean;
};

function RichText({ text }: { text: string }) {
  return (
    <>
      {splitBoldSegments(text).map((seg, i) => (
        <Box key={i} component="span" sx={{ fontWeight: seg.bold ? 700 : 400 }}>
          {seg.text}
        </Box>
      ))}
    </>
  );
}

/** Detect numbered guide steps like "1. **Login** …" for timeline UI */
function isNumberedGuideList(block: { type: string; ordered?: boolean; items?: string[] }) {
  return block.type === "list" && block.ordered && (block.items?.length || 0) >= 3;
}

export function MessageBubble({
  message,
  onQuickReply,
  onAction,
  disabled,
}: Props) {
  const isUser = message.role === "user";
  const blocks = isUser
    ? [{ type: "paragraph" as const, text: message.content }]
    : parseAssistantMarkdown(message.content);
  const time = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  const isGuide = Boolean(message.meta?.intent?.startsWith?.("buy_sell."));
  const flowSteps = Array.isArray(
    (message.meta?.data as { steps?: unknown } | undefined)?.steps,
  )
    ? (
        message.meta!.data as {
          steps: Array<{
            order: number;
            title: string;
            body?: string;
            bullets?: string[];
          }>;
        }
      ).steps
    : null;

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        mb: 1.5,
        px: { xs: 1.5, md: 2 },
        animation: "assistantFadeIn 0.25s ease",
        "@keyframes assistantFadeIn": {
          from: { opacity: 0, transform: "translateY(6px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      }}
    >
      <Box sx={{ maxWidth: { xs: "94%", md: isGuide ? "85%" : "75%" } }}>
        <Paper
          elevation={0}
          sx={{
            px: 1.75,
            py: 1.25,
            borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            bgcolor: isUser ? undefined : NEUTRAL[50],
            background: isUser ? GRADIENT : undefined,
            color: isUser ? "#fff" : NEUTRAL[900],
            border: isUser ? "none" : `1px solid ${NEUTRAL[200]}`,
          }}
        >
          {flowSteps?.length ? (
            <>
              {blocks
                .filter((b) => b.type === "heading" || b.type === "paragraph")
                .slice(0, 2)
                .map((block, idx) => {
                  if (block.type === "heading") {
                    return (
                      <Typography key={idx} fontWeight={800} sx={{ mb: 0.75, fontSize: 16 }}>
                        {block.text}
                      </Typography>
                    );
                  }
                  return (
                    <Typography key={idx} variant="body2" sx={{ mb: 1, color: NEUTRAL[600] }}>
                      <RichText text={block.text} />
                    </Typography>
                  );
                })}
              <FlowStepTimeline title="" steps={flowSteps} />
              {blocks
                .filter(
                  (b) =>
                    b.type === "paragraph" &&
                    /tips|note/i.test((b as { text: string }).text || ""),
                )
                .map((block, idx) => (
                  <Typography key={`tip-${idx}`} variant="body2" sx={{ mt: 1 }}>
                    <RichText text={(block as { text: string }).text} />
                  </Typography>
                ))}
            </>
          ) : (
            blocks.map((block, idx) => {
            if (block.type === "heading") {
              return (
                <Typography
                  key={idx}
                  variant={block.level === 1 ? "h6" : "subtitle1"}
                  fontWeight={800}
                  sx={{ mb: 1 }}
                >
                  {block.text}
                </Typography>
              );
            }

            if (isNumberedGuideList(block)) {
              return (
                <Box key={idx} sx={{ my: 1 }}>
                  {block.items!.map((item, j) => (
                    <Box
                      key={j}
                      sx={{
                        display: "flex",
                        gap: 1.25,
                        alignItems: "flex-start",
                        mb: 1.1,
                        position: "relative",
                        "&::before":
                          j < block.items!.length - 1
                            ? {
                                content: '""',
                                position: "absolute",
                                left: 11,
                                top: 26,
                                bottom: -8,
                                width: 2,
                                bgcolor: "rgba(92,77,150,0.2)",
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
                        {j + 1}
                      </Box>
                      <Typography variant="body2" sx={{ pt: 0.15, lineHeight: 1.45 }}>
                        <RichText text={item} />
                      </Typography>
                    </Box>
                  ))}
                </Box>
              );
            }

            if (block.type === "list") {
              return (
                <Box
                  key={idx}
                  component={block.ordered ? "ol" : "ul"}
                  sx={{ m: 0, pl: 2.25, mb: 0.75 }}
                >
                  {block.items.map((item, j) => (
                    <Typography component="li" key={j} variant="body2" sx={{ mb: 0.35 }}>
                      <RichText text={item} />
                    </Typography>
                  ))}
                </Box>
              );
            }

            if (block.type === "code") {
              return (
                <Box
                  key={idx}
                  component="pre"
                  sx={{
                    m: 0,
                    mb: 1,
                    p: 1.25,
                    borderRadius: 1.5,
                    bgcolor: isUser ? "rgba(0,0,0,0.2)" : NEUTRAL[900],
                    color: "#e2e8f0",
                    overflow: "auto",
                    fontSize: 12,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  }}
                >
                  {block.text}
                </Box>
              );
            }

            if (block.type === "table") {
              return (
                <Box key={idx} sx={{ overflowX: "auto", mb: 1 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        {block.headers.map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 700, py: 0.5 }}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {block.rows.map((row, rIdx) => (
                        <TableRow key={rIdx}>
                          {row.map((cell, cIdx) => (
                            <TableCell key={cIdx} sx={{ py: 0.5 }}>
                              {cell}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              );
            }

            return (
              <Typography
                key={idx}
                variant="body2"
                sx={{ mb: 0.5, whiteSpace: "pre-wrap" }}
              >
                <RichText text={block.text} />
              </Typography>
            );
          })
          )}
        </Paper>

        {!isUser && (
          <QuickActions
            quickReplies={message.meta?.quickReplies}
            actions={message.meta?.actions}
            onQuickReply={onQuickReply}
            onAction={onAction}
            disabled={disabled}
          />
        )}

        {time && (
          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 0.5,
              color: NEUTRAL[400],
              textAlign: isUser ? "right" : "left",
              px: 0.5,
            }}
          >
            {time}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
