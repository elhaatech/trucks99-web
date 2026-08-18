"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { useInvalidIdRedirect, useSmartBack } from "@/lib/navigation";
import { canEditBuySellProduct, canFeatureOwnBuySellListing } from "@/lib/buySellPermissions";
import { useNotification } from "@/hooks/useNotification";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { getMarketplaceUserId } from "@/lib/marketplaceUser";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";
import {
  pullSpec,
  getProductTitle,
  getProductSubtitle,
  getProductLocation,
  productSpecsToEntries,
  MakeOfferModal,
  EmiCalculator,
  FeaturedVehiclePromoCard,
  getProductBsNumber,
  getProductVehicleId,
} from "@/app/common/components/buysell";
import {
  BuySellProduct,
  getBuySellProduct,
  incrementMarketItemView,
} from "@/model/services/buysellapi";
import { getCurrentUser } from "@/model/services/user";
import type { User } from "@/model/services/user";
import { addFavorite, removeFavorite } from "@/model/services/favoriteapi";
import { isProductOwner } from "@/app/admin/portal/buysell/view/[id]/_components/ProductPurchaseButtons";
import { ProductLifecycleSection } from "@/app/admin/portal/buysell/view/[id]/_components/ProductLifecycleSection";
import { UserRelatedProductsSection } from "../_components/UserRelatedProductsSection";
import { extractId } from "@/app/common/components/buysell/utils";
import { getBuySellImageUrl } from "@/lib/buysellUtils";
import { ChatDrawer } from "@/components/common/ChatDrawer";
import { ProductViewGallery } from "../_components/ProductViewGallery";
import { ProductViewBreadcrumbs } from "../_components/ProductViewBreadcrumbs";
import { ProductViewSummary } from "../_components/ProductViewSummary";
import { ProductVehicleDetails } from "../_components/ProductVehicleDetails";
import { ProductSellerInfo } from "../_components/ProductSellerInfo";
import { ProductViewActionBar } from "../_components/ProductViewActionBar";
import { ProductEmiSidebarCard } from "../_components/ProductEmiSidebarCard";
import { UserProductBitRecordsSection, type ProductOfferTab } from "../_components/UserProductBitRecordsSection";
import { FeaturedVehiclePlansDialog } from "../_components/FeaturedVehiclePlansDialog";
import type { SubscriptionItem } from "@/model/services/subscription";

const SHOP_BLOCKED_STATUSES = new Set(["sold", "rejected", "inactive", "draft"]);

