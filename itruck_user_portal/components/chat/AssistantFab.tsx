"use client";

import Fab from "@mui/material/Fab";
import Tooltip from "@mui/material/Tooltip";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import { usePathname, useRouter } from "next/navigation";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { GRADIENT, Z_INDEX } from "@/lib/theme";

/** Floating AI Assistant entry point — visible on all marketplace pages except /assistant. */
export function AssistantFab() {
  const router = useRouter();
  const pathname = usePathname();
  const onAssistant =
    pathname === userProductRoutes.assistant() ||
    pathname.startsWith(`${userProductRoutes.assistant()}/`);
  const onProductView = pathname.startsWith(userProductRoutes.view(""));

  if (onAssistant) return null;

  return (
    <Tooltip title="AI Assistant" placement="left">
      <Fab
        color="primary"
        aria-label="Open AI Assistant"
        onClick={() => router.push(userProductRoutes.assistant())}
        sx={{
          position: "fixed",
          right: { xs: 16, md: 24 },
          bottom: { xs: onProductView ? 178 : 88, md: 28 },
          zIndex: Z_INDEX.navbar + 5,
          width: 56,
          height: 56,
          background: GRADIENT,
          boxShadow: "0 10px 28px rgba(37,99,235,0.45)",
          "&:hover": {
            background: GRADIENT,
            filter: "brightness(1.06)",
            boxShadow: "0 12px 32px rgba(37,99,235,0.55)",
          },
        }}
      >
        <AutoAwesomeRoundedIcon />
      </Fab>
    </Tooltip>
  );
}
