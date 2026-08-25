"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import { PageHeader } from "@/components/ui";
import { ChatDrawer } from "@/components/common/ChatDrawer";
import { BuySellImage } from "@/components/common/BuySellImage";
import { getChatList, type ChatRoom } from "@/model/services/chatapi";
import { useMarketplaceAuthOptional } from "@/components/marketplace/MarketplaceAuthProvider";
import { MARKETPLACE_CHAT_CHANGED_EVENT } from "@/lib/marketplaceAuth";

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

type Props = {
  /** When provided, room clicks are delegated to the parent (e.g. so the
   *  parent can close a wrapping Dialog before opening ChatDrawer, avoiding
   *  the Drawer being trapped behind the Dialog's backdrop). When omitted,
   *  ChatInboxPage manages its own ChatDrawer — used by the standalone
   *  /chat route. */
  onSelectRoom?: (roomId: string) => void;
  /** Hide the page title when the inbox is already wrapped (navbar dialog). */
  hideHeader?: boolean;
};

export default function ChatInboxPage({ onSelectRoom, hideHeader = false }: Props) {
  const auth = useMarketplaceAuthOptional();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const roomsKeyRef = useRef("");

  const loadRooms = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await getChatList();
      const key = roomsFingerprint(data);
      if (roomsKeyRef.current !== key) {
        roomsKeyRef.current = key;
        setRooms(data);
      }
    } catch (err) {
      if (!silent) setError(err instanceof Error ? err.message : "Failed to load chats");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRooms();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void loadRooms(true);
    };
    const onChatChanged = () => {
      void loadRooms(true);
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener(MARKETPLACE_CHAT_CHANGED_EVENT, onChatChanged);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(MARKETPLACE_CHAT_CHANGED_EVENT, onChatChanged);
    };
  }, [loadRooms]);

  const currentUser = auth?.user ?? null;
  const currentUserId =
    auth?.userId ??
    extractId(
      (currentUser as unknown as { _id?: unknown; id?: unknown })?._id ??
        (currentUser as unknown as { _id?: unknown; id?: unknown })?.id ??
        null,
    );

  return (
    <Box>
      {hideHeader ? null : (
        <PageHeader title="Messages" subtitle="Conversations about your buy/sell listings" />
      )}

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && rooms.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
          <CircularProgress size={28} />
        </Box>
      ) : rooms.length === 0 ? (
        <Typography color="text.secondary" sx={{ mt: 3 }}>
          No conversations yet.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 2 }}>
          {rooms.map((room) => {
            const isSeller = String(room.sellerId) === String(currentUserId);
            const otherParty = isSeller ? room.buyer : room.seller;
            const roomId = room.roomId ?? room._id;
            const hasUnread = room.unreadCount > 0;

            return (
              <Box
                key={roomId}
                onClick={() =>
                  onSelectRoom ? onSelectRoom(roomId) : setActiveRoomId(roomId)
                }
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  p: 1.5,
                  borderRadius: 1,
                  border: "1px solid",
                  borderColor: "grey.200",
                  cursor: "pointer",
                  bgcolor: hasUnread ? "primary.50" : "background.paper",
                  "&:hover": { bgcolor: "grey.50" },
                }}
              >
                {/* Product image thumbnail */}
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 1,
                    overflow: "hidden",
                    border: "1px solid",
                    borderColor: "grey.200",
                    flexShrink: 0,
                  }}
                >
                  <BuySellImage
                    src={room.product?.image}
                    alt={room.product?.title || "Product"}
                  />
                </Box>

                {/* Other user avatar with unread badge */}
                <Badge badgeContent={room.unreadCount} color="primary">
                  <Avatar>{(otherParty?.name || "?").charAt(0).toUpperCase()}</Avatar>
                </Badge>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                    <Typography variant="subtitle2" fontWeight={600} noWrap>
                      {otherParty?.name || "Unknown user"}
                      <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        ({isSeller ? "buyer" : "seller"})
                      </Typography>
                    </Typography>
                    {room.lastMessageAt && (
                      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0 }}>
                        {new Date(room.lastMessageAt).toLocaleString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Typography>
                    )}
                  </Box>

                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {room.product?.title || room.product?.bsNumber || "Listing"}
                    </Typography>
                    {room.product?.price != null && (
                      <Typography variant="body2" fontWeight={600} color="primary.main" sx={{ flexShrink: 0 }}>
                        ₹{Number(room.product.price).toLocaleString("en-IN")}
                      </Typography>
                    )}
                  </Box>

                  <Typography
                    variant="body2"
                    noWrap
                    sx={{ fontWeight: hasUnread ? 600 : 400 }}
                  >
                    {room.lastMessage || "No messages yet"}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {!onSelectRoom && (
        <ChatDrawer
          open={!!activeRoomId}
          onClose={() => {
            setActiveRoomId(null);
            loadRooms(true); // refresh unread counts after closing
          }}
          roomId={activeRoomId ?? undefined}
          currentUserId={currentUserId}
        />
      )}
    </Box>
  );
}