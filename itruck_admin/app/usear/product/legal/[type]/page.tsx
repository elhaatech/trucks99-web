"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "next/link";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";
import { userProductRoutes } from "@/lib/userProductRoutes";
import {
  formatLegalUpdatedDate,
  getLegalDocument,
  parseLegalPageType,
  type LegalDocument,
  type LegalType,
} from "@/model/services/legal";

function LegalSectionBlock({
  number,
  title,
  content,
  bullets,
}: {
  number: number;
  title: string;
  content: string;
  bullets: string[];
}) {
  return (
    <Box
      component="section"
      sx={{
        scrollMarginTop: 24,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 1 }}>
        <Box
          sx={{
            minWidth: 32,
            height: 32,
            borderRadius: "50%",
            bgcolor: "rgba(37, 99, 235, 0.1)",
            color: INFO,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          {number}
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: { xs: 16, md: 18 }, color: T.color.textPrimary, pt: 0.35 }}>
          {title}
        </Typography>
      </Box>

      {content ? (
        <Typography
          sx={{
            color: T.color.textSecondary,
            fontSize: 14,
            lineHeight: 1.75,
            whiteSpace: "pre-line",
            pl: { xs: 0, sm: 5.5 },
            mb: bullets.length ? 1 : 0,
          }}
        >
          {content}
        </Typography>
      ) : null}

      {bullets.length ? (
        <Box
          component="ul"
          sx={{
            m: 0,
            pl: { xs: 2.5, sm: 7 },
            color: T.color.textSecondary,
            fontSize: 14,
            lineHeight: 1.75,
            "& li": { mb: 0.75 },
          }}
        >
          {bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

export default function LegalPage() {
  const params = useParams<{ type: string }>();
  const pageType = useMemo(() => parseLegalPageType(params?.type), [params?.type]);

  const [doc, setDoc] = useState<LegalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!pageType) {
      setLoading(false);
      setError("Page not found. Choose Terms or Privacy Policy.");
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError("");

    void getLegalDocument(pageType as LegalType, controller.signal)
      .then(setDoc)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load document");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [pageType]);

  const updatedLabel = formatLegalUpdatedDate(doc?.updatedAt);
  const otherType: LegalType = pageType === "terms" ? "privacy" : "terms";
  const otherLabel = otherType === "terms" ? "Terms & Conditions" : "Privacy Policy";

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !doc) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || "Document unavailable"}
        </Alert>
        <Typography sx={{ fontSize: 14, color: T.color.textSecondary }}>
          View{" "}
          <Link href={userProductRoutes.legal("terms")} style={{ color: INFO, fontWeight: 600 }}>
            Terms & Conditions
          </Link>{" "}
          or{" "}
          <Link href={userProductRoutes.legal("privacy")} style={{ color: INFO, fontWeight: 600 }}>
            Privacy Policy
          </Link>
          .
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 860, mx: "auto" }}>
      <Typography sx={{ fontWeight: 800, fontSize: { xs: 24, md: 32 }, color: T.color.textPrimary }}>
        {doc.title}
      </Typography>
      {doc.subtitle ? (
        <Typography sx={{ color: T.color.textSecondary, mt: 0.75, mb: 1, fontSize: { xs: 14, md: 16 } }}>
          {doc.subtitle}
        </Typography>
      ) : null}
      {updatedLabel ? (
        <Typography sx={{ fontSize: 12, color: T.color.textMuted, mb: doc.intro ? 1.5 : 3 }}>
          Last updated: {updatedLabel}
        </Typography>
      ) : (
        <Box sx={{ mb: doc.intro ? 1.5 : 3 }} />
      )}

      {doc.intro ? (
        <Typography
          sx={{
            color: T.color.textSecondary,
            fontSize: 14,
            lineHeight: 1.75,
            mb: 3,
            maxWidth: 760,
          }}
        >
          {doc.intro}
        </Typography>
      ) : null}

      <Box
        sx={{
          p: { xs: 2, md: 3 },
          borderRadius: T.radius.lg,
          border: `1px solid ${T.color.border}`,
          bgcolor: T.color.surface,
          boxShadow: T.shadow.card,
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        {doc.sections.map((section) => (
          <LegalSectionBlock key={section.number} {...section} />
        ))}

        {doc.contactEmail ? (
          <Box
            sx={{
              mt: 1,
              pt: 2.5,
              borderTop: `1px solid ${T.color.border}`,
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: 16, color: T.color.textPrimary, mb: 1 }}>
              {doc.contactLabel || "Contact us"}
            </Typography>
            <Box
              component="a"
              href={`mailto:${doc.contactEmail}`}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                color: INFO,
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 14,
                "&:hover": { textDecoration: "underline" },
              }}
            >
              <EmailOutlinedIcon fontSize="small" />
              {doc.contactEmail}
            </Box>
          </Box>
        ) : null}
      </Box>

      <Typography sx={{ mt: 3, fontSize: 13, color: T.color.textSecondary }}>
        Also read our{" "}
        <Link href={userProductRoutes.legal(otherType)} style={{ color: INFO, fontWeight: 600 }}>
          {otherLabel}
        </Link>
        .
      </Typography>
    </Box>
  );
}
