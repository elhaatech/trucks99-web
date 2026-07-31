"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

type Severity = "success" | "error" | "info" | "warning";

type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
  danger: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const FALLBACK_TOAST: ToastContextValue = {
  success: (msg: string) => console.log("[toast]", msg),
  error: (msg: string) => console.error("[toast]", msg),
  info: (msg: string) => console.log("[toast]", msg),
  warning: (msg: string) => console.warn("[toast]", msg),
  danger: (msg: string) => console.error("[toast]", msg),
};

export function useToast() {
  return useContext(ToastContext) ?? FALLBACK_TOAST;
}

type SnackState = {
  open: boolean;
  message: string;
  severity: Severity;
  icon?: React.ReactNode;
};

function DeleteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [snack, setSnack] = useState<SnackState>({
    open: false,
    message: "",
    severity: "success",
  });

  const show = useCallback(
    (message: string, severity: Severity, icon?: React.ReactNode) => {
      setSnack({ open: true, message, severity, icon });
    },
    [],
  );

  const success = useCallback((message: string) => show(message, "success"), [show]);
  const error = useCallback((message: string) => show(message, "error"), [show]);
  const info = useCallback((message: string) => show(message, "info"), [show]);
  const warning = useCallback((message: string) => show(message, "warning"), [show]);
  const danger = useCallback(
    (message: string) => show(message, "error", <DeleteIcon />),
    [show],
  );

  const value = useMemo(
    (): ToastContextValue => ({ success, error, info, warning, danger }),
    [success, error, info, warning, danger],
  );

  const handleClose = useCallback(() => {
    setSnack((prev) => ({ ...prev, open: false }));
  }, []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Snackbar
        open={snack.open}
        autoHideDuration={5000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleClose}
          severity={snack.severity}
          variant="filled"
          icon={snack.icon}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
}
