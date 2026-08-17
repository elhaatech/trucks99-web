"use client";

import { useCallback, useMemo, useState } from "react";
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
import { PRIMARY, PRODUCT_THEME as T, TRANSITION } from "@/lib/theme";

export type NotificationItem = {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
  icon?: React.ReactNode;
};

const MOCK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "n1",
    message: "Your listing '2021 Freightliner Cascadia' received a new offer.",
    timestamp: "2 mins ago",
    read: false,
    icon: <CircleIcon sx={{ fontSize: 9, color: PRIMARY }} />,
  },
  {
    id: "n2",
    message: "Welcome to TRUCKS99! Complete your profile to get started.",
    timestamp: "1 hour ago",
    read: false,
    icon: <CircleIcon sx={{ fontSize: 9, color: PRIMARY }} />,
  },
  {
    id: "n3",
    message: "Someone saved your listing '2019 Volvo VNL 760' to favorites.",
    timestamp: "3 hours ago",
    read: false,
    icon: <CircleIcon sx={{ fontSize: 9, color: PRIMARY }} />,
  },
  {
    id: "n4",
    message: "Your offer on '2018 Peterbilt 579' was accepted.",
    timestamp: "Yesterday",
    read: true,
    icon: <CircleIcon sx={{ fontSize: 9, color: "text.disabled" }} />,
  },
];

type NotificationDropdownProps = {
  notifications?: NotificationItem[];
};

export function NotificationDropdown({
  notifications: notificationsProp,
}: NotificationDropdownProps) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [items, setItems] = useState<NotificationItem[]>(
    () => notificationsProp ?? MOCK_NOTIFICATIONS,
  );

  const open = Boolean(anchor);

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read).length,
    [items],
  );

  const handleOpen = useCallback((e: React.MouseEvent<HTMLElement>) => {
    setAnchor(e.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchor(null);
  }, []);

  const handleMarkAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
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
        {items.length === 0 ? (
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
                key={n.id}
                onClick={handleClose}
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
                  {n.icon ?? (
                    <CircleIcon sx={{ fontSize: 9, color: "text.disabled" }} />
                  )}
                </Box>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    fontSize={13}
                    fontWeight={n.read ? 500 : 700}
                    color={T.color.textPrimary}
                    sx={{ lineHeight: 1.4 }}
                  >
                    {n.message}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.25 }}
                  >
                    {n.timestamp}
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
