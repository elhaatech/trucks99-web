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
}: ProductOfferListTabsProps) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 0,
        mt: 2,
        mb: 2.5,
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
              px: { xs: 2, sm: 2.5 },
              py: 1.35,
              fontSize: 15,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? INFO : "#64748b",
              borderBottom: isActive ? `3px solid ${INFO}` : "3px solid transparent",
              mb: "-1px",
              whiteSpace: "nowrap",
              transition: "color 0.15s ease",
              "&:hover": { color: INFO },
            }}
          >
            {tab.label}
          </Box>
        );
      })}
    </Box>
  );
}
