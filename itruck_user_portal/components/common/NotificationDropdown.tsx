"use client";

import { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import Menu from "@mui/material/Menu";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import NotificationsOutlinedIcon from "@mui/icons-material/NotificationsOutlined";
import CircleIcon from "@mui/icons-material/Circle";
import { alpha } from "@mui/material/styles";
import CircularProgress from "@mui/material/CircularProgress";
import { PRIMARY, PRODUCT_THEME as T, TRANSITION } from "@/lib/theme";
import { useRouter } from "next/navigation";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type Notification,
} from "@/model/services/notification";
import { getRowId } from "@/model/services/common";
import { resolveNotificationHref } from "@/lib/notificationHref";
import {
  setUnreadNotificationCount,
  useUnreadNotificationCount,
} from "@/hooks/useUnreadNotificationCount";

export type NotificationItem = {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
  icon?: React.ReactNode;
};

function formatTimeAgo(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min${min === 1 ? "" : "s"} ago`;
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day} days ago`;
  return new Date(then).toLocaleDateString();
}

type NotificationDropdownProps = {
  notifications?: NotificationItem[];
};

export function NotificationDropdown(_props: NotificationDropdownProps) {
  const router = useRouter();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const unreadCount = useUnreadNotificationCount();

  const open = Boolean(anchor);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const list = await getNotifications();
        if (active) {
          setItems(list);
          setUnreadNotificationCount(list.filter((n) => n.read !== true).length);
        }
      } catch (err) {
        console.error("NotificationDropdown failed to load notifications:", err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setAnchor(e.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchor(null);
  }, []);

  const handleItemClick = useCallback(
    async (n: Notification) => {
      const id = getRowId(n);
      try {
        if (n.read !== true) {
          await markNotificationRead(id);
          setItems((prev) =>
            prev.map((x) => (getRowId(x) === id ? { ...x, read: true } : x)),
          );
          setUnreadNotificationCount(Math.max(0, unreadCount - 1));
        }
      } catch {
        // still navigate even if mark-read fails
      }
      const href = resolveNotificationHref(n);
      handleClose();
      if (href) router.push(href);
    },
    [handleClose, router, unreadCount],
  );

  const handleMarkAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadNotificationCount(0);
    } catch {
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadNotificationCount(0);
    }
  }, []);

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          onClick={handleOpen}
          aria-label="Notifications"
          aria-haspopup="true"
          aria-expanded={open ? "true" : undefined}
          sx={{
            border: `1px solid ${T.color.border}`,
            borderRadius: 2,
            transition: `all ${TRANSITION.fast}`,
            "&:hover": {
              bgcolor: alpha(PRIMARY, 0.06),
              borderColor: alpha(PRIMARY, 0.3),
            },
          }}
        >
          <Badge badgeContent={unreadCount} color="primary" max={99}>
            <NotificationsOutlinedIcon sx={{ fontSize: 20 }} />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        slotProps={{
          paper: {
            sx: { mt: 1, p: 0, minWidth: 320, maxWidth: 360 },
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography fontWeight={700} fontSize={14}>
            Notifications
          </Typography>
          {unreadCount > 0 ? (
            <Button
              size="small"
              onClick={handleMarkAllRead}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                fontSize: 12,
                minWidth: "auto",
                px: 1,
                color: PRIMARY,
              }}
            >
              Mark all as read
            </Button>
          ) : null}
        </Box>
        <Divider />
        {loading ? (
          <Box
            sx={{
              px: 2,
              py: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress size={20} />
          </Box>
        ) : items.length === 0 ? (
          <Box
            sx={{
              px: 2,
              py: 4,
              textAlign: "center",
              color: T.color.textMuted,
            }}
          >
            <Typography fontSize={13}>No notifications yet</Typography>
          </Box>
        ) : (
          <Box sx={{ maxHeight: 320, overflowY: "auto", py: 0.5 }}>
            {items.map((n) => (
              <Box
                key={getRowId(n)}
                onClick={() => handleItemClick(n)}
                sx={{
                  display: "flex",
                  gap: 1.25,
                  alignItems: "flex-start",
                  px: 2,
                  py: 1.25,
                  cursor: "pointer",
                  transition: `background ${TRANSITION.fast}`,
                  bgcolor: n.read ? "transparent" : alpha(PRIMARY, 0.05),
                  "&:hover": { bgcolor: alpha(PRIMARY, 0.08) },
                }}
              >
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    flexShrink: 0,
                    borderRadius: "50%",
                    bgcolor: alpha(PRIMARY, 0.1),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mt: 0.25,
                  }}
                >
                  <CircleIcon
                    sx={{ fontSize: 9, color: n.read ? "text.disabled" : PRIMARY }}
                  />
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    fontSize={13}
                    fontWeight={n.read ? 500 : 700}
                    color={T.color.textPrimary}
                    sx={{ lineHeight: 1.4 }}
                  >
                    {n.message || n.title || ""}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.25 }}
                  >
                    {formatTimeAgo(n.createdAt)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Menu>
    </>
  );
}
