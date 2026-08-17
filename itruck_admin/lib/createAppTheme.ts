import { createTheme, alpha, type Theme } from "@mui/material/styles";
import {
  PRIMARY,
  PRIMARY_LIGHT,
  PRIMARY_DARK,
  SECONDARY,
  SECONDARY_LIGHT,
  SECONDARY_DARK,
  SUCCESS,
  SUCCESS_LIGHT,
  SUCCESS_DARK,
  WARNING,
  WARNING_LIGHT,
  WARNING_DARK,
  ERROR,
  ERROR_LIGHT,
  ERROR_DARK,
  INFO,
  INFO_LIGHT,
  INFO_DARK,
  NEUTRAL,
  RADIUS,
  SHADOW,
  TYPOGRAPHY,
  TRANSITION,
} from "./theme";

declare module "@mui/material/styles" {
  interface Theme {
    tokens: {
      radius: typeof RADIUS;
      shadow: typeof SHADOW;
      transition: typeof TRANSITION;
    };
  }
  interface ThemeOptions {
    tokens?: {
      radius?: typeof RADIUS;
      shadow?: typeof SHADOW;
      transition?: typeof TRANSITION;
    };
  }
}

export function createAppTheme(): Theme {
  return createTheme({
    palette: {
      mode: "light",
      primary: {
        main: PRIMARY,
        light: PRIMARY_LIGHT,
        dark: PRIMARY_DARK,
        contrastText: "#ffffff",
      },
      secondary: {
        main: SECONDARY,
        light: SECONDARY_LIGHT,
        dark: SECONDARY_DARK,
        contrastText: "#ffffff",
      },
      success: { main: SUCCESS, light: SUCCESS_LIGHT, dark: SUCCESS_DARK },
      info: { main: INFO, light: INFO_LIGHT, dark: INFO_DARK },
      warning: { main: WARNING, light: WARNING_LIGHT, dark: WARNING_DARK },
      error: { main: ERROR, light: ERROR_LIGHT, dark: ERROR_DARK },
      background: {
        default: NEUTRAL[100],
        paper: "#ffffff",
      },
      text: {
        primary: NEUTRAL[900],
        secondary: NEUTRAL[500],
        disabled: NEUTRAL[400],
      },
      divider: alpha(NEUTRAL[900], 0.08),
      action: {
        hover: alpha(NEUTRAL[900], 0.04),
        selected: alpha(PRIMARY, 0.08),
        focus: alpha(PRIMARY, 0.12),
      },
    },
    tokens: {
      radius: RADIUS,
      shadow: SHADOW,
      transition: TRANSITION,
    },
    typography: {
      fontFamily: TYPOGRAPHY.fontFamily,
      h1: { fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15 },
      h2: { fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.2 },
      h3: { fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.25 },
      h4: { fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.3 },
      h5: { fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.35 },
      h6: { fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.4 },
      subtitle1: { fontWeight: 600, lineHeight: 1.5 },
      subtitle2: { fontWeight: 600, lineHeight: 1.45, fontSize: "0.875rem" },
      body1: { lineHeight: 1.6 },
      body2: { lineHeight: 1.55, fontSize: "0.875rem" },
      caption: { lineHeight: 1.45, fontSize: "0.75rem" },
      overline: {
        fontWeight: 700,
        letterSpacing: "0.08em",
        fontSize: "0.6875rem",
        textTransform: "uppercase",
      },
      button: { textTransform: "none", fontWeight: 600, letterSpacing: "0.01em" },
    },
    shape: {
      borderRadius: RADIUS.md,
    },
    spacing: 8,
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            scrollBehavior: "smooth",
          },
          body: {
            scrollbarColor: `${NEUTRAL[300]} ${NEUTRAL[100]}`,
            "&::-webkit-scrollbar": { width: 10, height: 10 },
            "&::-webkit-scrollbar-track": {
              background: NEUTRAL[100],
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: NEUTRAL[300],
              borderRadius: RADIUS.sm,
              border: `2px solid ${NEUTRAL[100]}`,
              "&:hover": { backgroundColor: NEUTRAL[400] },
            },
          },
          "*:focus-visible": {
            outline: `2px solid ${PRIMARY}`,
            outlineOffset: 2,
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            borderRadius: RADIUS.sm,
            paddingInline: 20,
            paddingBlock: 9,
            transition: `all ${TRANSITION.fast}`,
            "&:active": { transform: "scale(0.98)" },
          },
          sizeSmall: {
            paddingInline: 14,
            paddingBlock: 5,
            fontSize: "0.8125rem",
          },
          sizeLarge: {
            paddingInline: 28,
            paddingBlock: 12,
            fontSize: "1rem",
          },
          containedPrimary: {
            boxShadow: "none",
            "&:hover": {
              boxShadow: SHADOW.primary,
              transform: "translateY(-1px)",
            },
          },
          containedSecondary: {
            boxShadow: "none",
            "&:hover": { boxShadow: SHADOW.sm },
          },
          containedSuccess: {
            boxShadow: "none",
            "&:hover": { boxShadow: `0 4px 14px ${alpha(SUCCESS, 0.35)}` },
          },
          containedError: {
            boxShadow: "none",
            "&:hover": { boxShadow: `0 4px 14px ${alpha(ERROR, 0.35)}` },
          },
          outlined: {
            borderWidth: 1.5,
            "&:hover": { borderWidth: 1.5, bgcolor: alpha(NEUTRAL[900], 0.02) },
          },
          text: {
            "&:hover": { bgcolor: alpha(NEUTRAL[900], 0.04) },
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            borderRadius: RADIUS.sm,
            transition: `all ${TRANSITION.fast}`,
            "&:hover": { bgcolor: alpha(NEUTRAL[900], 0.06) },
            "&:active": { transform: "scale(0.94)" },
          },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            borderRadius: RADIUS.md,
            border: `1px solid ${alpha(NEUTRAL[900], 0.06)}`,
            boxShadow: SHADOW.card,
            transition: `box-shadow ${TRANSITION.normal}, transform ${TRANSITION.normal}, border-color ${TRANSITION.normal}`,
          },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: "none",
          },
          rounded: { borderRadius: RADIUS.md },
          elevation1: { boxShadow: SHADOW.sm },
          elevation2: { boxShadow: SHADOW.md },
        },
      },
      MuiTextField: {
        defaultProps: { size: "small", variant: "outlined" },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: RADIUS.sm,
            transition: `box-shadow ${TRANSITION.fast}, border-color ${TRANSITION.fast}`,
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderColor: NEUTRAL[400],
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderWidth: 2,
            },
            "&.Mui-focused": {
              boxShadow: `0 0 0 3px ${alpha(PRIMARY, 0.12)}`,
            },
          },
          notchedOutline: {
            borderColor: alpha(NEUTRAL[900], 0.12),
          },
        },
      },
      MuiInputLabel: {
        styleOverrides: {
          root: {
            fontWeight: 500,
            "&.Mui-focused": { fontWeight: 600 },
          },
        },
      },
      MuiFormLabel: {
        styleOverrides: {
          asterisk: { color: ERROR },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderColor: alpha(NEUTRAL[900], 0.06),
            py: 1.5,
          },
          head: {
            fontWeight: 700,
            fontSize: "0.8125rem",
            color: NEUTRAL[500],
            bgcolor: alpha(NEUTRAL[900], 0.02),
            whiteSpace: "nowrap",
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: {
            transition: `background-color ${TRANSITION.fast}`,
            "&:nth-of-type(even)": {
              bgcolor: alpha(NEUTRAL[900], 0.015),
            },
            "&.Mui-selected": {
              bgcolor: alpha(PRIMARY, 0.06),
              "&:hover": { bgcolor: alpha(PRIMARY, 0.08) },
            },
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            "& .MuiTableCell-head": {
              position: "sticky",
              top: 0,
              zIndex: 2,
            },
          },
        },
      },
      MuiTablePagination: {
        styleOverrides: {
          root: {
            borderTop: `1px solid ${alpha(NEUTRAL[900], 0.06)}`,
          },
          toolbar: {
            minHeight: 52,
          },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: {
            borderRadius: RADIUS.sm,
            alignItems: "center",
            border: "1px solid",
          },
          standardSuccess: {
            bgcolor: alpha(SUCCESS, 0.08),
            borderColor: alpha(SUCCESS, 0.2),
            color: SUCCESS_DARK,
          },
          standardError: {
            bgcolor: alpha(ERROR, 0.08),
            borderColor: alpha(ERROR, 0.2),
            color: ERROR_DARK,
          },
          standardWarning: {
            bgcolor: alpha(WARNING, 0.08),
            borderColor: alpha(WARNING, 0.2),
            color: WARNING_DARK,
          },
          standardInfo: {
            bgcolor: alpha(INFO, 0.08),
            borderColor: alpha(INFO, 0.2),
            color: INFO_DARK,
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: RADIUS.lg,
            boxShadow: SHADOW.modal,
            border: `1px solid ${alpha(NEUTRAL[900], 0.06)}`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: {
            borderRight: `1px solid ${alpha(NEUTRAL[900], 0.06)}`,
            boxShadow: SHADOW.lg,
          },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            boxShadow: SHADOW.navbar,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: RADIUS.full,
            fontWeight: 600,
            fontSize: "0.75rem",
          },
          filled: {
            border: "1px solid transparent",
          },
          outlined: {
            borderWidth: 1.5,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: "none",
            fontWeight: 600,
            minHeight: 44,
            transition: `color ${TRANSITION.fast}`,
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 3,
            borderRadius: "3px 3px 0 0",
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: RADIUS.sm,
            transition: `all ${TRANSITION.fast}`,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: RADIUS.sm,
            fontSize: "0.75rem",
            fontWeight: 500,
            padding: "6px 12px",
            bgcolor: NEUTRAL[800],
          },
          arrow: {
            color: NEUTRAL[800],
          },
        },
      },
      MuiSkeleton: {
        defaultProps: { animation: "wave" },
        styleOverrides: {
          root: {
            borderRadius: RADIUS.sm,
            bgcolor: alpha(NEUTRAL[900], 0.06),
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: RADIUS.full,
            height: 6,
            bgcolor: alpha(NEUTRAL[900], 0.06),
          },
        },
      },
      MuiCheckbox: {
        styleOverrides: {
          root: {
            borderRadius: RADIUS.xs,
          },
        },
      },
      MuiSwitch: {
        styleOverrides: {
          root: {
            padding: 8,
          },
          track: {
            borderRadius: RADIUS.full,
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            borderRadius: RADIUS.md,
            boxShadow: SHADOW.lg,
            border: `1px solid ${alpha(NEUTRAL[900], 0.06)}`,
            mt: 0.5,
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            borderRadius: RADIUS.sm,
            mx: 0.75,
            my: 0.25,
            transition: `background-color ${TRANSITION.fast}`,
          },
        },
      },
      MuiSelect: {
        styleOverrides: {
          root: {
            borderRadius: RADIUS.sm,
          },
        },
      },
      MuiBadge: {
        styleOverrides: {
          badge: {
            fontWeight: 700,
            fontSize: "0.6875rem",
          },
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: {
            borderColor: alpha(NEUTRAL[900], 0.06),
          },
        },
      },
      MuiBreadcrumbs: {
        styleOverrides: {
          separator: {
            color: NEUTRAL[400],
          },
        },
      },
    },
  });
}

export const appTheme = createAppTheme();
