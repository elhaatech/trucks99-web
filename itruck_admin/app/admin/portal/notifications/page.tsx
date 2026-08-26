"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import NextLink from "next/link";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import {
  NotificationsNoneOutlined,
  MarkEmailReadOutlined,
  LocalShippingOutlined,
} from "@mui/icons-material";
import { alpha, useTheme } from "@mui/material/styles";
import { getNotifications, markNotificationRead, markAllNotificationsRead, getRowId, type Notification } from "@/model/api";
import { setUnreadNotificationCount } from "@/hooks/useUnreadNotificationCount";
import { ModulePageLayout } from "@/components/common";
import { ListEmptyState } from "@/components/common";
import { Skeleton } from "@/components/ui/Skeleton";
import { routes } from "@/lib/routes";
import { resolveNotificationHref } from "@/lib/notificationHref";

function NotificationIcon({ type }: { type?: string }) {
  const t = (type ?? "").toLowerCase();
  if (t.includes("load")) return <LocalShippingOutlined />;
  return <NotificationsNoneOutlined />;
}

export default function NotificationsPage() {
  const theme = useTheme();
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    getNotifications()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const unreadCount = items.filter((n) => !(n.read === true)).length;
  const hasUnread = unreadCount > 0;

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setItems((prev) => prev.map((n) => (getRowId(n) === id ? { ...n, read: true } : n)));
      setUnreadNotificationCount(Math.max(0, unreadCount - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark as read");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadNotificationCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark all as read");
    }
  };

  return (
    <ModulePageLayout
      title="Notifications"
      subtitle={
        items.length === 0
          ? "Stay updated on loads, bookings, and account activity."
          : `${items.length} total${hasUnread ? ` · ${unreadCount} unread` : ""}`
      }
      error={error}
      onErrorClose={() => setError("")}
      action={
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button component={NextLink} href={routes.notificationHistory()} variant="outlined" size="small">
            History
          </Button>
          <Button component={NextLink} href={routes.notificationTemplates()} variant="outlined" size="small">
            Templates
          </Button>
          {items.length > 0 ? (
            <Button variant="outlined" onClick={handleMarkAllRead} disabled={!hasUnread || loading}>
              Mark all read
            </Button>
          ) : null}
        </Box>
      }
    >
      {loading ? (
        <Paper elevation={0} sx={{ p: 2, borderRadius: "12px", border: "1px solid", borderColor: "divider" }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Box key={i} sx={{ display: "flex", gap: 2, py: 2, borderBottom: i < 4 ? "1px solid" : "none", borderColor: "divider" }}>
              <Skeleton variant="circular" width={40} height={40} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" height={22} />
                <Skeleton variant="text" width="90%" height={18} sx={{ mt: 0.5 }} />
              </Box>
            </Box>
          ))}
        </Paper>
      ) : items.length === 0 ? (
        <ListEmptyState
          title="No notifications yet"
          description="Alerts about loads, bookings, payments, and account activity will appear here."
        />
      ) : (
        <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {items.map((n) => {
            const isUnread = n.read !== true;
            const href = resolveNotificationHref(n);
            const isProduct = Boolean(
              n.productId ||
                n.metadata?.productId ||
                n.postType === "PRODUCT" ||
                n.metadata?.postType === "PRODUCT",
            );
            return (
              <ListItem
                key={getRowId(n)}
                component={Paper}
                elevation={0}
                onClick={() => {
                  if (href) router.push(href);
                }}
                sx={{
                  borderRadius: "12px",
                  border: "1px solid",
                  borderColor: isUnread ? alpha(theme.palette.primary.main, 0.25) : "divider",
                  bgcolor: isUnread ? alpha(theme.palette.primary.main, 0.03) : "background.paper",
                  boxShadow: isUnread ? theme.tokens.shadow.sm : "none",
                  transition: "all 0.2s ease",
                  cursor: href ? "pointer" : "default",
                  "&:hover": { boxShadow: theme.tokens.shadow.card },
                  p: 0,
                }}
                secondaryAction={
                  <Button
                    size="small"
                    variant={isUnread ? "contained" : "text"}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkRead(getRowId(n));
                    }}
                    disabled={!isUnread}
                    sx={{ mr: 1.5, minWidth: 96 }}
                  >
                    {isUnread ? "Mark read" : "Read"}
                  </Button>
                }
              >
                <ListItemIcon sx={{ minWidth: 56, pl: 2 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: isUnread
                        ? alpha(theme.palette.primary.main, 0.1)
                        : alpha(theme.palette.text.primary, 0.05),
                      color: isUnread ? "primary.main" : "text.secondary",
                    }}
                  >
                    <NotificationIcon type={n.title} />
                  </Box>
                </ListItemIcon>
                <ListItemText
                  sx={{ py: 2, pr: 12 }}
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                      <Typography variant="subtitle2" fontWeight={isUnread ? 700 : 600}>
                        {n.title}
                      </Typography>
                      {isUnread ? (
                        <Chip label="New" size="small" color="primary" sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                      ) : null}
                    </Box>
                  }
                  secondary={
                    <>
                      <Typography variant="body2" color="text.secondary" component="span" sx={{ display: "block", mt: 0.5, lineHeight: 1.5 }}>
                        {n.message}
                      </Typography>
                      {href ? (
                          <Link
                            component={NextLink}
                            href={href}
                            onClick={(e) => e.stopPropagation()}
                            sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mt: 1, fontWeight: 600 }}
                          >
                            {isProduct ? "View product details →" : "View details →"}
                          </Link>
                        ) : null}
                      {n.createdAt ? (
                        <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 1 }}>
                          {new Date(n.createdAt).toLocaleString()}
                        </Typography>
                      ) : null}
                    </>
                  }
                />
              </ListItem>
            );
          })}
        </List>
      )}
    </ModulePageLayout>
  );
}
