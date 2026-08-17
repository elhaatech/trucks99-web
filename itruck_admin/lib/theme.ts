/**
 * iTruck Design System — single source of truth for visual tokens.
 * Used by MUI theme (createAppTheme), components, and CSS variables.
 */

/* ── Brand colors ─────────────────────────────────────────────────────────── */
export const PRIMARY = "#5c4d96";
export const PRIMARY_LIGHT = "#7e6fb0";
export const PRIMARY_DARK = "#403466";
export const SECONDARY = "#c2185b";
export const SECONDARY_LIGHT = "#e91e63";
export const SECONDARY_DARK = "#880e4f";

export const GRADIENT =
  "linear-gradient(135deg, #5c4d96 0%, #7e6fb0 45%, #c2185b 100%)";
export const GRADIENT_HOVER =
  "linear-gradient(135deg, #403466 0%, #5c4d96 45%, #880e4f 100%)";
export const GRADIENT_AUTH =
  "linear-gradient(135deg, #4A2C6B 0%, #6B4EAA 30%, #9C27B0 60%, #E91E63 100%)";

/* ── Semantic colors ──────────────────────────────────────────────────────── */
export const SUCCESS = "#16a34a";
export const SUCCESS_LIGHT = "#22c55e";
export const SUCCESS_DARK = "#15803d";
export const WARNING = "#f59e0b";
export const WARNING_LIGHT = "#fbbf24";
export const WARNING_DARK = "#d97706";
export const ERROR = "#dc2626";
export const ERROR_LIGHT = "#ef4444";
export const ERROR_DARK = "#b91c1c";
export const INFO = "#2563eb";
export const INFO_LIGHT = "#3b82f6";
export const INFO_DARK = "#1d4ed8";

/* ── Neutrals (slate scale) ───────────────────────────────────────────────── */
export const NEUTRAL = {
  50: "#f8fafc",
  100: "#f1f5f9",
  200: "#e2e8f0",
  300: "#cbd5e1",
  400: "#94a3b8",
  500: "#64748b",
  600: "#475569",
  700: "#334155",
  800: "#1e293b",
  900: "#0f172a",
  950: "#020617",
} as const;

/* ── Chart / dashboard accent palette ─────────────────────────────────────── */
export const CHART_COLORS = [
  PRIMARY,
  SECONDARY,
  SUCCESS,
  WARNING,
  INFO,
  "#8b5cf6",
  "#06b6d4",
] as const;

export const DASHBOARD_ACCENTS = {
  blue: { main: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)", text: "#2563eb" },
  purple: { main: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)", text: "#7c3aed" },
  teal: { main: "#10b981", bg: "rgba(16, 185, 129, 0.1)", text: "#059669" },
  amber: { main: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", text: "#d97706" },
  red: { main: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", text: "#dc2626" },
  green: { main: "#22c55e", bg: "rgba(34, 197, 94, 0.1)", text: "#16a34a" },
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
  card: "0 1px 3px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.06)",
  cardHover: "0 8px 28px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(15, 23, 42, 0.06)",
  primary: "0 4px 14px rgba(92, 77, 150, 0.35)",
  primaryLg: "0 8px 24px rgba(92, 77, 150, 0.40)",
  modal: "0 24px 64px rgba(2, 6, 23, 0.24)",
  navbar: "0 1px 3px rgba(15, 23, 42, 0.04)",
} as const;

/* ── Typography scale ─────────────────────────────────────────────────────── */
export const TYPOGRAPHY = {
  fontFamily:
    'var(--font-geist-sans), "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
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
  sidebarExpanded: 240,
  sidebarBg: NEUTRAL[900],
  sidebarBorder: "rgba(148, 163, 184, 0.12)",
  sidebarMuted: "rgba(248, 250, 252, 0.65)",
  navbarHeight: 64,
  /** Fixed buy/sell shell compact footer bar height */
  buySellCompactFooterHeight: 52,
  contentMaxWidth: 1440,
} as const;

/* ── Z-index scale ────────────────────────────────────────────────────────── */
export const Z_INDEX = {
  drawer: 1200,
  navbar: 1100,
  modal: 1300,
  tooltip: 1500,
  toast: 1600,
} as const;

/* ── Product page theme (Buy/Sell) — extends base tokens ──────────────────── */
export const PRODUCT_THEME = {
  color: {
    bg: NEUTRAL[100],
    surface: "#FFFFFF",
    surfaceMuted: NEUTRAL[50],
    border: NEUTRAL[200],
    borderStrong: NEUTRAL[300],
    trustNavy: PRIMARY_DARK,
    trustNavyDark: NEUTRAL[900],
    trustNavySoft: "rgba(92, 77, 150, 0.08)",
    accentGreen: SUCCESS,
    accentGreenDark: SUCCESS_DARK,
    accentGreenSoft: "rgba(22, 163, 74, 0.08)",
    accentAmber: WARNING,
    accentAmberSoft: "rgba(245, 158, 11, 0.08)",
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
