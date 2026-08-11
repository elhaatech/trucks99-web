/**
 * TRUCKS99 Design System — enterprise fleet marketplace tokens.
 * Single source of truth for MUI theme, shell, and product UI.
 */

/* ── Brand colors (primary blue #2563EB) ──────────────────────────────────── */
export const PRIMARY = "#2563EB";
export const PRIMARY_LIGHT = "#3B82F6";
export const PRIMARY_DARK = "#1D4ED8";
export const SECONDARY = "#D97706";
export const SECONDARY_LIGHT = "#F59E0B";
export const SECONDARY_DARK = "#B45309";

export const GRADIENT =
  "linear-gradient(135deg, #1E40AF 0%, #2563EB 48%, #3B82F6 100%)";
export const GRADIENT_HOVER =
  "linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 45%, #2563EB 100%)";
export const GRADIENT_AUTH =
  "linear-gradient(145deg, #020617 0%, #1E40AF 42%, #2563EB 78%, #3B82F6 100%)";

/* ── Semantic colors ──────────────────────────────────────────────────────── */
export const SUCCESS = "#059669";
export const SUCCESS_LIGHT = "#10B981";
export const SUCCESS_DARK = "#047857";
export const WARNING = "#D97706";
export const WARNING_LIGHT = "#F59E0B";
export const WARNING_DARK = "#B45309";
export const ERROR = "#DC2626";
export const ERROR_LIGHT = "#EF4444";
export const ERROR_DARK = "#B91C1C";
export const INFO = "#2563EB";
export const INFO_LIGHT = "#60A5FA";
export const INFO_DARK = "#1D4ED8";

/* ── Neutrals (slate scale) ───────────────────────────────────────────────── */
export const NEUTRAL = {
  50: "#F8FAFC",
  100: "#F1F5F9",
  200: "#E2E8F0",
  300: "#CBD5E1",
  400: "#94A3B8",
  500: "#64748B",
  600: "#475569",
  700: "#334155",
  800: "#1E293B",
  900: "#0F172A",
  950: "#020617",
} as const;

/* ── Chart / dashboard accent palette ─────────────────────────────────────── */
export const CHART_COLORS = [
  PRIMARY,
  SECONDARY,
  SUCCESS,
  INFO,
  "#6366F1",
  "#14B8A6",
  "#F43F5E",
] as const;

export const DASHBOARD_ACCENTS = {
  blue: { main: "#2563EB", bg: "rgba(37, 99, 235, 0.10)", text: "#1D4ED8" },
  purple: { main: "#0F766E", bg: "rgba(15, 118, 110, 0.10)", text: "#0F766E" },
  teal: { main: "#0D9488", bg: "rgba(13, 148, 136, 0.10)", text: "#0F766E" },
  amber: { main: "#D97706", bg: "rgba(217, 119, 6, 0.10)", text: "#B45309" },
  red: { main: "#EF4444", bg: "rgba(239, 68, 68, 0.10)", text: "#DC2626" },
  green: { main: "#059669", bg: "rgba(5, 150, 105, 0.10)", text: "#047857" },
} as const;

/* ── 8px grid spacing ─────────────────────────────────────────────────────── */
export const SPACING = {
  0: 0,
  1: 8,
  2: 16,
  3: 24,
  4: 32,
  5: 40,
  6: 48,
  8: 64,
  10: 80,
  12: 96,
} as const;

/* ── Border radius ────────────────────────────────────────────────────────── */
export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  full: 9999,
} as const;

/* ── Shadows ──────────────────────────────────────────────────────────────── */
export const SHADOW = {
  xs: "0 1px 2px rgba(15, 23, 42, 0.04)",
  sm: "0 2px 8px rgba(15, 23, 42, 0.06)",
  md: "0 4px 16px rgba(15, 23, 42, 0.08)",
  lg: "0 8px 32px rgba(15, 23, 42, 0.10)",
  xl: "0 16px 48px rgba(15, 23, 42, 0.14)",
  card: "0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.05)",
  cardHover: "0 12px 32px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(15, 23, 42, 0.06)",
  primary: "0 4px 14px rgba(37, 99, 235, 0.32)",
  primaryLg: "0 10px 28px rgba(37, 99, 235, 0.38)",
  modal: "0 24px 64px rgba(2, 6, 23, 0.28)",
  navbar: "0 1px 0 rgba(15, 23, 42, 0.06), 0 4px 16px rgba(15, 23, 42, 0.04)",
} as const;

/* ── Typography scale ─────────────────────────────────────────────────────── */
export const TYPOGRAPHY = {
  fontFamily:
    'var(--font-inter), var(--font-sora), "Segoe UI", system-ui, sans-serif',
  fontFamilyMono:
    'var(--font-geist-mono), "JetBrains Mono", "Fira Code", monospace',
  weights: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },
  letterSpacing: {
    tight: "-0.02em",
    normal: "0",
    wide: "0.05em",
  },
} as const;

/* ── Transitions & animations ─────────────────────────────────────────────── */
export const TRANSITION = {
  fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
  normal: "220ms cubic-bezier(0.4, 0, 0.2, 1)",
  slow: "320ms cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "400ms cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

/* ── Layout ───────────────────────────────────────────────────────────────── */
export const LAYOUT = {
  sidebarCollapsed: 72,
  sidebarExpanded: 260,
  sidebarBg: NEUTRAL[900],
  sidebarBorder: "rgba(148, 163, 184, 0.12)",
  sidebarMuted: "rgba(248, 250, 252, 0.65)",
  navbarHeight: 68,
  buySellCompactFooterHeight: 56,
  /** Full-bleed content — only page gutters create side space */
  contentMaxWidth: "1280px" as const,
  /** Shared left/right page gutter (theme spacing units) */
  pageGutterX: { xs: 1.5, sm: 2, md: 3 } as const,
  /** Top padding under sticky header (skipped on hero pages) */
  pageGutterTop: { xs: 1.5, md: 2 } as const,
} as const;

/* ── Z-index scale ────────────────────────────────────────────────────────── */
export const Z_INDEX = {
  drawer: 1200,
  navbar: 1100,
  modal: 1300,
  tooltip: 1500,
  toast: 1600,
} as const;

/* ── Product page theme (Buy/Sell) ────────────────────────────────────────── */
export const PRODUCT_THEME = {
  color: {
    bg: NEUTRAL[100],
    surface: "#FFFFFF",
    surfaceMuted: NEUTRAL[50],
    border: NEUTRAL[200],
    borderStrong: NEUTRAL[300],
    trustNavy: PRIMARY_DARK,
    trustNavyDark: NEUTRAL[900],
    trustNavySoft: "rgba(37, 99, 235, 0.08)",
    accentGreen: SUCCESS,
    accentGreenDark: SUCCESS_DARK,
    accentGreenSoft: "rgba(5, 150, 105, 0.08)",
    accentAmber: WARNING,
    accentAmberSoft: "rgba(217, 119, 6, 0.08)",
    danger: ERROR,
    textPrimary: NEUTRAL[900],
    textSecondary: NEUTRAL[500],
    textMuted: NEUTRAL[400],
  },
  font: {
    display: TYPOGRAPHY.fontFamily,
    body: TYPOGRAPHY.fontFamily,
  },
  radius: {
    sm: `${RADIUS.sm}px`,
    md: `${RADIUS.md}px`,
    lg: `${RADIUS.lg}px`,
  },
  shadow: {
    card: SHADOW.card,
    cardHover: SHADOW.cardHover,
    elevated: SHADOW.lg,
  },
} as const;
