"use client";



import { useEffect, useRef, useState } from "react";

import Box from "@mui/material/Box";

import Drawer from "@mui/material/Drawer";

import List from "@mui/material/List";

import ListItemButton from "@mui/material/ListItemButton";

import ListItemText from "@mui/material/ListItemText";

import { useRouter, usePathname } from "next/navigation";

import { PRODUCT_THEME as T, INFO, Z_INDEX } from "@/lib/theme";

import { BuySellHeader, BUYSELL_NAV_LINKS } from "./BuySellHeader";

import { BuySellFooter } from "./BuySellFooter";

import { BuySellPageBack } from "./BuySellPageBack";



type BuySellShellProps = {

  children: React.ReactNode;

};



export function BuySellShell({ children }: BuySellShellProps) {

  const router = useRouter();

  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);

  const mainRef = useRef<HTMLElement>(null);



  useEffect(() => {

    mainRef.current?.scrollTo({ top: 0, behavior: "auto" });

  }, [pathname]);



  return (

    <Box

      sx={{

        height: "100dvh",

        display: "flex",

        flexDirection: "column",

        overflow: "hidden",

        bgcolor: T.color.bg,

      }}

    >

      <Box

        component="header"

        sx={{

          flexShrink: 0,

          width: "100%",

          zIndex: Z_INDEX.navbar,

        }}

      >

        <BuySellHeader onMobileMenuToggle={() => setMobileOpen(true)} />

      </Box>



      <Drawer

        anchor="left"

        open={mobileOpen}

        onClose={() => setMobileOpen(false)}

        sx={{ display: { md: "none" }, zIndex: Z_INDEX.drawer }}

      >

        <Box sx={{ width: 280, pt: 2 }}>

          <List>

            {BUYSELL_NAV_LINKS.map((link) => {
              const selected =
                link.label === "My Listings"
                  ? pathname.startsWith("/usear/product/my-listings") ||
                    pathname.startsWith("/usear/product/create") ||
                    pathname.startsWith("/usear/product/edit")
                  : link.label === "My Favorite List"
                    ? pathname === link.href
                    : pathname === link.href || pathname.startsWith(`${link.href}/`);

              return (
              <ListItemButton

                key={link.href}

                selected={selected}

                onClick={() => {

                  setMobileOpen(false);

                  router.push(link.href);

                }}

              >

                <ListItemText

                  primary={link.label}

                  primaryTypographyProps={{

                    fontWeight: selected ? 700 : 500,

                    color: selected ? INFO : "inherit",

                  }}

                />

              </ListItemButton>
              );
            })}

          </List>

        </Box>

      </Drawer>



      <Box

        ref={mainRef}

        component="main"

        id="buy-sell-main-scroll"

        sx={{

          flex: 1,

          minHeight: 0,

          width: "100%",

          overflowY: "auto",

          overflowX: "hidden",

          WebkitOverflowScrolling: "touch",

          px: { xs: 2, sm: 3, lg: 4 },

          py: { xs: 2, md: 3 },

        }}

      >

        <BuySellPageBack />

        {children}

      </Box>



      <Box

        component="footer"

        sx={{

          flexShrink: 0,

          width: "100%",

          zIndex: Z_INDEX.navbar - 1,

        }}

      >

        <BuySellFooter compact />

      </Box>

    </Box>

  );

}

