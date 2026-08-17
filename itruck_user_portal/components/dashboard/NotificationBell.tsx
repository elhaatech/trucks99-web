"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { getNotifications, markNotificationRead, markAllNotificationsRead, type Notification, getRowId } from "@/model/api";
import { ListEmptyState } from "@/components/common";
import { PRIMARY } from "@/lib/theme";
import { routes } from "@/lib/routes";
import { userProductRoutes } from "@/lib/userProductRoutes";

function BellIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 24c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6.36-6v-5c0-3.07-1.63-5.64-4.5-6.32V6a1.86 1.86 0 0 0-3.72 0v.68C7.27 7.36 5.64 9.92 5.64 13v5L4 19v1h16v-1l-1.64-1zM17 18H7v-5c0-2.48 1.51-4.5 3.5-4.5h3C15.49 8.5 17 10.52 17 13v5z" />
    </svg>
  );
}

export interface NotificationBellProps {
  /** Initial unread count from layout; used only for badge until dropdown loads. */
  initialCount?: number;
}

export function NotificationBell({ initialCount = 0 }: NotificationBellProps) {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [items, setItems] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [unreadCount, setUnreadCount] = React.useState(initialCount);

  const open = Boolean(anchorEl);

  const load = React.useCallback(() => {
    setLoading(true);
    setError("");
    getNotifications()
      .then((list) => {
        setItems(list);
        setUnreadCount(list.filter((n) => !(n.read === true)).length);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load notifications");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    if (!items.length) {
      load();
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleItemClick = async (n: Notification) => {
    const id = getRowId(n);
    try {
      if (n.read !== true) {
        await markNotificationRead(id);
        setItems((prev) => prev.map((x) => (getRowId(x) === id ? { ...x, read: true } : x)));
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch {
      // ignore dropdown marking errors; page still works
    }
    if (n.metadata?.route) {
      router.push(n.metadata.route);
    } else if (
      n.event === "featured_free_plan_approved" ||
      n.event === "featured_free_plan_rejected"
    ) {
      const productId = String(n.metadata?.productId || n.productId || "");
      router.push(
        productId ? userProductRoutes.view(productId) : userProductRoutes.myListings(),
      );
    } else if (n.event === "featured_free_plan_request") {
      router.push(routes.buysell.featuredVehicles());
    } else if (n.loadId) {
      router.push(routes.load.view(n.loadId));
    }
    handleClose();
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore; user can retry
    }
  };

  const visibleBadgeCount = unreadCount ?? initialCount;

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleOpen}
        aria-label="Notifications"
        sx={{ mr: 1 }}
      >
        <Badge badgeContent={visibleBadgeCount} color="secondary">
          <BellIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{ sx: { width: 360, maxHeight: 420 } }}
      >
        <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
          <Typography variant="subtitle2" fontWeight={600}>
            Notifications
          </Typography>
          {items.length > 0 && (
            <Button
              size="small"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              sx={{
                textTransform: "none",
                fontSize: 12,
                float: "right",
                mt: -3,
                color: unreadCount > 0 ? PRIMARY : "text.secondary",
              }}
            >
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />
        {loading ? (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
            <CircularProgress size={20} />
          </Box>
        ) : error ? (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ p: 1.5 }}>
            <ListEmptyState title="No notifications yet." compact />
          </Box>
        ) : (
          items.slice(0, 10).map((n) => (
            <MenuItem
              key={getRowId(n)}
              onClick={() => handleItemClick(n)}
              sx={{
                alignItems: "flex-start",
                bgcolor: n.read === true ? "inherit" : "action.hover",
              }}
            >
              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight={n.read === true ? 500 : 700}>
                    {n.title}
                  </Typography>
                }
                secondary={
                  <>
                    <Typography variant="body2" color="text.secondary">
                      {n.message}
                    </Typography>
                    {n.createdAt && (
                      <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 0.25 }}>
                        {new Date(n.createdAt).toLocaleString()}
                      </Typography>
                    )}
                  </>
                }
              />
            </MenuItem>
          ))
        )}
        <Divider />
        <Box sx={{ p: 1, display: "flex", justifyContent: "center" }}>
          <Button
            size="small"
            onClick={() => {
              router.push(routes.notifications());
              handleClose();
            }}
            sx={{ textTransform: "none", color: PRIMARY }}
          >
            View all notifications
          </Button>
        </Box>
      </Menu>
    </>
  );
}

