"use client";

import { Suspense, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { ChatLayout } from "@/components/chat";
import { useMarketplaceAuth } from "@/components/marketplace/MarketplaceAuthProvider";
import { getMarketplaceLoginPath } from "@/lib/requireMarketplaceLogin";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { GRADIENT, LAYOUT, NEUTRAL } from "@/lib/theme";

function AssistantPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const kickoffQ = searchParams.get("q");
  const handledKickoff = useRef(false);
  const { authReady, isLoggedIn } = useMarketplaceAuth();

  useEffect(() => {
    if (!authReady) return;
    if (!isLoggedIn) {
      router.replace(getMarketplaceLoginPath(userProductRoutes.assistant()));
    }
  }, [authReady, isLoggedIn, router]);

  useEffect(() => {
    if (!kickoffQ || handledKickoff.current || !isLoggedIn) return;
    handledKickoff.current = true;
    window.sessionStorage.setItem("assistant_kickoff_q", kickoffQ);
  }, [kickoffQ, isLoggedIn]);

  if (!authReady) {
    return (
      <Box sx={{ py: 8, textAlign: "center", color: NEUTRAL[500] }}>
        Loading…
      </Box>
    );
  }

  if (!isLoggedIn) {
    return (
      <Box sx={{ maxWidth: 480, mx: "auto", py: 6, px: 2 }}>
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          Please sign in to use the AI Assistant.
        </Alert>
        <Button
          variant="contained"
          onClick={() =>
            router.push(getMarketplaceLoginPath(userProductRoutes.assistant()))
          }
          sx={{ textTransform: "none", bgcolor: "#5c4d96" }}
        >
          Sign in
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: LAYOUT.contentMaxWidth,
        py: { xs: 1, md: 1.5 },
      }}
    >
      <Box sx={{ mb: 2.5 }}>
        <Typography
          variant="h4"
          fontWeight={800}
          sx={{
            background: GRADIENT,
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            color: "transparent",
            mb: 0.5,
          }}
        >
          AI Assistant
        </Typography>
        <Typography sx={{ color: NEUTRAL[500] }}>
          ChatGPT-style help for your vehicle buy &amp; sell workspace — powered
          by your live listings and catalog.
        </Typography>
      </Box>
      <ChatLayout />
    </Box>
  );
}

export default function AssistantPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ py: 8, textAlign: "center", color: NEUTRAL[500] }}>
          Loading…
        </Box>
      }
    >
      <AssistantPageInner />
    </Suspense>
  );
}
