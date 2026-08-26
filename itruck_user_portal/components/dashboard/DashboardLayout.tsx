"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { AppSidebar } from "./AppSidebar";
import { TopNavbar } from "./TopNavbar";
import type { User } from "@/model/api";

export interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: User | null;
}

export function DashboardLayout({
  children,
  user,
}: DashboardLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  const closeMobileNav = React.useCallback(() => setMobileNavOpen(false), []);

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
        overflow: "hidden",
      }}
    >
      {!isMobile ? (
        <AppSidebar
          user={user}
          variant="rail"
        />
      ) : (
        <Drawer
          anchor="left"
          open={mobileNavOpen}
          onClose={closeMobileNav}
          ModalProps={{ keepMounted: true }}
          PaperProps={{
            sx: {
              width: 280,
              boxSizing: "border-box",
              borderRight: "none",
              backgroundImage: "none",
            },
          }}
          transitionDuration={{ enter: 280, exit: 220 }}
        >
          <AppSidebar
            user={user}
            variant="drawer"
            onNavClick={closeMobileNav}
          />
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flex: 1,
          minWidth: 0,
          p: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <TopNavbar
          user={user}
          onMenuClick={isMobile ? () => setMobileNavOpen(true) : undefined}
        />
        <Box
          className="page-enter custom-scrollbar"
          sx={{
            flex: 1,
            px: { xs: 2, sm: 2.5, md: 3, lg: 4 },
            py: { xs: 2, md: 3 },
            pb: 5,
            overflow: "auto",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
