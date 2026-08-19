"use client";

import * as React from "react";
import Link from "next/link";
import type { ComponentProps } from "react";

/** MUI `ListItemButton` needs a ref-forwarding component for App Router `Link` (Next 13+). */
const NextLink = React.forwardRef<
  HTMLAnchorElement,
  ComponentProps<typeof Link>
>(function NextLink({ prefetch = false, ...props }, ref) {
  return <Link ref={ref} prefetch={prefetch} {...props} />;
});

import { usePathname } from "next/navigation";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import { LAYOUT } from "@/lib/theme";
import { useTheme, alpha } from "@mui/material/styles";
import type { User } from "@/model/api";
import { getAdminPortalNavDefinitions } from "@/lib/adminPortalNav";
import {
  canViewNavItem,
  canViewRoute,
  hrefToPermissionKey,
  normalizePathForMatch,
} from "@/lib/permissions";
import { routes } from "@/lib/routes";

const SIDEBAR_COLLAPSED = LAYOUT.sidebarCollapsed;
const SIDEBAR_EXPANDED = LAYOUT.sidebarExpanded;

const bottomNavItems: { label: string; href: string; icon: React.ReactNode }[] =
  [];

// ─── Icons ─────────────────────────────────────────────────────────────────────

function DashboardIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

function RolesIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2l8 3v6c0 5-3.5 9.5-8 11C7.5 20.5 4 16 4 11V5l8-3z" />
      <circle cx="12" cy="10" r="2.5" />
      <path d="M7.5 18.5c.5-2.5 2.3-4 4.5-4s4 1.5 4.5 4" />
    </svg>
  );
}

function LoadIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  );
}

function TruckIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 3h15v13H1z" />
      <path d="M16 8h4l3 5v4h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function IncomeCategoryIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function AdvertisementIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 15l3-3 2 2 5-5" />
      <circle cx="17" cy="9" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IncomeExpenseIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6" />
    </svg>
  );
}

function LocationPinIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s7-4.5 7-11a7 7 0 0 0-14 0c0 6.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function SpecificationIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
      <line x1="4" y1="18" x2="20" y2="18" />
      <circle cx="11" cy="18" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SpecificationValueIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="5" cy="7" r="1.5" />
      <line x1="9" y1="7" x2="20" y2="7" />
      <circle cx="5" cy="12" r="1.5" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <circle cx="5" cy="17" r="1.5" />
      <line x1="9" y1="17" x2="20" y2="17" />
    </svg>
  );
}

function BuySellIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v10" />
      <path d="M8 9l4-4 4 4" />
      <path d="M12 19V9" opacity="0.6" />
      <path d="M16 15l-4 4-4-4" opacity="0.6" />
    </svg>
  );
}

function ReportsIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.2s ease",
        flexShrink: 0,
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function FindLoadIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="16.5" y1="16.5" x2="22" y2="22" />
      <path d="M8 9h6M8 12h4" />
    </svg>
  );
}

function FindTruckIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="10" cy="10" r="5" />
      <line x1="14" y1="14" x2="18" y2="18" />
      <path d="M18 9h3l2 3v3h-5V9z" />
      <circle cx="19.5" cy="17.5" r="1.5" />
    </svg>
  );
}

function FavoritesIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 21s-7-4.4-9.5-8.2C.3 9.6 2.2 5 6.5 5c2.1 0 3.4 1.2 4.5 2.6C12.1 6.2 13.4 5 15.5 5 19.8 5 21.7 9.6 21.5 12.8 19 16.6 12 21 12 21z" />
    </svg>
  );
}

function EnquiryIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4h16v16H4z" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}

// ─── Icon map ──────────────────────────────────────────────────────────────────

const NAV_ICONS: Record<string, React.ReactNode> = {
  dashboard: <DashboardIcon />,
  roles: <RolesIcon />,
  permission: <RolesIcon />,
  user: <PersonIcon />,
  incomeExpenseCategory: <IncomeCategoryIcon />,
  advertisement: <AdvertisementIcon />,
  incomeExpense: <IncomeExpenseIcon />,
  companyStartCountry: <LocationPinIcon />,
  specification: <SpecificationIcon />,
  category: <SpecificationValueIcon />,
  buySell: <BuySellIcon />,
  buySellFeatured: <BuySellIcon />,
  findLoad: <FindLoadIcon />,
  findTruck: <FindTruckIcon />,
  reports: <ReportsIcon />,
  reportsTruck: <TruckIcon />,
  reportsLoad: <LoadIcon />,
  reportsBuySell: <BuySellIcon />,
  subscription: <DashboardIcon />,
  subscriptionTransactions: <IncomeExpenseIcon />,
  matching: <DashboardIcon />,
  matchLoad: <FindLoadIcon />,
  matchTruck: <FindTruckIcon />,
  enquiry: <EnquiryIcon />,
  favorites: <FavoritesIcon />,
};

// ─── Types ─────────────────────────────────────────────────────────────────────

type NavChild = {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
};

type NavItem = {
  key: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  children?: NavChild[];
};

// ─── Component ─────────────────────────────────────────────────────────────────

