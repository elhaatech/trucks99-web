"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";

type Props = {
  children: ReactNode;
  /** Optional title override for the fallback screen. */
  title?: string;
};

type State = {
  hasError: boolean;
  message: string;
};

/**
 * Catches render errors in the client tree so the shell stays usable.
 * Does not replace route-level error.tsx — complements it.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || "Something went wrong.",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (process.env.NODE_ENV !== "production") {
       
      console.error("[AppErrorBoundary]", error, info.componentStack);
    }
  }

  private handleReload = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <Box
        role="alert"
        sx={{
          minHeight: "50vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 2,
          px: 3,
          textAlign: "center",
        }}
      >
        <Typography variant="h5" fontWeight={800}>
          {this.props.title ?? "Something went wrong"}
        </Typography>
        <Typography color="text.secondary" maxWidth={480}>
          {this.state.message}
        </Typography>
        <Button variant="contained" onClick={this.handleReload}>
          Reload page
        </Button>
      </Box>
    );
  }
}
