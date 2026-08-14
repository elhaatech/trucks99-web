"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { alpha, useTheme } from "@mui/material/styles";
import { getFirstBuySellImageUrl } from "@/lib/buysellUtils";
import { getBuySellRowId, type BuySellCartItem } from "@/model/services/buysellapi";
import { formatProductPrice, getProductTitle } from "./utils";
import { ProductStatusChip } from "@/app/admin/portal/buysell/_components/ProductStatusChip";
import { PRODUCT_THEME as T } from "@/lib/theme";
import { BuySellImage } from "@/components/common/BuySellImage";

type CartItemProps = {
  item: BuySellCartItem;
  isFavorite?: boolean;
  favoriteLoading?: boolean;
  onFavoriteToggle?: (productId: string) => void;
  onRemove: (productId: string) => void;
  onView: (productId: string) => void;
};

export function CartItemRow({
  item,
  isFavorite = false,
  favoriteLoading = false,
  onFavoriteToggle,
  onRemove,
  onView,
}: CartItemProps) {
  const theme = useTheme();
  const product = item.product;
  const productId = getBuySellRowId(product);
  const price = Number(product.price) || 0;
  const imageUrl = getFirstBuySellImageUrl(product.images);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        borderRadius: T.radius.lg,
        border: `1px solid ${T.color.border}`,
        bgcolor: T.color.surface,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: { xs: "100%", sm: 160 },
          height: { xs: 160, sm: 140 },
          bgcolor: alpha(theme.palette.text.primary, 0.04),
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <BuySellImage src={imageUrl} alt={getProductTitle(product)} fill />
        {onFavoriteToggle ? (
          <IconButton
            size="small"
            aria-label={isFavorite ? "Remove from favourites" : "Add to favourites"}
            disabled={favoriteLoading}
            onClick={() => onFavoriteToggle(productId)}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              bgcolor: "rgba(255,255,255,0.92)",
              "&:hover": { bgcolor: "#fff" },
            }}
          >
            {isFavorite ? (
              <FavoriteIcon fontSize="small" sx={{ color: T.color.danger }} />
            ) : (
              <FavoriteBorderIcon fontSize="small" />
            )}
          </IconButton>
        ) : null}
      </Box>
      <Box sx={{ flex: 1, p: 2.5, display: "flex", flexDirection: "column", gap: 1 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
          <Box>
            <Typography fontWeight={700}>{getProductTitle(product)}</Typography>
            <Typography variant="body2" color="text.secondary">
              {product.bsNumber}
            </Typography>
          </Box>
          <IconButton
            color="error"
            size="small"
            aria-label="Remove from cart"
            onClick={() => onRemove(productId)}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
          <Typography variant="h6" fontWeight={800} color="primary.main">
            {formatProductPrice(price)}
          </Typography>
          <ProductStatusChip status={product.status} />
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<VisibilityOutlinedIcon />}
          onClick={() => onView(productId)}
          sx={{ alignSelf: "flex-start", mt: "auto" }}
        >
          View listing
        </Button>
      </Box>
    </Box>
  );
}

type CartSummaryProps = {
  itemCount: number;
  subtotal: number;
  onCheckout?: () => void;
};

export function CartSummary({ itemCount, subtotal, onCheckout }: CartSummaryProps) {
  return (
    <Box
      sx={{
        p: 3,
        borderRadius: T.radius.lg,
        border: `1px solid ${T.color.border}`,
        bgcolor: T.color.surface,
        position: { lg: "sticky" },
        top: 88,
        height: "fit-content",
      }}
    >
      <Typography variant="overline" color="text.secondary" fontWeight={700}>
        Cart Summary
      </Typography>
      <Typography variant="h4" fontWeight={800} sx={{ mt: 1 }}>
        {formatProductPrice(subtotal)}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {itemCount} item{itemCount !== 1 ? "s" : ""}
      </Typography>
      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="body2">Subtotal</Typography>
        <Typography variant="body2" fontWeight={600}>
          {formatProductPrice(subtotal)}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="body2">Tax</Typography>
        <Typography variant="body2" fontWeight={600}>
          ₹0
        </Typography>
      </Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Typography variant="body2">Grand Total</Typography>
        <Typography variant="body1" fontWeight={800}>
          {formatProductPrice(subtotal)}
        </Typography>
      </Box>
      <Button
        fullWidth
        variant="contained"
        size="large"
        disabled={itemCount === 0}
        onClick={onCheckout}
        sx={{ bgcolor: "#2563eb", textTransform: "none", fontWeight: 700 }}
      >
        Proceed to Checkout
      </Button>
      <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 1.5, lineHeight: 1.5 }}>
        Open a listing to review details, make an offer, or contact the seller.
      </Typography>
    </Box>
  );
}
