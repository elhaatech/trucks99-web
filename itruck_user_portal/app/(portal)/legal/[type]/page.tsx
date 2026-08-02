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
        p: { xs: 2.5, md: 3.5 },
        borderRadius: "24px",
        border: `1px solid ${T.color.border}`,
        bgcolor: T.color.surface,
        boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.02)",
        transition: "all 0.3s ease",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0px 8px 30px rgba(0, 0, 0, 0.06)",
          borderColor: "rgba(37, 99, 235, 0.2)",
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, mb: 1.5 }}>
        <Box
          sx={{
            minWidth: 40,
            height: 40,
            borderRadius: "12px",
            background: "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: 16,
            flexShrink: 0,
            boxShadow: "0px 4px 12px rgba(37, 99, 235, 0.3)",
          }}
        >
          {number}
        </Box>
        <Typography sx={{ fontWeight: 800, fontSize: { xs: 18, md: 20 }, color: T.color.textPrimary, pt: 0.5, letterSpacing: "-0.01em" }}>
          {title}
        </Typography>
      </Box>

      {content ? (
        <Typography
          sx={{
            color: T.color.textSecondary,
            fontSize: 15,
            lineHeight: 1.8,
            whiteSpace: "pre-line",
            pl: { xs: 0, sm: 7 },
            mb: bullets.length ? 2 : 0,
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
            pl: { xs: 3, sm: 9 },
            color: T.color.textSecondary,
            fontSize: 15,
            lineHeight: 1.8,
            "& li": { 
              mb: 1,
              "&::marker": { color: "#2563eb" }
            },
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
    <Box sx={{ maxWidth: 900, mx: "auto", pb: 6 }}>
      <Box sx={{ 
        textAlign: "center", 
        mb: { xs: 4, md: 6 },
        py: { xs: 4, md: 6 },
        px: 2,
        borderRadius: "24px",
        background: "linear-gradient(180deg, rgba(37, 99, 235, 0.05) 0%, rgba(255, 255, 255, 0) 100%)",
        border: "1px solid rgba(37, 99, 235, 0.1)"
      }}>
        <Typography sx={{ 
          fontWeight: 900, 
          fontSize: { xs: 32, md: 48 }, 
          color: T.color.textPrimary,
          letterSpacing: "-0.02em",
          background: "linear-gradient(90deg, #1e3a8a 0%, #2563eb 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          mb: 1.5
        }}>
          {doc.title}
        </Typography>
        {doc.subtitle ? (
          <Typography sx={{ color: T.color.textSecondary, mt: 1, mb: 2, fontSize: { xs: 16, md: 18 }, fontWeight: 500, maxWidth: 600, mx: "auto" }}>
            {doc.subtitle}
          </Typography>
        ) : null}
        {updatedLabel ? (
          <Box sx={{ 
            display: "inline-block", 
            px: 2, 
            py: 0.75, 
            bgcolor: "rgba(37, 99, 235, 0.1)", 
            borderRadius: "20px",
            color: "#2563eb",
            fontSize: 13,
            fontWeight: 600
          }}>
            Last updated: {updatedLabel}
          </Box>
        ) : null}
      </Box>

      {doc.intro ? (
        <Typography
          sx={{
            color: T.color.textSecondary,
            fontSize: 16,
            lineHeight: 1.8,
            mb: 5,
            px: { xs: 1, md: 2 },
            textAlign: "center",
          }}
        >
          {doc.intro}
        </Typography>
      ) : null}

      <Box
        sx={{
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
              mt: 2,
              p: 4,
              borderRadius: "24px",
              background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
              border: `1px solid ${T.color.border}`,
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 20, color: T.color.textPrimary, mb: 0.5 }}>
                {doc.contactLabel || "Contact us"}
              </Typography>
              <Typography sx={{ color: T.color.textSecondary, fontSize: 14 }}>
                We're here to help if you have any questions.
              </Typography>
            </Box>
            <Box
              component="a"
              href={`mailto:${doc.contactEmail}`}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1.5,
                bgcolor: "#fff",
                color: "#2563eb",
                px: 3,
                py: 1.5,
                borderRadius: "12px",
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 15,
                boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.05)",
                transition: "all 0.2s",
                "&:hover": { 
                  transform: "translateY(-2px)",
                  boxShadow: "0px 6px 16px rgba(37, 99, 235, 0.15)",
                },
              }}
            >
              <EmailOutlinedIcon />
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
