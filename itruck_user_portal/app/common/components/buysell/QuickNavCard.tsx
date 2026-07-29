"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";

type QuickNavCardProps = {
  title: string;
  description?: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
};

export function QuickNavCard({ title, description, icon, onClick }: QuickNavCardProps) {
  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        p: 2.5,
        borderRadius: T.radius.lg,
        border: `1px solid ${T.color.border}`,
        bgcolor: T.color.surface,
        boxShadow: T.shadow.card,
        cursor: onClick ? "pointer" : "default",
        transition: "transform 0.2s, box-shadow 0.2s, border-color 0.2s",
        "&:hover": onClick
          ? { transform: "translateY(-3px)", boxShadow: T.shadow.cardHover, borderColor: INFO }
          : undefined,
      }}
    >
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: "50%",
          bgcolor: "rgba(3, 105, 161, 0.1)",
          color: INFO,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 1.5,
          "& svg": { fontSize: 26 },
        }}
      >
        {icon}
      </Box>
      <Typography sx={{ fontWeight: 700, fontSize: 14, color: T.color.textPrimary }}>
        {title}
      </Typography>
      {description ? (
        <Typography sx={{ fontSize: 12, color: T.color.textSecondary, mt: 0.5, lineHeight: 1.4 }}>
          {description}
        </Typography>
      ) : null}
    </Box>
  );
}

export function QuickNavGrid({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "repeat(2, 1fr)",
          sm: "repeat(3, 1fr)",
          lg: "repeat(5, 1fr)",
        },
        gap: 2,
      }}
    >
      {children}
    </Box>
  );
}
