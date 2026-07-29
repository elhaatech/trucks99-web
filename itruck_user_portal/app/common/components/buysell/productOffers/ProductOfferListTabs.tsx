"use client";

import Box from "@mui/material/Box";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";

export type ProductOfferListTabId = "my" | "received";

type TabDef = { id: ProductOfferListTabId; label: string; count: number };

type ProductOfferListTabsProps = {
  tabs: TabDef[];
  activeTab: ProductOfferListTabId;
  onChange: (tab: ProductOfferListTabId) => void;
  loading?: boolean;
};

export function ProductOfferListTabs({
  tabs,
  activeTab,
  onChange,
  loading = false,
}: ProductOfferListTabsProps) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 0.5,
        mb: 2,
        borderBottom: `1px solid ${T.color.border}`,
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Box
            key={tab.id}
            component="button"
            type="button"
            onClick={() => onChange(tab.id)}
            sx={{
              background: "none",
              border: "none",
              cursor: "pointer",
              px: { xs: 1.25, sm: 2 },
              py: 1.25,
              fontSize: 14,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? INFO : T.color.textSecondary,
              borderBottom: isActive ? `2px solid ${INFO}` : "2px solid transparent",
              mb: "-1px",
              whiteSpace: "nowrap",
              "&:hover": { color: INFO, bgcolor: "rgba(37,99,235,0.04)" },
            }}
          >
            {tab.label}
            {!loading ? (
              <Box
                component="span"
                sx={{
                  ml: 0.75,
                  fontSize: 12,
                  fontWeight: 600,
                  color: isActive ? INFO : T.color.textMuted,
                }}
              >
                ({tab.count})
              </Box>
            ) : null}
          </Box>
        );
      })}
    </Box>
  );
}
