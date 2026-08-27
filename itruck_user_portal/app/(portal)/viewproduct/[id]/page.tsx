"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
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
import AddIcon from "@mui/icons-material/Add";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import { useInvalidIdRedirect, useSmartBack } from "@/lib/navigation";
import { canEditBuySellProduct, canFeatureOwnBuySellListing, isProductOwner } from "@/lib/buySellPermissions";
import { useNotification } from "@/hooks/useNotification";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { ensureLoggedInToViewProduct } from "@/lib/requireMarketplaceLogin";
import { useMarketplaceAuth } from "@/components/marketplace/MarketplaceAuthProvider";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";
import dynamic from "next/dynamic";
import {
  pullSpec,
  getProductTitle,
  getProductSubtitle,
  getProductLocation,
  getSellerDisplayName,
  productSpecsToEntries,
  getProductVehicleId,
  formatVehicleIdDisplay,
} from "@/app/common/components/buysell";
import { FeaturedVehicleListingPanel } from "../_components/FeaturedVehicleListingPanel";
import {
  BuySellProduct,
  getBuySellProduct,
  incrementMarketItemView,
  postBuySellProductsByOwner,
  type BuySellOwnerProductsOwner,
} from "@/model/services/buysellapi";
import { useMarketplaceFavorites } from "@/components/marketplace/MarketplaceFavoritesProvider";
import { ProductLifecycleSection } from "@/app/admin/portal/buysell/view/[id]/_components/ProductLifecycleSection";
import { UserRelatedProductsSection } from "../_components/UserRelatedProductsSection";
import { extractId } from "@/app/common/components/buysell/utils";
import { getFirstBuySellImageUrl } from "@/lib/buysellUtils";
import { ProductViewGallery } from "../_components/ProductViewGallery";
import { ProductViewBreadcrumbs } from "../_components/ProductViewBreadcrumbs";
import { ProductViewSummary } from "../_components/ProductViewSummary";
import { ProductVehicleDetails } from "../_components/ProductVehicleDetails";
import { ProductSellerInfo } from "../_components/ProductSellerInfo";
import { ProductViewActionBar } from "../_components/ProductViewActionBar";
import { ProductEmiSidebarCard } from "../_components/ProductEmiSidebarCard";
import { UserProductBitRecordsSection, type ProductOfferTab } from "../_components/UserProductBitRecordsSection";
import { resolveFeaturedListingUi } from "@/lib/featuredVehicleListingStatus";
import type { SubscriptionItem } from "@/model/services/subscription";
import { GoogleAdBanner } from "@/components/ads/GoogleAdBanner";
import { SHOW_ADS } from "@/components/ads/adsConfig";

const MakeOfferModal = dynamic(
  () =>
    import("@/app/common/components/buysell/MakeOfferModal").then((m) => m.MakeOfferModal),
  { ssr: false },
);
const EmiCalculator = dynamic(
  () =>
    import("@/app/common/components/buysell/EmiCalculator").then((m) => m.EmiCalculator),
  { ssr: false },
);
const ChatDrawer = dynamic(
  () => import("@/components/common/ChatDrawer").then((m) => m.ChatDrawer),
  { ssr: false },
);
const FeaturedVehiclePlansDialog = dynamic(
  () =>
    import("../_components/FeaturedVehiclePlansDialog").then(
      (m) => m.FeaturedVehiclePlansDialog,
    ),
  { ssr: false },
);

const SHOP_BLOCKED_STATUSES = new Set(["sold", "rejected", "inactive", "draft"]);

