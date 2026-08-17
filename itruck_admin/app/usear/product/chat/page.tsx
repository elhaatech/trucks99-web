"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { PRODUCT_THEME as T } from "@/lib/theme";
import { MarketplaceChatSplit } from "@/app/common/components/buysell/MarketplaceChatSplit";

export default function UserProductChatPage() {
  return (
    <Box>
      <Typography sx={{ fontWeight: 800, fontSize: 24, mb: 0.5, color: T.color.textPrimary }}>
        Messages
      </Typography>
      <Typography sx={{ color: T.color.textSecondary, mb: 3 }}>
        Chat with buyers and sellers about vehicle listings.
      </Typography>
      <MarketplaceChatSplit />
    </Box>
  );
}
