"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import CloseIcon from "@mui/icons-material/Close";
import { PageHeader } from "@/components/ui";
import { AdvertisementSlot } from "@/components/common";
import { SHOW_ADS } from "@/components/ads/adsConfig";
import type { SubcategoryFilterValue } from "@/components/common";
import { BackButton } from "@/components/common";
import { ChatDrawer } from "@/components/common/ChatDrawer";
import { routes } from "@/lib/routes";
import { useInvalidIdRedirect, useSmartBack } from "@/lib/navigation";
import { canEditBuySellProduct } from "@/lib/buySellPermissions";
import { useNotification } from "@/hooks/useNotification";
import {
  BuySellProduct,
  getBuySellProduct,
  getBuySellCart,
  incrementMarketItemView,
} from "@/model/services/buysellapi";
import { getBitRecords, type ProductBitRecord } from "@/model/api";
import { BitRecordsSection } from "@/components/common/BitRecordsSection";
import { getCurrentUser } from "@/model/services/user";
import type { User } from "@/model/services/user";
import { addFavorite, removeFavorite } from "@/model/services/favoriteapi";
import ChatInboxPage from "@/components/common/Chatinboxpage";
import { ProductStatusChip } from "../../_components/ProductStatusChip";
import { ProductLifecycleSection } from "./_components/ProductLifecycleSection";
import { ProductPurchaseButtons, isProductOwner } from "./_components/ProductPurchaseButtons";

import { PRODUCT_THEME as T } from "../buysell-product/theme";
import { ProductImageGallery } from "../buysell-product/ProductImageGallery";
import { ProductTrustCard } from "../buysell-product/ProductTrustCard";
import { ProductHighlights } from "../buysell-product/ProductHighlights";
import { ProductPriceCard } from "../buysell-product/ProductPriceCard";
import {
  ProductSpecificationsGrid,
  type SpecEntry,
} from "../buysell-product/ProductSpecificationsGrid";
import {
  RelatedProductsCarousel,
  type RelatedProduct,
} from "../buysell-product/RelatedProductsCarousel";
import { ProductExploreSection } from "../buysell-product/ProductExploreSection";
import { ProductShareMenu } from "@/app/common/components/buysell/ProductShareMenu";
import { EmiCalculator } from "@/app/common/components/buysell";
import { ProductEmiSidebarCard } from "@/app/usear/product/viewproduct/_components/ProductEmiSidebarCard";
import { getProductTitle } from "@/app/common/components/buysell/utils";

// ─── helpers ──────────────────────────────────────────────────────────────────

/** userid may come back as a plain string/ObjectId, or as a populated
 *  { _id, name, ... } object depending on the endpoint. Normalise to a
 *  plain string id either way so ownership comparisons are reliable. */
function extractId(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "object" && value !== null) {
    const obj = value as { _id?: unknown; id?: unknown };
    if (obj._id) return String(obj._id);
    if (obj.id) return String(obj.id);
  }
  return String(value);
}

/** Pulls a named spec (e.g. "brand", "model", "year", "condition") out of the
 *  product's specifications array, matching case-insensitively so it works
 *  whatever casing your admin-entered spec names use. */
function pullSpec(
  specifications: BuySellProduct["specifications"] | undefined,
  ...names: string[]
): string | undefined {
  if (!specifications) return undefined;
  const wanted = names.map((n) => n.toLowerCase());
  const match = specifications.find((s) => {
    const specName = s.specification_info?.specification_name?.toLowerCase();
    return specName && wanted.includes(specName);
  });
  if (!match) return undefined;
  return (
    match.specification_value_info?.specification_value_name ??
    (match.specification_value as string | undefined)
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <Box sx={{ display: "flex", gap: 1.5, py: 0.5 }}>
      <Typography sx={{ fontFamily: T.font.body, fontSize: 13, color: T.color.textMuted, minWidth: 96 }}>
        {label}
      </Typography>
      <Typography sx={{ fontFamily: T.font.body, fontSize: 13.5, fontWeight: 600, color: T.color.textPrimary }}>
        {value}
      </Typography>
    </Box>
  );
}

function MetaChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.25,
        py: 0.6,
        borderRadius: "999px",
        border: `1px solid ${T.color.border}`,
        bgcolor: T.color.surface,
        color: T.color.textSecondary,
        fontSize: 12.5,
        lineHeight: 1.35,
        maxWidth: "100%",
      }}
    >
      <Box sx={{ display: "flex", color: T.color.textMuted, flexShrink: 0 }}>
        {icon}
      </Box>
      <Typography component="span" sx={{ fontSize: "inherit", fontWeight: 500 }}>
        {label}
      </Typography>
    </Box>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function BuySellViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const hasValidId = useInvalidIdRedirect(id, routes.buysell.list());
  const goBack = useSmartBack(routes.buysell.list());
  const { notify } = useNotification();

  const [item, setItem] = useState<BuySellProduct | null>(null);
  const [bitRecords, setBitRecords] = useState<ProductBitRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [subcategoryFilter, setSubcategoryFilter] = useState<SubcategoryFilterValue>(null);
  const [stateFilter, setStateFilter] = useState<string>("");

  const [wishlisted, setWishlisted] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [emiOpen, setEmiOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState("");
  // Presentational only — replace with a real "similar products" API call.
  const [relatedProducts] = useState<RelatedProduct[]>([]);

  const refreshCartCount = useCallback(() => {
    getBuySellCart()
      .then((res) => setCartCount(res.count ?? 0))
      .catch(() => setCartCount(0));
  }, []);

  const loadProduct = () => {
    if (!id) return Promise.resolve();
    setLoading(true);
    setError("");
    return Promise.all([
      getBuySellProduct(id),
      getBitRecords<ProductBitRecord>({ entityId: id }),
      incrementMarketItemView(id).catch(() => null),
    ])
      .then(([product, records, viewResult]) => {
        setItem(
          viewResult?.viewCount != null
            ? { ...product, viewCount: viewResult.viewCount }
            : product,
        );
        setBitRecords(records ?? []);
        setWishlisted(Boolean(product.is_favorite));
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getCurrentUser()
      .then((user) => setCurrentUser(user))
      .catch(() => {});
    refreshCartCount();
  }, [refreshCartCount]);

  useEffect(() => {
    void loadProduct();
    setSubcategoryFilter(null);
    setStateFilter("");
  }, [id]);

  const handleFavorite = async () => {
    if (!currentUser) {
      notify({ type: "error", message: "Please log in to save favourites." });
      return;
    }
    if (!id) return;
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

  const handleReportSubmit = () => {
    // TODO: wire to a real "report listing" endpoint. For now this just
    // acknowledges the submission locally so the UI isn't a dead end.
    notify({ type: "success", message: "Report submitted — our team will review this listing" });
    setReportText("");
    setReportOpen(false);
  };

  if (!hasValidId) {
    return null;
  }

  if (loading && !item) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, bgcolor: T.color.bg, minHeight: "60vh" }}>
        <Skeleton variant="text" width="40%" height={36} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="25%" height={20} sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7.5 }}>
            <Skeleton variant="rounded" height={320} sx={{ borderRadius: 3, mb: 2 }} />
            <Skeleton variant="rounded" height={120} sx={{ borderRadius: 3 }} />
          </Grid>
          <Grid size={{ xs: 12, md: 4.5 }}>
            <Skeleton variant="rounded" height={280} sx={{ borderRadius: 3 }} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  if (!item) {
    return (
      <Box sx={{ p: 2, bgcolor: T.color.bg, minHeight: "100vh" }}>
        <Alert severity="error">{error || "Product not found."}</Alert>
        <Button sx={{ mt: 2 }} onClick={goBack}>
          Back to list
        </Button>
      </Box>
    );
  }

  const categoryName =
    typeof item.category_id === "object" && item.category_id
      ? item.category_id.category_name
      : String(item.category_id ?? "—");

  const categoryId =
    typeof item.category_id === "object" && item.category_id
      ? extractId(item.category_id._id) ?? ""
      : extractId(item.category_id) ?? "";

  const subCategoryName =
    typeof item.subcategory_id === "object" && item.subcategory_id
      ? item.subcategory_id.sub_category_name
      : String(item.subcategory_id ?? "—");

  const subcategoryId =
    typeof item.subcategory_id === "object" && item.subcategory_id
      ? extractId(item.subcategory_id._id) ?? ""
      : extractId(item.subcategory_id) ?? "";

  // Normalise both sides to plain string ids before comparing — item.userid
  // and currentUser can each be either a plain id or a populated object.
  const currentUserId = extractId(
    (currentUser as unknown as { _id?: unknown; id?: unknown })?._id ??
      (currentUser as unknown as { _id?: unknown; id?: unknown })?.id ??
      null,
  );
  const isOwner = isProductOwner(item, currentUser, currentUserId);
  const sellerId = extractId(item.userid);
  const isLoggedIn = !!currentUser;
  const canEdit = canEditBuySellProduct(item, currentUser);
  const canShop =
    !isOwner &&
    (item.status === "active" || item.status === "pending" || item.status === "booking");

  // Pull Brand / Model / Year / Condition from specifications if present,
  // and exclude those from the generic specs grid below to avoid duplication.
  const brand = pullSpec(item.specifications, "brand", "make");
  const model = pullSpec(item.specifications, "model");
  const year = pullSpec(item.specifications, "year", "manufacture year", "make year");
  const fuelType = pullSpec(item.specifications, "fuel type", "fuel");
  const owners = pullSpec(item.specifications, "no. of owners", "no of owners", "owners");
  const condition = pullSpec(item.specifications, "condition");
  const matchedSpecNames = new Set(
    [
      "brand",
      "make",
      "model",
      "year",
      "manufacture year",
      "make year",
      "condition",
      "fuel type",
      "fuel",
      "no. of owners",
      "no of owners",
      "owners",
    ],
  );
  const remainingSpecs: SpecEntry[] = (item.specifications ?? [])
    .filter((s) => {
      const name = s.specification_info?.specification_name?.toLowerCase();
      return !name || !matchedSpecNames.has(name);
    })
    .map((s, idx) => {
      const raw =
        s.specification_value_info?.specification_value_name ??
        (s.specification_value as string) ??
        "—";
      const value =
        typeof raw === "string" && /^[a-fA-F0-9]{24}$/.test(raw.trim()) ? "—" : raw;
      return {
        name: s.specification_info?.specification_name ?? `Spec ${idx + 1}`,
        value,
      };
    });

  const locationLabel = [item.city_info?.name, item.state_info?.name]
    .filter(Boolean)
    .join(", ");

  return (
    <Box
      sx={{
        bgcolor: T.color.bg,
        minHeight: "100%",
        pb: { xs: 10, md: 4 },
        animation: "fadeInProductPage 0.35s ease",
        "@keyframes fadeInProductPage": {
          from: { opacity: 0, transform: "translateY(6px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "@media (prefers-reduced-motion: reduce)": { animation: "none" },
      }}
    >
      <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 2, md: 3 } }}>
        <PageHeader
          title={item.description || "Product listing"}
          subtitle="View details, make an offer, or explore more from this seller"
          action={
            <Box sx={{ display: "flex", gap: 1 }}>
              {canEdit && (
                <Button variant="contained" onClick={() => router.push(routes.buysell.edit(id))}>
                  Edit
                </Button>
              )}
              <BackButton fallback={routes.buysell.list()} label="Back to list" />
            </Box>
          }
        />

        {SHOW_ADS && <AdvertisementSlot />}

        {error && (
          <Alert severity="error" onClose={() => setError("")} sx={{ my: 2 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3} sx={{ mt: 0.5 }}>
          {/* ── Left column: gallery, info, specs, trust, related ── */}
          <Grid size={{ xs: 12, md: 7.5 }}>
            <Box
              sx={{
                bgcolor: T.color.surface,
                border: `1px solid ${T.color.border}`,
                borderRadius: T.radius.lg,
                p: { xs: 2, md: 3 },
                boxShadow: T.shadow.card,
                mb: 2.5,
              }}
            >
              <ProductImageGallery
                images={item.images ?? []}
                title={item.description}
              />

              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography
                    sx={{
                      fontFamily: T.font.display,
                      fontWeight: 800,
                      fontSize: { xs: 20, md: 24 },
                      color: T.color.textPrimary,
                      lineHeight: 1.25,
                    }}
                  >
                    {item.description || "Product"}
                  </Typography>
                  <ProductStatusChip status={item.status} />
                </Box>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5, mb: 2 }}>
                  {categoryName !== "—" && (
                    <MetaChip
                      icon={<CategoryOutlinedIcon sx={{ fontSize: 16 }} />}
                      label={categoryName}
                    />
                  )}
                  {subCategoryName !== "—" && (
                    <MetaChip
                      icon={<CategoryOutlinedIcon sx={{ fontSize: 16 }} />}
                      label={subCategoryName}
                    />
                  )}
                  {locationLabel && (
                    <MetaChip
                      icon={<LocationOnOutlinedIcon sx={{ fontSize: 16 }} />}
                      label={locationLabel}
                    />
                  )}
                  {item.created_by && (
                    <MetaChip
                      icon={<PersonOutlineIcon sx={{ fontSize: 16 }} />}
                      label={`Seller: ${item.created_by}`}
                    />
                  )}
                </Box>

                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                    gap: 1,
                    mb: 2,
                    p: 1.5,
                    bgcolor: T.color.surfaceMuted,
                    borderRadius: T.radius.md,
                    border: `1px solid ${T.color.border}`,
                  }}
                >
                  {brand && <DetailRow label="Brand" value={brand} />}
                  {model && <DetailRow label="Model" value={model} />}
                  {year && <DetailRow label="Year" value={year} />}
                  {fuelType && <DetailRow label="Fuel Type" value={fuelType} />}
                  {owners && <DetailRow label="No. of Owners" value={owners} />}
                  {condition && <DetailRow label="Condition" value={condition} />}
                  <DetailRow
                    label="Posted"
                    value={item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}
                  />
                  {item.bsNumber && <DetailRow label="BS No" value={item.bsNumber} />}
                  {item.vehicleId && <DetailRow label="Vehicle ID" value={item.vehicleId} />}
                </Box>

                <Typography sx={{ fontFamily: T.font.body, fontSize: 12, letterSpacing: "0.05em", textTransform: "uppercase", color: T.color.textMuted, mb: 0.75 }}>
                  About this listing
                </Typography>
                <Typography sx={{ fontFamily: T.font.body, fontSize: 14, color: T.color.textSecondary, lineHeight: 1.6 }}>
                  {item.description || "No description provided."}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mb: 2.5 }}>
              <ProductHighlights />
            </Box>

            {remainingSpecs.length > 0 && (
              <Box
                sx={{
                  bgcolor: T.color.surface,
                  border: `1px solid ${T.color.border}`,
                  borderRadius: T.radius.lg,
                  p: { xs: 2, md: 3 },
                  boxShadow: T.shadow.card,
                  mb: 2.5,
                }}
              >
                <Typography sx={{ fontFamily: T.font.display, fontWeight: 700, fontSize: 15, color: T.color.textPrimary, mb: 1.5 }}>
                  Specifications
                </Typography>
                <ProductSpecificationsGrid specs={remainingSpecs} />
              </Box>
            )}

            <Box sx={{ mb: 2.5 }}>
              <ProductLifecycleSection
                product={item}
                productId={id}
                currentUserId={currentUserId}
                isOwner={isOwner}
                onUpdated={() => void loadProduct()}
                onNotify={notify}
              />
            </Box>

            <Box sx={{ mb: 2.5 }}>
              <BitRecordsSection
                type="product"
                entityId={id}
                initialRecords={bitRecords}
                currentUser={currentUser}
                ownerUserId={item.userid}
              />
            </Box>

            {sellerId ? (
              <ProductExploreSection
                categoryId={categoryId}
                categoryName={categoryName !== "—" ? categoryName : undefined}
                currentSubcategoryId={subcategoryId || undefined}
                currentSubcategoryName={
                  subCategoryName !== "—" ? subCategoryName : undefined
                }
                sellerId={sellerId}
                sellerName={item.created_by}
                excludeProductId={id}
                isLoggedIn={isLoggedIn}
                subcategoryFilter={subcategoryFilter}
                onSubcategoryFilterChange={setSubcategoryFilter}
                stateFilter={stateFilter}
                onStateFilterChange={setStateFilter}
              />
            ) : null}

            <RelatedProductsCarousel products={relatedProducts} />
          </Grid>

          {/* ── Right column: sticky buy box + trust card ── */}
          <Grid size={{ xs: 12, md: 4.5 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <ProductPriceCard
                price={Number(item.price) || 0}
                sticky={false}
              >
                <ProductPurchaseButtons
                  variant="panel"
                  embedded
                  product={item}
                  productId={id}
                  currentUser={currentUser}
                  currentUserId={currentUserId}
                  isOwner={isOwner}
                  onUpdated={() => void loadProduct()}
                  onNotify={notify}
                  onCartChange={refreshCartCount}
                />

                {canShop && (
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<ChatBubbleOutlineIcon />}
                    onClick={() => setChatOpen(true)}
                    sx={{ textTransform: "none", borderColor: T.color.borderStrong }}
                  >
                    Chat with Seller
                  </Button>
                )}

                {/* {canShop && (
                  <Button
                    fullWidth
                    variant="text"
                    startIcon={<ShoppingCartIcon />}
                    onClick={() => router.push(routes.buysell.cart())}
                    sx={{ textTransform: "none", color: T.color.textSecondary }}
                  >
                    My cart{cartCount > 0 ? ` (${cartCount})` : ""}
                  </Button>
                )} */}

                {/* Secondary actions */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    pt: 1,
                    mt: 0.5,
                    borderTop: `1px solid ${T.color.border}`,
                  }}
                >
                  <Tooltip title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}>
                    <span>
                      <IconButton
                        onClick={() => void handleFavorite()}
                        size="small"
                        disabled={favoriteBusy || !currentUser}
                        sx={{ color: wishlisted ? T.color.danger : T.color.textSecondary }}
                      >
                        {favoriteBusy ? (
                          <CircularProgress size={16} />
                        ) : wishlisted ? (
                          <FavoriteIcon fontSize="small" />
                        ) : (
                          <FavoriteBorderIcon fontSize="small" />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>
                  <ProductShareMenu
                    trigger="icon"
                    productTitle={getProductTitle(item)}
                    shareUrl={typeof window !== "undefined" ? window.location.href : undefined}
                  />
                  <Tooltip title="Report this listing">
                    <IconButton onClick={() => setReportOpen(true)} size="small" sx={{ color: T.color.textSecondary }}>
                      <FlagOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </ProductPriceCard>

              <ProductEmiSidebarCard
                vehiclePrice={Number(item.price) || 0}
                onOpenCalculator={() => setEmiOpen(true)}
              />

              <ProductTrustCard sellerName={item.created_by} sellerMobile={item.seller_mobile} />
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* ── Sticky mobile action bar ── */}
      {canShop && (
        <Box
          sx={{
            display: { xs: "flex", md: "none" },
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 20,
            bgcolor: T.color.surface,
            borderTop: `1px solid ${T.color.border}`,
            px: 2,
            py: 1.25,
            gap: 1,
            boxShadow: "0 -4px 16px rgba(16,24,40,0.08)",
          }}
        >
          <Button
            fullWidth
            variant="outlined"
            startIcon={<ChatBubbleOutlineIcon />}
            onClick={() => setChatOpen(true)}
            sx={{ textTransform: "none" }}
          >
            Chat
          </Button>
        </Box>
      )}

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

      {/* ── Report dialog (UI stub — wire to a real endpoint) ── */}
      <Dialog open={reportOpen} onClose={() => setReportOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Report listing
          <IconButton size="small" onClick={() => setReportOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <TextField
            multiline
            minRows={3}
            fullWidth
            placeholder="Tell us what's wrong with this listing"
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setReportOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleReportSubmit} disabled={!reportText.trim()}>
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Chat with Seller drawer ── */}
      <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} productId={id} currentUserId={currentUserId} />

      <Dialog open={inboxOpen} onClose={() => setInboxOpen(false)} fullWidth maxWidth="md" PaperProps={{ sx: { height: "80vh" } }}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1.5, borderBottom: "1px solid", borderColor: "grey.200" }}>
          Messages
          <IconButton onClick={() => setInboxOpen(false)} size="small" sx={{ color: "grey.500" }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 2, overflowY: "auto" }}>
          <ChatInboxPage
            onSelectRoom={(roomId) => {
              setSelectedRoomId(roomId);
              setInboxOpen(false); // close Dialog first — otherwise the Drawer below renders trapped behind its backdrop
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Rendered at the top level (sibling of Dialog, not nested inside it)
          so it isn't stacked behind the Dialog's backdrop like before. */}
      <ChatDrawer
        open={!!selectedRoomId}
        onClose={() => setSelectedRoomId(null)}
        roomId={selectedRoomId ?? undefined}
        currentUserId={currentUserId}
      />
    </Box>
  );
}
