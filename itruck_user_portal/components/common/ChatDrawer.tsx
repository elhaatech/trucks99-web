"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Avatar from "@mui/material/Avatar";
import CircularProgress from "@mui/material/CircularProgress";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import {
  createOrGetChatRoom,
  getChatMessages,
  sendChatMessage,
  type ChatMessage,
  type ChatRoom,
} from "@/model/services/chatapi";
import { notifyMarketplaceChatChanged } from "@/lib/marketplaceAuth";
import { useMarketplaceAuthOptional } from "@/components/marketplace/MarketplaceAuthProvider";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Render inline panel instead of right drawer (marketplace chat page). */
  embedded?: boolean;
  /** Buyer flow: pass the product being viewed. The room is created/fetched automatically. */
  productId?: string;
  /** Seller / inbox flow: pass an existing room id directly, skips the create-room step. */
  roomId?: string;
  currentUserId?: string | null;
};

const POLL_INTERVAL_MS = 4000;

function formatDateLabel(dateStr: string) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export function ChatDrawer({ open, onClose, embedded = false, productId, roomId, currentUserId }: Props) {
  const auth = useMarketplaceAuthOptional();
  const isAuthenticated = auth ? auth.isLoggedIn : true;
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMessages = useCallback(async (id: string, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await getChatMessages(id);
      setRoom((prev) => {
        const nextId = data.room.roomId ?? data.room._id;
        const prevId = prev?.roomId ?? prev?._id;
        return prevId === nextId ? prev : data.room;
      });
      setMessages((prev) => {
        const prevLast = prev[prev.length - 1]?._id ?? prev[prev.length - 1]?.id;
        const nextLast =
          data.messages[data.messages.length - 1]?._id ??
          data.messages[data.messages.length - 1]?.id;
        if (prev.length === data.messages.length && prevLast === nextLast) return prev;
        return data.messages;
      });
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : "Failed to load chat");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Open the conversation whenever the drawer opens — either by resolving
  // productId into a room (buyer flow) or loading an existing roomId directly
  // (seller / inbox flow).
  useEffect(() => {
    if (!open || !isAuthenticated) return;
    if (!productId && !roomId) return;

    let cancelled = false;
    setError("");
    setLoading(true);

    (async () => {
      try {
        let activeRoomId = roomId ?? null;

        if (!activeRoomId && productId) {
          const res = await createOrGetChatRoom(productId);
          if (cancelled) return;
          setRoom(res.room);
          activeRoomId = res.room.roomId ?? res.room._id;
          notifyMarketplaceChatChanged();
        }

        if (activeRoomId) {
          await loadMessages(activeRoomId);
          notifyMarketplaceChatChanged();
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load chat");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, isAuthenticated, productId, roomId, loadMessages]);

  // Poll for new messages while open (placeholder until Socket.IO is wired up).
  const activePollRoomId = room?.roomId ?? room?._id ?? null;
  useEffect(() => {
    if (!open || !isAuthenticated || !activePollRoomId) return;
    pollRef.current = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      void loadMessages(activePollRoomId, true);
    }, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [open, isAuthenticated, activePollRoomId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset local state whenever the drawer is closed so the next open starts clean.
  useEffect(() => {
    if (!open) {
      setRoom(null);
      setMessages([]);
      setDraft("");
      setError("");
    }
  }, [open]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !room) return;
    setSending(true);
    setDraft("");
    try {
      const activeRoomId = room.roomId ?? room._id;
      const res = await sendChatMessage(activeRoomId, text);
      setMessages((prev) => [...prev, res.chatMessage]);
      setRoom(res.room);
      notifyMarketplaceChatChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const otherParty =
    room && currentUserId && String(room.sellerId) === String(currentUserId)
      ? room.buyer
      : room?.seller;

  const panel = (
    <Box
      sx={{
        width: embedded ? "100%" : { xs: "min(380px, 100%)", sm: 380 },
        display: "flex",
        flexDirection: "column",
        height: embedded ? "100%" : "100%",
        minWidth: 0,
        minHeight: embedded ? 480 : undefined,
      }}
    >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: { xs: 1.5, sm: 2 },
            borderBottom: "1px solid",
            borderColor: "grey.200",
            bgcolor: "background.paper",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar sx={{ width: 40, height: 40, bgcolor: "primary.main" }}>
              {(otherParty?.name || "?").charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>
                {otherParty?.name || "Chat"}
              </Typography>
              {room?.product && (
                <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 220, display: "block" }}>
                  {room.product.title || room.product.bsNumber || "Listing"}
                </Typography>
              )}
            </Box>
          </Box>
          {!embedded ? (
            <IconButton onClick={onClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Box>

        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
            bgcolor: "grey.100",
          }}
        >
          {loading && messages.length === 0 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          {error && (
            <Typography variant="caption" color="error">
              {error}
            </Typography>
          )}
          {messages.map((msg, idx) => {
            const mine = String(msg.senderId) === String(currentUserId);
            const prev = messages[idx - 1];
            const next = messages[idx + 1];

            const prevSameSender = prev && String(prev.senderId) === String(msg.senderId);
            const nextSameSender = next && String(next.senderId) === String(msg.senderId);

            const showDateDivider =
              !prev || formatDateLabel(prev.createdAt) !== formatDateLabel(msg.createdAt);

            // First bubble in a run gets a rounder top corner on the "pointer"
            // side; last bubble in a run gets the tail. Middle bubbles are flat
            // on that side, mimicking WhatsApp/iMessage grouped bubbles.
            const tailCorner = mine ? "borderBottomRightRadius" : "borderBottomLeftRadius";
            const topCorner = mine ? "borderTopRightRadius" : "borderTopLeftRadius";

            return (
              <Box key={msg._id || msg.id}>
                {showDateDivider && (
                  <Box sx={{ display: "flex", justifyContent: "center", my: 1.5 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        px: 1.5,
                        py: 0.4,
                        borderRadius: 5,
                        bgcolor: "rgba(0,0,0,0.06)",
                        color: "text.secondary",
                        fontWeight: 600,
                      }}
                    >
                      {formatDateLabel(msg.createdAt)}
                    </Typography>
                  </Box>
                )}

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: mine ? "flex-end" : "flex-start",
                    alignItems: "flex-end",
                    gap: 0.75,
                    mt: prevSameSender ? 0.25 : 1,
                  }}
                >
                  {/* Avatar only for the other party, only on the last bubble of a run */}
                  {!mine && (
                    <Avatar
                      sx={{
                        width: 24,
                        height: 24,
                        fontSize: 12,
                        bgcolor: "primary.light",
                        visibility: nextSameSender ? "hidden" : "visible",
                      }}
                    >
                      {(otherParty?.name || "?").charAt(0).toUpperCase()}
                    </Avatar>
                  )}

                  <Box
                    sx={{
                      maxWidth: "72%",
                      px: 1.5,
                      py: 0.9,
                      borderRadius: 2.5,
                      [topCorner]: prevSameSender ? 6 : 20,
                      [tailCorner]: nextSameSender ? 6 : 4,
                      bgcolor: mine ? "primary.main" : "background.paper",
                      color: mine ? "primary.contrastText" : "text.primary",
                      boxShadow: mine ? "none" : "0 1px 2px rgba(0,0,0,0.08)",
                    }}
                  >
                    <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                      {msg.message}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        opacity: mine ? 0.85 : 0.6,
                        display: "block",
                        textAlign: "right",
                        mt: 0.25,
                        fontSize: 10,
                      }}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            );
          })}
          <div ref={bottomRef} />
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: { xs: 1, sm: 1.5 },
            borderTop: "1px solid",
            borderColor: "grey.200",
            bgcolor: "background.paper",
          }}
        >
          <TextField
            fullWidth
            size="small"
            placeholder="Type a message…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={!room || sending}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 5,
                bgcolor: "grey.100",
                "& fieldset": { border: "none" },
              },
            }}
          />
          <IconButton
            onClick={handleSend}
            disabled={!draft.trim() || sending}
            sx={{
              bgcolor: draft.trim() ? "primary.main" : "grey.200",
              color: draft.trim() ? "primary.contrastText" : "grey.500",
              "&:hover": { bgcolor: draft.trim() ? "primary.dark" : "grey.300" },
              transition: "background-color 0.15s ease",
            }}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </Box>
    </Box>
  );

  if (embedded) {
    return open ? panel : null;
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      {panel}
    </Drawer>
  );
}