"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha, type Theme } from "@mui/material/styles";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@/model/api";
import { logout } from "@/model/api";
import { routes } from "@/lib/routes";
import { clearNavigationState } from "@/lib/navigation";
import {
  CloseRounded as CloseRoundedIcon,
  LogoutRounded as LogoutRoundedIcon,
  MarkChatUnreadOutlined as MarkChatUnreadOutlinedIcon,
  MenuRounded as MenuRoundedIcon,
  PersonOutlineRounded as PersonOutlineRoundedIcon,
  SettingsRounded as SettingsRoundedIcon,
} from "@mui/icons-material";
import { NotificationBell } from "./NotificationBell";
import { ChatDrawer } from "@/components/common/ChatDrawer";
import ChatInboxPage from "@/components/common/Chatinboxpage";
import { getChatList } from "@/model/services/chatapi";

export interface TopNavbarProps {
  user?: User | null;
  onMenuClick?: () => void;
}

const actionIconSx = {
  color: "text.secondary",
  borderRadius: "10px",
  transition: "all 150ms ease",
  "&:hover": {
    color: "primary.main",
    bgcolor: (t: Theme) => alpha(t.palette.primary.main, 0.08),
    transform: "translateY(-1px)",
  },
  "&:active": { transform: "scale(0.94)" },
} as const;

/** id may come back as a plain string/ObjectId, or as { _id, ... } — normalise
 *  to a plain string so it can be passed down to chat components reliably. */
function extractId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "_id" in value) {
    const inner = (value as { _id?: unknown })._id;
    return inner ? String(inner) : null;
  }
  return String(value);
}

export function TopNavbar({ user, onMenuClick }: TopNavbarProps) {
  const router = useRouter();
  const initial = user?.name?.[0]?.toUpperCase() ?? "U";
  const firstName = user?.name?.trim().split(" ")[0] ?? "User";
  const roleName = user?.role?.name ?? "";

  const currentUserId = extractId(
    (user as unknown as { _id?: unknown; id?: unknown })?._id ??
      (user as unknown as { _id?: unknown; id?: unknown })?.id ??
      null,
  );

  const [totalUnread, setTotalUnread] = useState(0);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const refreshUnread = React.useCallback(async () => {
    try {
      const rooms = await getChatList();
      const next = rooms.reduce((sum, r) => sum + (r.unreadCount || 0), 0);
      setTotalUnread((prev) => (prev === next ? prev : next));
    } catch {
      // ignore — badge just won't update this cycle
    }
  }, []);

  // Load once, then only when the tab is shown again (throttled) or inbox/chat is used.
  useEffect(() => {
    let lastAt = 0;
    const run = (force: boolean) => {
      const now = Date.now();
      if (!force && now - lastAt < 60_000) return;
      lastAt = now;
      void refreshUnread();
    };

    run(true);

    const onVisibility = () => {
      if (document.visibilityState === "visible") run(false);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [refreshUnread]);

  return (
    <AppBar
      position="sticky"
      elevation={0}
      color="inherit"
      sx={{
        bgcolor: alpha("#ffffff", 0.92),
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid",
        borderColor: "divider",
        px: { xs: 1.5, md: 2.5 },
        py: 0.75,
        mb: 0,
        boxShadow: (t) => t.tokens.shadow.navbar,
      }}
    >
      <Toolbar sx={{ minHeight: 64, px: 0, display: "flex", alignItems: "center", gap: 1.5 }}>
        {onMenuClick ? (
          <IconButton
            edge="start"
            color="inherit"
            aria-label="Open navigation menu"
            onClick={onMenuClick}
            sx={{ ...actionIconSx, mr: 0.5 }}
          >
            <MenuRoundedIcon />
          </IconButton>
        ) : null}

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: "10px",
              bgcolor: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "primary.contrastText",
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: "-0.02em",
              boxShadow: "0 6px 16px rgba(79,70,181,0.26)",
              flexShrink: 0,
            }}
          >
            iT
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.01em" }}>
              {roleName}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.25, lineHeight: 1.2 }}>
              Smart fleet and load management
            </Typography>
          </Box>
        </Box>

        <Box sx={{ flex: 1 }} />

        <Box sx={{ display: { xs: "none", md: "block" }, mr: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Welcome, <Box component="span" sx={{ color: "text.primary", fontWeight: 700 }}>{firstName}</Box>
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            p: 0.5,
            borderRadius: "12px",
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <NotificationBell />

          <Tooltip title="Messages">
            <IconButton
              size="small"
              onClick={() => {
                setInboxOpen(true);
                void refreshUnread();
              }}
              sx={actionIconSx}
            >
              <Badge badgeContent={totalUnread} color="error">
                <MarkChatUnreadOutlinedIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>

          <Tooltip title="Profile">
            <IconButton size="small" component={Link} href={routes.profile()} prefetch={false} sx={actionIconSx}>
              <PersonOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Settings">
            <IconButton size="small" component={Link} href={routes.settings()} prefetch={false} sx={actionIconSx}>
              <SettingsRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Logout">
            <IconButton
              size="small"
              onClick={async () => {
                try {
                  await logout();
                } finally {
                  clearNavigationState();
                  router.replace("/");
                }
              }}
              sx={actionIconSx}
            >
              <LogoutRoundedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Avatar
            component={Link}
            href={routes.profile()}
            prefetch={false}
            sx={{
              width: 34,
              height: 34,
              fontSize: 13,
              bgcolor: "primary.main",
              textDecoration: "none",
              cursor: "pointer",
              fontWeight: 700,
              ml: 0.25,
              border: "2px solid",
              borderColor: "background.paper",
            }}
          >
            {initial}
          </Avatar>
        </Box>
      </Toolbar>

      {/* ── Inbox dialog ── */}
      <Dialog
        open={inboxOpen}
        onClose={() => setInboxOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { height: "80vh" } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "grey.200",
          }}
        >
          Messages
          <IconButton onClick={() => setInboxOpen(false)} size="small" sx={{ color: "grey.500" }}>
            <CloseRoundedIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2, overflowY: "auto" }}>
          {inboxOpen ? (
            <ChatInboxPage
              onSelectRoom={(roomId) => {
                setSelectedRoomId(roomId);
                setInboxOpen(false); // close dialog first, else drawer renders trapped behind its backdrop
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Sibling of Dialog (not nested) so it doesn't stack behind its backdrop */}
      <ChatDrawer
        open={!!selectedRoomId}
        onClose={() => {
          setSelectedRoomId(null);
          void refreshUnread();
        }}
        roomId={selectedRoomId ?? undefined}
        currentUserId={currentUserId}
      />
    </AppBar>
  );
}