export default function UserProductViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const hasValidId = useInvalidIdRedirect(id, userProductRoutes.list());
  const goBack = useSmartBack(userProductRoutes.list());
  const { notify } = useNotification();

  const [item, setItem] = useState<BuySellProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatProductId, setChatProductId] = useState("");
  const [offerOpen, setOfferOpen] = useState(false);
  const [emiOpen, setEmiOpen] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [offerTab, setOfferTab] = useState<ProductOfferTab>("my");
  const [offerCounts, setOfferCounts] = useState({ my: 0, received: 0 });
  const [offerRefreshKey, setOfferRefreshKey] = useState(0);
  const [featuredPlansOpen, setFeaturedPlansOpen] = useState(false);
  const [featuredActivated, setFeaturedActivated] = useState<SubscriptionItem | null>(null);

  const loadProduct = useCallback(() => {
    if (!id) return Promise.resolve();
    setLoading(true);
    setError("");
    return Promise.all([
      getBuySellProduct(id),
      incrementMarketItemView(id).catch(() => null),
    ])
      .then(([product, viewResult]) => {
        setItem(
          viewResult?.viewCount != null
            ? { ...product, viewCount: viewResult.viewCount }
            : product,
        );
        setWishlisted(Boolean(product.is_favorite));
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    getCurrentUser()
      .then(setCurrentUser)
      .catch(() => setCurrentUser(null));
  }, []);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  useEffect(() => {
    if (!item) return;
    const uid = extractId(
      (currentUser as { _id?: unknown; id?: unknown })?._id ??
        (currentUser as { _id?: unknown; id?: unknown })?.id ??
        null,
    );
    setOfferTab(isProductOwner(item, currentUser, uid) ? "received" : "my");
  }, [item, currentUser, id]);

  const openChat = (productId?: string) => {
    setChatProductId(productId ?? id);
    setChatOpen(true);
  };

  const handleFavorite = async () => {
    if (!currentUser) {
      notify({ type: "error", message: "Please log in to save favourites." });
      return;
    }
    setFavoriteBusy(true);
    try {
      if (wishlisted) {
        await removeFavorite("buySell", id);
        setWishlisted(false);
        notify({ type: "success", message: "Removed from favourites." });
      } else {
        await addFavorite("buySell", id);
        setWishlisted(true);
        notify({ type: "success", message: "Added to your favourite list." });
      }
    } catch (err) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update favourite",
      });
    } finally {
      setFavoriteBusy(false);
    }
  };

  if (!hasValidId) return null;

  if (loading && !item) {
    return (
      <Box sx={{ width: "100%", py: 2 }}>
        <Skeleton variant="rounded" height={260} sx={{ borderRadius: 3, mb: 2 }} />
        <Skeleton variant="text" width="70%" height={36} />
        <Skeleton variant="text" width="40%" height={28} />
        <Skeleton variant="rounded" height={180} sx={{ borderRadius: 3, mt: 2 }} />
      </Box>
    );
  }

  if (!item) {
    return (
      <Box sx={{ width: "100%" }}>
        <Alert severity="error">{error || "Product not found."}</Alert>
        <Button sx={{ mt: 2 }} onClick={goBack}>
          Back to list
        </Button>
      </Box>
    );
  }

  const currentUserId =
    extractId(
      (currentUser as { _id?: unknown; id?: unknown })?._id ??
        (currentUser as { _id?: unknown; id?: unknown })?.id ??
        null,
    ) || getMarketplaceUserId() || "";
  const isOwner = isProductOwner(item, currentUser, currentUserId);
  const sellerId = extractId(item.userid);
  const canEdit = canEditBuySellProduct(item, currentUser);
  const canFeatureListing = canFeatureOwnBuySellListing(item, currentUser);
  const status = (item.status ?? "").toLowerCase();
  const canShop = !isOwner && !SHOP_BLOCKED_STATUSES.has(status);

  const title = getProductTitle(item);
  const subtitle = getProductSubtitle(item);
  const locationLabel = getProductLocation(item);
  const year = pullSpec(item.specifications, "year", "manufacture year", "make year");
  const specEntries = productSpecsToEntries(item.specifications);

  const myOfferCount = offerCounts.my;
  const receivedOfferCount = offerCounts.received;
  const offerCount = item.bid_count ?? receivedOfferCount + myOfferCount;
  const hasMyOfferOnProduct = !isOwner && myOfferCount > 0;

  const scrollToProductOffers = () => {
    setOfferTab("my");
    if (typeof document !== "undefined") {
      document.getElementById("product-offers-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  const handleProductOfferAction = () => {
    if (hasMyOfferOnProduct) {
      scrollToProductOffers();
      return;
    }
    setOfferOpen(true);
  };

  const offerActionLabel = hasMyOfferOnProduct ? "View your offer" : "Make an Offer";
  const offerActionLabelCompact = hasMyOfferOnProduct ? "View your offer" : "Make Offer";

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title, url });
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        notify({ type: "success", message: "Link copied to clipboard." });
      }
    } catch {
      /* user cancelled share */
    }
  };

  const summaryProps = {
    title,
    subtitle: subtitle || (year ? `${year} Model` : undefined),
    price: Number(item.price) || 0,
    status: item.status,
    location: locationLabel || item.address || undefined,
    viewCount: item.viewCount,
    offerCount,
    year: year ? String(year) : undefined,
    wishlisted,
    favoriteBusy,
    onFavoriteToggle: canShop ? () => void handleFavorite() : undefined,
    onShare: handleShare,
  };

  const offersSectionProps = {
    productId: id,
    vehicle: {
      productId: id,
      title,
      imageUrl: getBuySellImageUrl(item.images?.[0]) || undefined,
      listedPrice: Number(item.price) || 0,
      sellerName: item.created_by ?? "Seller",
    },
    currentUserId,
    isOwner,
    listedPrice: Number(item.price) || 0,
    highestBid: item.highest_bid ?? null,
    activeTab: offerTab,
    onTabChange: setOfferTab,
    onCountsChange: setOfferCounts,
    refreshToken: offerRefreshKey,
    authReady,
    onLoginRequired: () => router.push("/"),
    onUpdated: () => void loadProduct(),
    onNotify: notify,
    onMakeOffer: canShop ? handleProductOfferAction : undefined,
  };

  return (
    <Box sx={{ width: "100%", pb: { xs: 12, md: 4 } }}>
      {error ? (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
          {error}
        </Alert>
      ) : null}

      <ProductViewBreadcrumbs title={title} onNavigate={(href) => router.push(href)} />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { md: "1fr 320px" },
          gap: { xs: 0, md: 3 },
          alignItems: "start",
        }}
      >
        <Box>
          <ProductViewGallery images={item.images ?? []} title={title} />

          <ProductViewSummary {...summaryProps} />

          <ProductVehicleDetails
            specs={specEntries}
            bsNumber={getProductBsNumber(item) || undefined}
            vehicleId={getProductVehicleId(item) || undefined}
            address={locationLabel || item.address || undefined}
            description={item.description?.trim() || undefined}
          />

          <ProductSellerInfo
            sellerName={item.created_by ?? "Seller"}
            location={locationLabel || item.address || undefined}
            reviewCount={106}
          />

          <ProductViewActionBar
            show={canShop}
            variant="row"
            favoriteLoading={favoriteBusy}
            isFavorite={wishlisted}
            onFavoriteToggle={() => void handleFavorite()}
            onMakeOffer={handleProductOfferAction}
            makeOfferLabel={offerActionLabel}
            onChat={() => openChat()}
          />

          {canEdit ? (
            <Box sx={{ display: "flex", gap: 1, mb: 2.5 }}>
              <Button
                variant="contained"
                size="small"
                onClick={() => router.push(userProductRoutes.edit(id))}
                sx={{ bgcolor: INFO, textTransform: "none" }}
              >
                Edit Listing
              </Button>
            </Box>
          ) : null}

          <Box>
            <UserProductBitRecordsSection {...offersSectionProps} />
          </Box>

          {isOwner ? (
            <Box sx={{ mb: 2.5, display: { xs: "block", md: "none" } }}>
              <ProductLifecycleSection
                product={item}
                productId={id}
                currentUserId={currentUserId}
                isOwner={isOwner}
                onUpdated={() => void loadProduct()}
                onNotify={notify}
              />
            </Box>
          ) : null}

          {canFeatureListing ? (
            <Box sx={{ mb: 2.5, display: { xs: "block", md: "none" } }}>
              {featuredActivated ? (
                <Alert severity="success" sx={{ mb: 2 }}>
                  <strong>{featuredActivated.packageName}</strong> is active for{" "}
                  {featuredActivated.durationDays} days. Your listing will show with featured
                  visibility.
                </Alert>
              ) : null}
              <FeaturedVehiclePromoCard
                compact
                onPayNow={() => setFeaturedPlansOpen(true)}
              />
            </Box>
          ) : null}

          {sellerId ? (
            <UserRelatedProductsSection
              sellerId={sellerId}
              sellerName={item.created_by}
              excludeProductId={id}
              isLoggedIn={!!currentUser}
              onChatProduct={(productId) => openChat(productId)}
              onNotify={notify}
            />
          ) : null}
        </Box>

        <Box
          sx={{
            display: { xs: "none", md: "block" },
            position: "sticky",
            top: 88,
          }}
        >
          {canShop ? (
            <ProductEmiSidebarCard
              vehiclePrice={Number(item.price) || 0}
              onOpenCalculator={() => setEmiOpen(true)}
            />
          ) : null}

          {isOwner ? (
            <Box sx={{ mt: canShop ? 2 : 0, display: "flex", flexDirection: "column", gap: 2 }}>
              <Box
                sx={{
                  p: 2.5,
                  borderRadius: T.radius.lg,
                  border: `1px solid ${T.color.border}`,
                  bgcolor: T.color.surface,
                  boxShadow: T.shadow.card,
                }}
              >
                <ProductLifecycleSection
                  product={item}
                  productId={id}
                  currentUserId={currentUserId}
                  isOwner={isOwner}
                  onUpdated={() => void loadProduct()}
                  onNotify={notify}
                />
              </Box>
            </Box>
          ) : null}

          {canFeatureListing ? (
            <Box sx={{ mt: 2 }}>
              {featuredActivated ? (
                <Alert severity="success" sx={{ mb: 2, py: 0.75 }}>
                  <strong>{featuredActivated.packageName}</strong> is active for{" "}
                  {featuredActivated.durationDays} days.
                </Alert>
              ) : null}
              <FeaturedVehiclePromoCard
                compact
                onPayNow={() => setFeaturedPlansOpen(true)}
              />
            </Box>
          ) : null}
        </Box>
      </Box>

      <ProductViewActionBar
        show={canShop}
        variant="fixed"
        favoriteLoading={favoriteBusy}
        isFavorite={wishlisted}
        onFavoriteToggle={() => void handleFavorite()}
        onMakeOffer={handleProductOfferAction}
        makeOfferLabel={offerActionLabelCompact}
        onChat={() => openChat()}
      />

      <MakeOfferModal
        open={offerOpen}
        onClose={() => setOfferOpen(false)}
        product={item}
        productId={id}
        onSuccess={() => {
          void loadProduct();
          setOfferRefreshKey((k) => k + 1);
        }}
        onNotify={notify}
      />

      <Dialog
        open={emiOpen}
        onClose={() => setEmiOpen(false)}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            py: 2,
            px: 3,
            borderBottom: `1px solid ${T.color.border}`,
            fontWeight: 800,
            fontSize: 20,
          }}
        >
          EMI Calculator
          <IconButton onClick={() => setEmiOpen(false)} aria-label="Close" size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
          <EmiCalculator
            variant="modal"
            defaultVehiclePrice={Number(item.price) || 500000}
            showChart
          />
        </DialogContent>
      </Dialog>

      <ChatDrawer
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        productId={chatProductId || id}
        currentUserId={currentUserId}
      />

      <FeaturedVehiclePlansDialog
        open={featuredPlansOpen}
        onClose={() => setFeaturedPlansOpen(false)}
        currentUser={currentUser}
        productTitle={title}
        buySellProductId={id}
        onPaymentSuccess={(plan, detail) => {
          setFeaturedActivated(plan);
          notify({
            type: "success",
            message:
              detail?.message ||
              "Payment successful. Your vehicle is now featured.",
          });
        }}
      />
    </Box>
  );
}
