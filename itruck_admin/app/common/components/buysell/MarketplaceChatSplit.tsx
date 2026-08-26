"use client";

import { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";
import { ChatDrawer } from "@/components/common/ChatDrawer";
import { getChatList, type ChatRoom } from "@/model/services/chatapi";
import { getCurrentUser } from "@/model/services/user";
import type { User } from "@/model/services/user";
import { formatProductPrice } from "./utils";

const POLL_INTERVAL_MS = 8000;

function extractId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "_id" in value) {
    const inner = (value as { _id?: unknown })._id;
    return inner ? String(inner) : null;
  }
  return String(value);
}

function roomsFingerprint(rooms: ChatRoom[]): string {
  return rooms
    .map((r) => `${r.roomId ?? r._id}:${r.unreadCount ?? 0}:${r.lastMessageAt ?? ""}:${r.lastMessage ?? ""}`)
    .join("|");
}

export function MarketplaceChatSplit() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  const loadRooms = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await getChatList();
      setRooms((prev) => (roomsFingerprint(prev) === roomsFingerprint(data) ? prev : data));
      setActiveRoomId((prev) => prev ?? data[0]?.roomId ?? data[0]?._id ?? null);
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : "Failed to load chats");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    getCurrentUser()
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    void loadRooms();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      void loadRooms(true);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadRooms]);

  const currentUserId = extractId(
    (currentUser as { _id?: unknown; id?: unknown })?._id ??
      (currentUser as { _id?: unknown; id?: unknown })?.id ??
      null,
  );

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "340px 1fr" },
        minHeight: { xs: 520, md: 640 },
        borderRadius: T.radius.lg,
        border: `1px solid ${T.color.border}`,
        bgcolor: T.color.surface,
        overflow: "hidden",
        boxShadow: T.shadow.card,
      }}
    >
      <Box
        sx={{
          borderRight: { md: `1px solid ${T.color.border}` },
          display: "flex",
          flexDirection: "column",
          maxHeight: { md: 640 },
        }}
      >
        <Box sx={{ px: 2.5, py: 2, borderBottom: `1px solid ${T.color.border}` }}>
          <Typography sx={{ fontWeight: 700, fontSize: 16 }}>Messages</Typography>
          <Typography sx={{ fontSize: 13, color: T.color.textSecondary }}>
            Conversations about your listings
          </Typography>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto" }}>
          {error ? (
            <Alert severity="error" sx={{ m: 2 }} onClose={() => setError("")}>
              {error}
            </Alert>
          ) : null}

          {loading && rooms.length === 0 ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={28} />
            </Box>
          ) : rooms.length === 0 ? (
            <Typography sx={{ p: 3, color: T.color.textSecondary, fontSize: 14 }}>
              No conversations yet.
            </Typography>
          ) : (
            rooms.map((room) => {
              const isSeller = String(room.sellerId) === String(currentUserId);
              const otherParty = isSeller ? room.buyer : room.seller;
              const roomId = room.roomId ?? room._id;
              const selected = activeRoomId === roomId;
              const hasUnread = room.unreadCount > 0;

              return (
                <Box
                  key={roomId}
                  onClick={() => setActiveRoomId(roomId)}
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 1.5,
                    px: 2,
                    py: 1.75,
                    cursor: "pointer",
                    borderBottom: `1px solid ${T.color.border}`,
                    bgcolor: selected ? "rgba(37,99,235,0.06)" : hasUnread ? T.color.surfaceMuted : T.color.surface,
                    borderLeft: selected ? `3px solid ${INFO}` : "3px solid transparent",
                    "&:hover": { bgcolor: "rgba(37,99,235,0.04)" },
                  }}
                >
                  <Avatar sx={{ width: 44, height: 44, bgcolor: T.color.border, color: T.color.textSecondary }}>
                    {(otherParty?.name || "?").charAt(0).toUpperCase()}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                      <Typography sx={{ fontWeight: hasUnread ? 700 : 600, fontSize: 14 }} noWrap>
                        {otherParty?.name || "Unknown"}
                        <Typography component="span" sx={{ fontSize: 12, color: T.color.textMuted, ml: 0.5 }}>
                          ({isSeller ? "buyer" : "seller"})
                        </Typography>
                      </Typography>
                      {room.lastMessageAt ? (
                        <Typography sx={{ fontSize: 11, color: T.color.textMuted, flexShrink: 0 }}>
                          {new Date(room.lastMessageAt).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Typography>
                      ) : null}
                    </Box>
                    <Typography sx={{ fontSize: 12.5, color: T.color.textSecondary }} noWrap>
                      {room.product?.title || room.product?.bsNumber || "Listing"}
                    </Typography>
                    <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mt: 0.35 }}>
                      <Typography
                        sx={{
                          fontSize: 13,
                          color: T.color.textSecondary,
                          fontWeight: hasUnread ? 600 : 400,
                        }}
                        noWrap
                      >
                        {room.lastMessage || "No messages yet"}
                      </Typography>
                      {room.product?.price != null ? (
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: INFO, flexShrink: 0 }}>
                          {formatProductPrice(Number(room.product.price))}
                        </Typography>
                      ) : null}
                    </Box>
                  </Box>
                </Box>
              );
            })
          )}
        </Box>
      </Box>

      <Box sx={{ display: { xs: activeRoomId ? "flex" : "none", md: "flex" }, flexDirection: "column", minHeight: 480 }}>
        {activeRoomId ? (
          <ChatDrawer
            embedded
            open
            onClose={() => setActiveRoomId(null)}
            roomId={activeRoomId}
            currentUserId={currentUserId}
          />
        ) : (
          <Box
            sx={{
              flex: 1,
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              justifyContent: "center",
              color: T.color.textMuted,
              p: 4,
              textAlign: "center",
            }}
          >
            <Typography>Select a conversation to start chatting</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
