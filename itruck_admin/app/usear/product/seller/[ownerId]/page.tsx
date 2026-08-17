"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import VerifiedIcon from "@mui/icons-material/Verified";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import StarIcon from "@mui/icons-material/Star";
import {
  VehicleGrid,
  deriveMarketplaceStats,
} from "@/app/common/components/buysell";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";
import {
  postBuySellProductsByOwner,
  type BuySellProduct,
} from "@/model/services/buysellapi";
import { getCurrentUser } from "@/model/services/user";
import { extractId } from "@/app/common/components/buysell/utils";
import { VehicleGridSkeleton } from "@/app/common/components/buysell/LoadingSkeleton";
import { getBuySellImageUrl } from "@/lib/buysellUtils";

export default function SellerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const ownerId = typeof params?.ownerId === "string" ? params.ownerId : "";

  const [products, setProducts] = useState<BuySellProduct[]>([]);
  const [ownerName, setOwnerName] = useState("");
  const [ownerImage, setOwnerImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then((user) =>
        setCurrentUserId(
          extractId(
            (user as { _id?: unknown; id?: unknown })?._id ??
              (user as { _id?: unknown; id?: unknown })?.id ??
              null,
          ),
        ),
      )
      .catch(() => setCurrentUserId(null));
  }, []);

  useEffect(() => {
    if (!ownerId) return;
    setLoading(true);
    postBuySellProductsByOwner({ ownerId, limit: 48 })
      .then((data) => {
        setProducts(data.products ?? []);
        setOwnerName(data.owner?.name ?? "Seller");
        setOwnerImage(data.owner?.profileImage ?? null);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load seller profile"),
      )
      .finally(() => setLoading(false));
  }, [ownerId]);

  const stats = useMemo(() => deriveMarketplaceStats(products), [products]);
  const isOwnProfile = currentUserId && ownerId && currentUserId === ownerId;
  const sampleProduct = products[0];
  const sellerPhone = sampleProduct?.seller_mobile;
  const sellerLocation =
    sampleProduct?.address ||
    [sampleProduct?.city_info?.name, sampleProduct?.state_info?.name].filter(Boolean).join(", ");

  if (!ownerId) {
    return <Alert severity="error">Invalid seller profile.</Alert>;
  }

  return (
    <Box sx={{ width: "100%", pb: 4 }}>
      <Typography sx={{ fontWeight: 800, fontSize: 22, mb: 2 }}>Seller Profile</Typography>

      {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

      <Box
        sx={{
          p: 3,
          borderRadius: T.radius.lg,
          border: `1px solid ${T.color.border}`,
          bgcolor: T.color.surface,
          boxShadow: T.shadow.card,
          mb: 3,
        }}
      >
        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
          <Avatar
            src={ownerImage ? getBuySellImageUrl(ownerImage) : undefined}
            sx={{ width: 72, height: 72, bgcolor: INFO, fontSize: 28 }}
          >
            {(ownerName || "S").charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
              <Typography sx={{ fontWeight: 800, fontSize: 20 }}>{ownerName}</Typography>
              <VerifiedIcon sx={{ color: "#16a34a", fontSize: 20 }} />
              <Typography sx={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>
                Verified Dealer
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.75, color: "#f59e0b" }}>
              <StarIcon sx={{ fontSize: 18 }} />
              <Typography sx={{ fontWeight: 700 }}>4.5</Typography>
              <Typography sx={{ fontSize: 13, color: T.color.textMuted }}>(108 Reviews)</Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ mt: 2.5, display: "flex", flexDirection: "column", gap: 1.25 }}>
          {sellerLocation ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: T.color.textSecondary }}>
              <LocationOnOutlinedIcon sx={{ fontSize: 18 }} />
              <Typography sx={{ fontSize: 14 }}>{sellerLocation}</Typography>
            </Box>
          ) : null}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: T.color.textSecondary }}>
            <EmailOutlinedIcon sx={{ fontSize: 18 }} />
            <Typography sx={{ fontSize: 14 }}>Contact via chat</Typography>
          </Box>
          {sellerPhone ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: T.color.textSecondary }}>
              <PhoneOutlinedIcon sx={{ fontSize: 18 }} />
              <Typography sx={{ fontSize: 14 }}>{sellerPhone}</Typography>
            </Box>
          ) : null}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: T.color.textSecondary }}>
            <CalendarTodayOutlinedIcon sx={{ fontSize: 18 }} />
            <Typography sx={{ fontSize: 14 }}>Member on TRUCK99</Typography>
          </Box>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 1.5,
            mt: 2.5,
          }}
        >
          {[
            { label: "Total Listings", value: stats.totalListings },
            { label: "Active Listings", value: stats.activeListings },
            { label: "Sold Vehicles", value: stats.soldVehicles },
          ].map((stat) => (
            <Box
              key={stat.label}
              sx={{
                textAlign: "center",
                p: 1.5,
                borderRadius: T.radius.md,
                border: `1px solid ${T.color.border}`,
                bgcolor: T.color.surfaceMuted,
              }}
            >
              <Typography sx={{ fontWeight: 800, fontSize: 22, color: INFO }}>
                {stat.value}
              </Typography>
              <Typography sx={{ fontSize: 11, color: T.color.textMuted }}>{stat.label}</Typography>
            </Box>
          ))}
        </Box>

        <Button
          fullWidth
          variant="contained"
          sx={{ mt: 2.5, bgcolor: INFO, textTransform: "none", fontWeight: 700, py: 1.25 }}
          onClick={() =>
            document.getElementById("seller-listings")?.scrollIntoView({ behavior: "smooth" })
          }
        >
          View Listings
        </Button>
      </Box>

      {isOwnProfile ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          This is your public seller profile.
        </Alert>
      ) : null}

      <Box id="seller-listings">
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
            All Vehicles Posted by {ownerName}
          </Typography>
          <Typography
            component="button"
            onClick={() => router.push(userProductRoutes.list())}
            sx={{
              border: "none",
              bgcolor: "transparent",
              color: INFO,
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            View All
          </Typography>
        </Box>
        {loading ? (
          <VehicleGridSkeleton count={4} />
        ) : (
          <VehicleGrid
            products={products}
            onProductClick={(pid) => router.push(userProductRoutes.view(pid))}
            emptyTitle="No active listings"
            emptyDescription="This seller has no vehicles listed right now."
          />
        )}
      </Box>
    </Box>
  );
}
