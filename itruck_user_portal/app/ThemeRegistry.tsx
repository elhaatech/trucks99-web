"use client";

import * as React from "react";
import createCache from "@emotion/cache";
import { useServerInsertedHTML } from "next/navigation";
import { CacheProvider } from "@emotion/react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { ToastProvider } from "@/lib/toast";
import { appTheme } from "@/lib/createAppTheme";
import { AppErrorBoundary } from "@/providers/AppErrorBoundary";
import { FirebasePushProvider } from "@/providers/FirebasePushProvider";
import { useKeepPublicPrefix } from "@/lib/keepPublicPrefix";

/**
 * Root MUI + Emotion + toast providers.
 * Date pickers use `DatePickerProvider` locally (not global).
 * AdSense script is loaded once from the root layout via AdsenseScript (next/script).
 */
export default function ThemeRegistry({
  children,
}: {
  children: React.ReactNode;
}) {
  useKeepPublicPrefix();
  const [{ cache, flush }] = React.useState(() => {
    const cache = createCache({ key: "mui" });
    cache.compat = true;
    return { cache, flush: () => Object.entries(cache.inserted) };
  });

  useServerInsertedHTML(() => {
    const entries = flush();
    if (entries.length === 0) return null;
    return (
      <>
        {entries.map(([key, value]) => (
          <style
            key={key}
            data-emotion={`${cache.key} ${key}`}
            dangerouslySetInnerHTML={{
              __html: typeof value === "string" ? value : "",
            }}
          />
        ))}
      </>
    );
  });

  return (
    <CacheProvider value={cache}>
      <ThemeProvider theme={appTheme}>
        <CssBaseline />
        <AppErrorBoundary>
          <ToastProvider>
            <FirebasePushProvider>{children}</FirebasePushProvider>
          </ToastProvider>
        </AppErrorBoundary>
      </ThemeProvider>
    </CacheProvider>
  );
}
