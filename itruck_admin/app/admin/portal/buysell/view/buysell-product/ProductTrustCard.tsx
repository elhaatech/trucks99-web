"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import VerifiedIcon from "@mui/icons-material/Verified";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import Link from "@mui/material/Link";
import { PRODUCT_THEME as T } from "./theme";
import { contactTelHref, formatContactMobile } from "@/app/common/components/buysell/utils";

interface ProductTrustCardProps {
  sellerName?: string;
  sellerMobile?: string | null;
  /** Only render the "Verified Seller" badge when this is explicitly true —
   *  never assume verification just because a name is present. */
  isVerified?: boolean;
  memberSince?: string;
  totalListings?: number;
  responseTime?: string;
}

function StatRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, py: 0.9 }}>
      <Box sx={{ color: T.color.trustNavy, display: "flex" }}>{icon}</Box>
      <Typography sx={{ fontFamily: T.font.body, fontSize: 13, color: T.color.textSecondary, flexGrow: 1 }}>
        {label}
      </Typography>
      <Typography sx={{ fontFamily: T.font.body, fontSize: 13, fontWeight: 600, color: T.color.textPrimary }}>
        {value}
      </Typography>
    </Box>
  );
}

/**
 * Seller trust panel. Renders only the rows backed by real data passed in —
 * no invented stats. Always shows the platform-level "Buy with Confidence"
 * copy, which describes policy rather than seller-specific claims.
 */
export function ProductTrustCard({
  sellerName,
  sellerMobile,
  isVerified,
  memberSince,
  totalListings,
  responseTime,
}: ProductTrustCardProps) {
  const hasSellerStats = memberSince || totalListings != null || responseTime;
  const phone = formatContactMobile(sellerMobile);
  const telHref = contactTelHref(phone);

  return (
    <Box
      sx={{
        bgcolor: T.color.surface,
        border: `1px solid ${T.color.border}`,
        borderRadius: T.radius.md,
        p: 2.5,
        boxShadow: T.shadow.card,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: hasSellerStats || sellerName ? 1.5 : 0 }}>
        <ShieldOutlinedIcon sx={{ color: T.color.accentGreen }} />
        <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: 15, color: T.color.textPrimary }}>
          Buy with Confidence
        </Typography>
      </Box>

      {sellerName && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <PersonOutlineIcon sx={{ fontSize: 18, color: T.color.textMuted }} />
          <Typography sx={{ fontFamily: T.font.body, fontSize: 13.5, fontWeight: 600, color: T.color.textPrimary }}>
            {sellerName}
          </Typography>
          {isVerified && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.4,
                bgcolor: T.color.accentGreenSoft,
                color: T.color.accentGreenDark,
                px: 1,
                py: 0.25,
                borderRadius: "999px",
                fontFamily: T.font.body,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              <VerifiedIcon sx={{ fontSize: 14 }} />
              Verified Seller
            </Box>
          )}
        </Box>
      )}
      {phone && telHref ? (
        <Link
          href={telHref}
          underline="hover"
          sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, mb: 1, fontSize: 13, fontWeight: 600, color: T.color.trustNavy }}
        >
          <PhoneOutlinedIcon sx={{ fontSize: 16 }} />
          {phone}
        </Link>
      ) : null}

      {hasSellerStats && (
        <Box sx={{ borderTop: `1px solid ${T.color.border}`, pt: 0.5, mb: 1 }}>
          {memberSince && (
            <StatRow icon={<ScheduleOutlinedIcon fontSize="small" />} label="Member since" value={memberSince} />
          )}
          {totalListings != null && (
            <StatRow icon={<Inventory2OutlinedIcon fontSize="small" />} label="Total listings" value={totalListings} />
          )}
          {responseTime && (
            <StatRow icon={<ScheduleOutlinedIcon fontSize="small" />} label="Typical response time" value={responseTime} />
          )}
        </Box>
      )}

      <Box sx={{ borderTop: `1px solid ${T.color.border}`, pt: 1.25, display: "flex", flexDirection: "column", gap: 0.75 }}>
        {[
          "Secure messaging and listing verification",
          "Dispute support if something isn't as described",
          "Seller identity checked at listing time",
        ].map((line) => (
          <Box key={line} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
            <VerifiedIcon sx={{ fontSize: 15, color: T.color.accentGreen, mt: "2px" }} />
            <Typography sx={{ fontFamily: T.font.body, fontSize: 12.5, color: T.color.textSecondary }}>
              {line}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