export default function UserProductViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const hasValidId = useInvalidIdRedirect(id, userProductRoutes.list());
  const goBack = useSmartBack(userProductRoutes.list());
  const { notify } = useNotification();
  const { user: currentUser, userId: marketplaceUserId, authReady, isLoggedIn } = useMarketplaceAuth();
  const { favoriteIds, togglingIds, toggleFavorite } = useMarketplaceFavorites();

  const [item, setItem] = useState<BuySellProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [chatProductId, setChatProductId] = useState("");
  const [offerOpen, setOfferOpen] = useState(false);
  const [emiOpen, setEmiOpen] = useState(false);
  const [offerTab, setOfferTab] = useState<ProductOfferTab>("my");
  const [offerCounts, setOfferCounts] = useState({ my: 0, received: 0 });
  const [offerRefreshKey, setOfferRefreshKey] = useState(0);
  const [featuredPlansOpen, setFeaturedPlansOpen] = useState(false);
  const [featuredActivated, setFeaturedActivated] = useState<SubscriptionItem | null>(null);
  const [owner, setOwner] = useState<BuySellOwnerProductsOwner | null>(null);

  const fromParam = useSearchParams().get("from");
  const from = fromParam === "my-listings" || fromParam === "buy-vehicle" ? fromParam : undefined;

  const currentUserId =
    extractId(
      (currentUser as { _id?: unknown; id?: unknown })?._id ??
        (currentUser as { _id?: unknown; id?: unknown })?.id ??
        null,
    ) || marketplaceUserId || "";

  // Computed early (independent of the `!item` guard below) so the owner-fetch
  // effect can safely depend on it without violating rules of hooks.
  const sellerId = extractId(item?.userid ?? null);

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
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !authReady) return;
    let cancelled = false;
    (async () => {
      const allowed = await ensureLoggedInToViewProduct(id, {
        notify,
        isLoggedIn,
        authReady,
        onNeedLogin: (loginPath) => router.replace(loginPath),
      });
      if (cancelled) return;
      if (!allowed) {
        setLoading(false);
        return;
      }
      await loadProduct();
    })();
    return () => {
      cancelled = true;
    };
  }, [id, loadProduct, notify, router, authReady, isLoggedIn]);

  useEffect(() => {
    if (!item || !featuredActivated) return;
    if (resolveFeaturedListingUi(item).state === "active") {
      setFeaturedActivated(null);
    }
  }, [item, featuredActivated]);

  useEffect(() => {
    if (!item || !authReady) return;
    setOfferTab(isProductOwner(item, currentUser, currentUserId) ? "received" : "my");
  }, [item, currentUser, currentUserId, authReady]);

  // Fetch the seller's owner details (name/mobile/profileImage) for ProductSellerInfo.
  useEffect(() => {
    if (!sellerId || !id) return;
    let cancelled = false;
    postBuySellProductsByOwner({ ownerId: sellerId, excludeProductId: id })
      .then((data) => {
        if (!cancelled && data?.owner) setOwner(data.owner);
      })
      .catch(() => {
        /* fall back to item's own seller fields in the UI */
      });
    return () => {
      cancelled = true;
    };
  }, [sellerId, id]);

  const openChat = useCallback((productId?: string) => {
    setChatProductId(productId ?? id);
    setChatOpen(true);
  }, [id]);

  const wishlisted = favoriteIds.has(String(id));
  const favoriteBusy = togglingIds.has(String(id));
  const handleFavorite = () => {
    void toggleFavorite(id);
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

  const isOwner = authReady && isProductOwner(item, currentUser, currentUserId);
  const relatedOwnerId = isOwner ? currentUserId || sellerId || "" : sellerId || "";
  const canEdit = canEditBuySellProduct(item, currentUser, currentUserId);
  const canFeatureListing = canFeatureOwnBuySellListing(item, currentUser, currentUserId);
  const status = (item.status ?? "").toLowerCase();
  const canShop = authReady && !isOwner && !SHOP_BLOCKED_STATUSES.has(status);

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

  const productUrl =
    typeof window !== "undefined" ? window.location.href : "";

  const summaryProps = {
    title,
    subtitle:"",
    price: Number(item.price) || 0,
    status: item.status,
    location: locationLabel || item.address || undefined,
    viewCount: item.viewCount,
    offerCount,
    year: year ? String(year) : undefined,
    wishlisted,
    favoriteBusy,
    onFavoriteToggle: () => void handleFavorite(),
    shareUrl: productUrl,
    productTitle: title,
  };

  const offersSectionProps = {
    productId: id,
    vehicle: {
      productId: id,
      title,
      imageUrl: getFirstBuySellImageUrl(item.images) || undefined,
      listedPrice: Number(item.price) || 0,
      sellerName: getSellerDisplayName(item),
      sellerMobile: item.seller_mobile ?? null,
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
    onLoginRequired: () =>
      router.push(userProductRoutes.login(userProductRoutes.view(id))),
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

      <ProductViewBreadcrumbs title={title} from={from} onNavigate={(href) => router.push(href)} />

      <Box sx={{ mb: { xs: 2, md: 2.5 } }}>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: { xs: 22, md: 26 },
            color: T.color.textPrimary,
            lineHeight: 1.25,
          }}
        >
          {title}
        </Typography>
       
          <Typography sx={{ color: T.color.textSecondary, fontSize: 14, mt: 0.25 }}>
            {summaryProps.subtitle}
          </Typography>
       
      </Box>

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

          <ProductViewSummary
            {...summaryProps}
            vehicleIdLabel={formatVehicleIdDisplay(getProductVehicleId(item)) || undefined}
          />

          <ProductVehicleDetails
            specs={specEntries}
            vehicleId={getProductVehicleId(item) || undefined}
            address={locationLabel || item.address || undefined}
            description={item.description?.trim() || undefined}
          />

          <ProductSellerInfo
            sellerName={owner?.name || getSellerDisplayName(item)}
            sellerMobile={owner?.mobile || item.seller_mobile || undefined}
            location={locationLabel || item.address || undefined}
            reviewCount={0}
            sellerProfileImage={owner?.profileImage || undefined}
            onChat={canShop ? () => openChat() : undefined}
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

          {isOwner ? (
            <Box
              sx={{
                mb: 2.5,
                p: 2,
                borderRadius: T.radius.lg,
                border: `1px solid ${T.color.border}`,
                bgcolor: "#f0f9ff",
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
                alignItems: "center",
              }}
            >
              <Typography sx={{ fontWeight: 700, fontSize: 14, mr: { sm: 1 }, width: { xs: "100%", sm: "auto" } }}>
                Your listing
              </Typography>
              {canEdit ? (
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => router.push(userProductRoutes.edit(id))}
                  sx={{ bgcolor: INFO, textTransform: "none" }}
                >
                  Edit listing
                </Button>
              ) : null}
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => router.push(userProductRoutes.sellVehicle("create"))}
                sx={{ textTransform: "none", fontWeight: 600 }}
              >
                List another vehicle
              </Button>
              <Button
                variant="text"
                size="small"
                startIcon={<ListAltOutlinedIcon />}
                onClick={() => router.push(userProductRoutes.sellVehicle())}
                sx={{ textTransform: "none" }}
              >
                My listings
              </Button>
            </Box>
          ) : null}

          {canEdit && !isOwner ? (
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
              <FeaturedVehicleListingPanel
                product={item}
                compact
                optimisticPlan={featuredActivated}
                onPayNow={() => setFeaturedPlansOpen(true)}
              />
            </Box>
          ) : null}

          {canShop ? (
            <Box sx={{ mb: 2.5, display: { xs: "block", md: "none" } }}>
              <ProductEmiSidebarCard
                vehiclePrice={Number(item.price) || 0}
                onOpenCalculator={() => setEmiOpen(true)}
              />
            </Box>
          ) : null}

          {SHOW_ADS && <GoogleAdBanner placement="details" format="auto" responsive />}

          {relatedOwnerId ? (
             <UserRelatedProductsSection
               sellerId={relatedOwnerId}
               sellerName={
                 isOwner
                   ? currentUser?.name ?? getSellerDisplayName(item)
                   : getSellerDisplayName(item)
               }
               excludeProductId={id}
               isLoggedIn={isLoggedIn}
               isOwnerView={isOwner}
               onAddVehicle={() => router.push(userProductRoutes.sellVehicle("create"))}
               onChatProduct={!isOwner ? openChat : undefined}
                onNotify={notify}
                 currentStateId={
                  item.state_info?._id
                    ? String(item.state_info._id)
                    : (item.state_id ? String(item.state_id) : undefined)
                 }
                  currentCategoryId={
                    item.category_id
                      ? String(
                          typeof item.category_id === "object"
                            ? item.category_id._id
                            : item.category_id,
                        )
                      : undefined
                  }
                  currentSubcategoryId={
                    item.subcategory_id
                      ? String(
                          typeof item.subcategory_id === "object"
                            ? item.subcategory_id._id
                            : item.subcategory_id,
                        )
                      : undefined
                  }
                  currentCategoryName={
                    typeof item.category_id === "object" ? item.category_id?.category_name : undefined
                  }
                  currentSubcategoryName={
                    typeof item.subcategory_id === "object"
                      ? item.subcategory_id?.sub_category_name
                      : undefined
                  }
                  currentStateName={item.state_info?.name}
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
              <FeaturedVehicleListingPanel
                product={item}
                compact
                optimisticPlan={featuredActivated}
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
          {emiOpen ? (
            <EmiCalculator
              key={`emi-calc-${id}-${Number(item.price) || 0}`}
              variant="modal"
              defaultVehiclePrice={Number(item.price) || 500000}
              showChart
            />
          ) : null}
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
        requestPending={resolveFeaturedListingUi(item).state === "pending"}
        onPaymentSuccess={(plan, detail) => {
          if (!detail?.pendingApproval) {
            setFeaturedActivated(plan);
          }
          void loadProduct();
          notify({
            type: "success",
            message:
              detail?.message ||
              (detail?.pendingApproval
                ? "Free Plan request submitted. Waiting for admin approval."
                : "Payment successful. Your vehicle is now featured."),
          });
        }}
      />
    </Box>
  );
}