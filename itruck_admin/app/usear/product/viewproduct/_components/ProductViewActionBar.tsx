"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import { PRODUCT_THEME as T, INFO, LAYOUT } from "@/lib/theme";

type ProductViewActionBarProps = {
  show: boolean;
  variant?: "fixed" | "inline" | "row";
  favoriteLoading?: boolean;
  isFavorite?: boolean;
  favoriteDisabled?: boolean;
  onFavoriteToggle?: () => void;
  onMakeOffer?: () => void;
  /** When the buyer already has an offer on this product */
  makeOfferLabel?: string;
  onChat?: () => void;
};

export function ProductViewActionBar({
  show,
  variant = "fixed",
  favoriteLoading = false,
  isFavorite = false,
  favoriteDisabled = false,
  onFavoriteToggle,
  onMakeOffer,
  makeOfferLabel = "Make an Offer",
  onChat,
}: ProductViewActionBarProps) {
  if (!show) return null;

  const buttonSx = {
    textTransform: "none" as const,
    fontWeight: 600,
    fontSize: 14,
    py: 1.35,
    borderRadius: `${T.radius.md}`,
  };

  if (variant === "row") {
    return (
      <Box
        sx={{
          display: { xs: "none", md: "grid" },
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 1.25,
          mb: 2.5,
        }}
      >
        <Button
          fullWidth
          variant="outlined"
          disabled={favoriteLoading || favoriteDisabled}
          onClick={onFavoriteToggle}
          startIcon={
            favoriteLoading ? (
              <CircularProgress size={16} />
            ) : isFavorite ? (
              <FavoriteIcon sx={{ color: T.color.danger }} />
            ) : (
              <FavoriteBorderIcon />
            )
          }
          sx={{
            ...buttonSx,
            borderColor: INFO,
            color: INFO,
            ...(isFavorite ? { borderColor: T.color.danger, color: T.color.danger } : {}),
          }}
        >
          {isFavorite ? "In Favourites" : "Add to Favourite"}
        </Button>
        <Button
          fullWidth
          variant="contained"
          onClick={onMakeOffer}
          startIcon={<LocalOfferOutlinedIcon />}
          sx={{ ...buttonSx, bgcolor: INFO, boxShadow: "none", "&:hover": { bgcolor: "#1d4ed8" } }}
        >
          {makeOfferLabel}
        </Button>
        <Button
          fullWidth
          variant="contained"
          onClick={onChat}
          startIcon={<ChatBubbleOutlineIcon />}
          sx={{ ...buttonSx, bgcolor: INFO, boxShadow: "none", "&:hover": { bgcolor: "#1d4ed8" } }}
        >
          Chat with Owner
        </Button>
      </Box>
    );
  }

  const isInline = variant === "inline";

  return (
    <Box
      sx={{
        ...(isInline
          ? {
              display: "flex",
              flexDirection: "column",
              gap: 1.25,
            }
          : {
              position: "fixed",
              left: 0,
              right: 0,
              bottom: LAYOUT.buySellCompactFooterHeight,
              zIndex: 30,
              bgcolor: T.color.surface,
              borderTop: `1px solid ${T.color.border}`,
              px: 2,
              py: 1.5,
              display: { xs: "flex", md: "none" },
              flexDirection: "column",
              gap: 1,
              boxShadow: "0 -4px 20px rgba(15,23,42,0.08)",
            }),
      }}
    >
      {!isInline ? (
        <Typography sx={{ fontSize: 12, color: T.color.textMuted, textAlign: "center", mb: 0.25 }}>
          Interested in this vehicle?
        </Typography>
      ) : null}

      <Box
        sx={{
          display: "flex",
          flexDirection: isInline ? "column" : "row",
          gap: 1,
          width: "100%",
        }}
      >
        <Button
          fullWidth
          variant="outlined"
          disabled={favoriteLoading || favoriteDisabled}
          onClick={onFavoriteToggle}
          startIcon={
            favoriteLoading ? (
              <CircularProgress size={16} />
            ) : isFavorite ? (
              <FavoriteIcon sx={{ color: T.color.danger }} />
            ) : (
              <FavoriteBorderIcon />
            )
          }
          sx={{
            ...buttonSx,
            ...(isFavorite ? { borderColor: T.color.danger, color: T.color.danger } : {}),
          }}
        >
          {isFavorite ? "In Favourites" : "Add to Favourite"}
        </Button>
        <Button
          fullWidth
          variant="outlined"
          onClick={onMakeOffer}
          startIcon={<LocalOfferOutlinedIcon />}
          sx={buttonSx}
        >
          {makeOfferLabel}
        </Button>
      </Box>

      <Button
        fullWidth
        variant="contained"
        onClick={onChat}
        startIcon={<ChatBubbleOutlineIcon />}
        sx={{
          ...buttonSx,
          bgcolor: INFO,
          boxShadow: "none",
          "&:hover": { bgcolor: "#1d4ed8", boxShadow: "none" },
        }}
      >
        Chat with Owner
      </Button>
    </Box>
  );
}