export interface AppSidebarProps {
  user?: User | null;
  notificationCount?: number;
  onNavClick?: () => void;
  variant?: "rail" | "drawer";
}

export function AppSidebar({
  user,
  notificationCount = 0,
  onNavClick,
  variant = "rail",
}: AppSidebarProps) {
  const theme = useTheme();
  const primary = theme.palette.primary.main;
  const pathname = usePathname() ?? "";
  const role = user?.role ?? null;

  const [expanded, setExpanded] = React.useState(false);
  const [openSubMenus, setOpenSubMenus] = React.useState<
    Record<string, boolean>
  >({});

  const effectiveExpanded = variant === "drawer" ? true : expanded;

  const toggleSubMenu = (key: string) =>
    setOpenSubMenus((prev) => ({ ...prev, [key]: !prev[key] }));

  // Build full nav item list from definitions
  const mainNavItems: NavItem[] = React.useMemo(
    () =>
      getAdminPortalNavDefinitions(role, user?.id || "", user).map((d) => {
        return {
          key: d.id,
          label: d.label, // Already includes display_name from getAdminPortalNavDefinitions
          href: d.getHref(),
          icon: NAV_ICONS[d.id],
          children: d.children?.map((c) => {
            return {
              key: c.id,
              label: c.label,
              href: c.getHref(),
              icon: NAV_ICONS[c.id],
            };
          }),
        };
      }),
    [role, user], // Re-compute when role or user changes
  );

  // Filter nav items by permissions
  const visibleMainNav = mainNavItems
    .map((item) => ({
      ...item,
      children: item.children?.filter((child) =>
        canViewNavItem(role, child.key),
      ),
    }))
    .filter(
      (item) =>
        canViewNavItem(role, item.key) ||
        (item.children && item.children.length > 0),
    );

  return (
    <Box
      component="nav"
      aria-label="Main navigation"
      sx={{
        width:
          variant === "drawer"
            ? "100%"
            : effectiveExpanded
              ? SIDEBAR_EXPANDED
              : SIDEBAR_COLLAPSED,
        flexShrink: 0,
        transition: "width 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
        position: "relative",
        zIndex: (theme) => theme.zIndex.drawer,
        boxSizing: "border-box",
        borderRight: variant === "drawer" ? 0 : 1,
        borderColor: LAYOUT.sidebarBorder,
        bgcolor: LAYOUT.sidebarBg,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        alignSelf: "stretch",
        minHeight: variant === "drawer" ? "auto" : "100vh",
        pt: 1.5,
        pb: 2,
      }}
    >
      {/* ── Header ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: effectiveExpanded ? "space-between" : "center",
          px: effectiveExpanded ? 1.5 : 0.5,
          mb: 2,
          minHeight: 40,
        }}
      >
        {variant === "drawer" ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, pl: 1 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1.5,
                bgcolor: primary,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              iT
            </Box>
            <Box
              component="span"
              sx={{
                color: "#f8fafc",
                fontWeight: 700,
                fontSize: 17,
                letterSpacing: -0.3,
              }}
            >
              iTruck
            </Box>
          </Box>
        ) : (
          <IconButton
            size="small"
            onClick={() => setExpanded((prev) => !prev)}
            aria-label={
              effectiveExpanded ? "Collapse navigation" : "Expand navigation"
            }
            sx={{
              color: LAYOUT.sidebarMuted,
              "&:hover": { bgcolor: "rgba(255,255,255,0.08)" },
            }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {effectiveExpanded && (
          <Badge badgeContent={notificationCount} color="secondary">
            <Avatar
              component={canViewRoute(role, routes.profile()) ? Link : "div"}
              href={
                canViewRoute(role, routes.profile())
                  ? routes.profile()
                  : undefined
              }
              prefetch={
                canViewRoute(role, routes.profile()) ? false : undefined
              }
              onClick={onNavClick}
              sx={{
                width: 36,
                height: 36,
                bgcolor: primary,
                cursor: canViewRoute(role, routes.profile())
                  ? "pointer"
                  : "default",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {user?.name?.[0]?.toUpperCase() || "U"}
            </Avatar>
          </Badge>
        )}
      </Box>

      {/* ── Main nav ── */}
      <List
        sx={{
          flex: 1,
          width: "100%",
          px: effectiveExpanded ? 1.25 : 0.25,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 0.25,
        }}
      >
        {/* Hidden temporarily - not needed for now, keep code for future use */}
        {visibleMainNav.map((item) => {
          // Hidden temporarily - not needed for now, keep code for future use
          // incomeExpenseCategory → Transaction Categories
          // incomeExpense         → Transaction
          // reports              → Report
          // cms                  → CMS
          if (
            item.key === "incomeExpenseCategory" ||
            item.key === "incomeExpense" ||
            item.key === "reports" ||
            item.key === "cms"
          ) {
            return false;
          }

          const hasChildren = !!item.children && item.children.length > 0;
          const isSubOpen = !!openSubMenus[item.key];
          const dashboardHref = routes.dashboard();
          const isDashboard = item.href === dashboardHref;

          const active = isDashboard
            ? normalizePathForMatch(pathname) ===
              normalizePathForMatch(dashboardHref)
            : !hasChildren &&
              hrefToPermissionKey(pathname) != null &&
              hrefToPermissionKey(pathname) === hrefToPermissionKey(item.href);

          const anyChildActive = hasChildren
            ? item.children!.some(
                (c) =>
                  normalizePathForMatch(pathname) ===
                  normalizePathForMatch(c.href),
              )
            : false;

          const parentHighlighted = active || anyChildActive;

          return (
            <ListItem
              key={item.key}
              disablePadding
              sx={{ mb: 0.25, flexDirection: "column", alignItems: "stretch" }}
            >
              {/* Parent row */}
              <ListItemButton
                component={hasChildren ? "div" : NextLink}
                {...(!hasChildren ? { href: item.href, prefetch: false } : {})}
                onClick={
                  hasChildren
                    ? () => {
                        if (!effectiveExpanded && variant === "rail")
                          setExpanded(true);
                        toggleSubMenu(item.key);
                      }
                    : onNavClick
                }
                selected={!hasChildren && active}
                sx={{
                  justifyContent: effectiveExpanded ? "flex-start" : "center",
                  borderRadius: 2,
                  mx: 0.5,
                  px: effectiveExpanded ? 1.5 : 1,
                  py: 1,
                  cursor: "pointer",
                  bgcolor: active
                    ? primary
                    : anyChildActive
                      ? "rgba(255,255,255,0.08)"
                      : "transparent",
                  color: parentHighlighted ? "#fff" : LAYOUT.sidebarMuted,
                  "&.Mui-selected": { bgcolor: primary, color: "#fff" },
                  "&:hover": {
                    bgcolor: active
                      ? primary
                      : anyChildActive
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(255,255,255,0.06)",
                  },
                  "& .MuiListItemIcon-root": {
                    color: parentHighlighted ? "#fff" : LAYOUT.sidebarMuted,
                  },
                  transition: "background-color 0.15s ease, color 0.15s ease",
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    justifyContent: "center",
                    color: "inherit",
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {effectiveExpanded && (
                  <>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        variant: "body2",
                        fontWeight: parentHighlighted ? 600 : 500,
                      }}
                      sx={{
                        "& .MuiListItemText-primary": { color: "inherit" },
                      }}
                    />
                    {hasChildren && <ChevronIcon open={isSubOpen} />}
                  </>
                )}
              </ListItemButton>

              {/* Sub-menu children */}
              {hasChildren && (
                <Collapse
                  in={effectiveExpanded && isSubOpen}
                  timeout="auto"
                  unmountOnExit
                >
                  <List disablePadding sx={{ pl: 1.5, pt: 0.25 }}>
                    {item
                      .children!
                      .filter((child) => canViewNavItem(role, child.key))
                      .map((child) => {
                        // Hidden temporarily - not needed for now, keep code for future use
                        if (child.key === "buySell") {
                          return false;
                        }

                        const childActive =
                          normalizePathForMatch(pathname) ===
                          normalizePathForMatch(child.href);

                        return (
                          <ListItem
                            key={child.key}
                            disablePadding
                            sx={{ mb: 0.25 }}
                          >
                            <ListItemButton
                              component={NextLink}
                              href={child.href}
                              prefetch={false}
                              onClick={onNavClick}
                              selected={childActive}
                              sx={{
                                borderRadius: 2,
                                mx: 0.5,
                                px: 1.25,
                                py: 0.75,
                                bgcolor: childActive
                                  ? alpha(primary, 0.75)
                                  : "transparent",
                                color: childActive ? "#fff" : LAYOUT.sidebarMuted,
                                "&.Mui-selected": {
                                  bgcolor: alpha(primary, 0.75),
                                  color: "#fff",
                                },
                                "&:hover": {
                                  bgcolor: childActive
                                    ? alpha(primary, 0.75)
                                    : "rgba(255,255,255,0.06)",
                                },
                                "& .MuiListItemIcon-root": {
                                  color: childActive ? "#fff" : LAYOUT.sidebarMuted,
                                },
                                transition:
                                  "background-color 0.15s ease, color 0.15s ease",
                              }}
                            >
                              <ListItemIcon
                                sx={{
                                  minWidth: 28,
                                  justifyContent: "center",
                                  color: "inherit",
                                }}
                              >
                                <svg
                                  width="6"
                                  height="6"
                                  viewBox="0 0 6 6"
                                  fill="currentColor"
                                >
                                  <circle cx="3" cy="3" r="3" />
                                </svg>
                              </ListItemIcon>
                              <ListItemText
                                primary={child.label}
                                primaryTypographyProps={{
                                  variant: "body2",
                                  fontSize: 13,
                                  fontWeight: childActive ? 600 : 400,
                                }}
                                sx={{
                                  "& .MuiListItemText-primary": {
                                    color: "inherit",
                                  },
                                }}
                              />
                            </ListItemButton>
                          </ListItem>
                        );
                      })}
                  </List>
                </Collapse>
              )}
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}

export const SIDEBAR_WIDTH_PX = SIDEBAR_COLLAPSED;