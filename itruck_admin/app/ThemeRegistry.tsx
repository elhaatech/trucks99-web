"use client";

import * as React from "react";
import createCache from "@emotion/cache";
import { useServerInsertedHTML } from "next/navigation";
import { CacheProvider } from "@emotion/react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { ToastProvider } from "@/lib/toast";
import { AdsenseScript } from "@/components/ads/AdsenseScript";
import { appTheme } from "@/lib/createAppTheme";
import { useKeepPublicPrefix } from "@/lib/keepPublicPrefix";

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
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <CssBaseline />
          <AdsenseScript />
          <ToastProvider>{children}</ToastProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </CacheProvider>
  );
}
