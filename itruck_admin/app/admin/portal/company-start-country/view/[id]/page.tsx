"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import LocationCityOutlinedIcon from "@mui/icons-material/LocationCityOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import MapOutlinedIcon from "@mui/icons-material/MapOutlined";
import TagOutlinedIcon from "@mui/icons-material/TagOutlined";

import {
  BackButton,
  DetailField,
  ModulePageLayout,
  ViewDetailGrid,
  ViewPageSection,
} from "@/components/common";
import { Skeleton } from "@/components/ui/Skeleton";
import { getCompanyStartCountry, type CompanyStartCountry } from "@/model/api";
import { routes } from "@/lib/routes";
import { useInvalidIdRedirect } from "@/lib/navigation";

function formatDate(iso?: string) {
  if (!iso) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function CopyableText({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Typography component="span" sx={{ fontFamily: "monospace", fontSize: "0.875rem", wordBreak: "break-all" }}>
        {value}
      </Typography>
      <Tooltip title={copied ? "Copied!" : "Copy"}>
        <IconButton size="small" onClick={copy} aria-label="Copy">
          {copied ? (
            <CheckCircleOutlineIcon sx={{ fontSize: 14, color: "success.main" }} />
          ) : (
            <ContentCopyIcon sx={{ fontSize: 14, color: "action.disabled" }} />
          )}
        </IconButton>
      </Tooltip>
    </Box>
  );
}

export default function CompanyStartCountryViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const hasValidId = useInvalidIdRedirect(id, routes.companyStartCountry.list());
  const [item, setItem] = useState<CompanyStartCountry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    getCompanyStartCountry(id)
      .then(setItem)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  if (!hasValidId) return null;

  if (loading) {
    return (
      <ModulePageLayout
        title="Location"
        subtitle="Loading location details…"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Company Start Countries", href: routes.companyStartCountry.list() },
          { label: "Details" },
        ]}
        backButton={<BackButton fallback={routes.companyStartCountry.list()} />}
        showAds={false}
      >
        <Skeleton variant="rounded" height={200} />
      </ModulePageLayout>
    );
  }

  if (!item) {
    return (
      <ModulePageLayout
        title="Location"
        subtitle="Location not found"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Company Start Countries", href: routes.companyStartCountry.list() },
          { label: "Not found" },
        ]}
        backButton={<BackButton fallback={routes.companyStartCountry.list()} />}
        showAds={false}
      >
        <Alert severity="error">{error || "Location not found."}</Alert>
      </ModulePageLayout>
    );
  }

  const statusColor = item.status?.toLowerCase() === "active" ? "success" : "default";
  const locationLabel = [item.city, item.state, item.country].filter(Boolean).join(", ");

  return (
    <ModulePageLayout
      title={locationLabel || "Location"}
      subtitle="Company start country mapping details"
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Company Start Countries", href: routes.companyStartCountry.list() },
        { label: item.city || "Details" },
      ]}
      backButton={<BackButton fallback={routes.companyStartCountry.list()} />}
      error={error}
      onErrorClose={() => setError("")}
      action={
        <Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={() => router.push(routes.companyStartCountry.edit(id))}>
          Edit
        </Button>
      }
    >
      <ViewPageSection title="Location Information" subtitle="City, state, and country">
        <ViewDetailGrid>
          <DetailField label="City" icon={<LocationCityOutlinedIcon />} value={item.city || "Not specified"} />
          <DetailField label="State" icon={<MapOutlinedIcon />} value={item.state || "Not specified"} />
          <DetailField label="Country" icon={<PublicOutlinedIcon />} value={item.country || "Not specified"} />
          <DetailField
            label="Status"
            icon={<TagOutlinedIcon />}
            value={<Chip size="small" label={item.status || "unknown"} color={statusColor} sx={{ fontWeight: 700, textTransform: "capitalize" }} />}
          />
        </ViewDetailGrid>
      </ViewPageSection>

      <ViewPageSection title="Record Information" subtitle="System identifiers and timestamps">
        <ViewDetailGrid columns={{ xs: 1, sm: 2, md: 2 }}>
          <DetailField label="Record ID" icon={<TagOutlinedIcon />} value={<CopyableText value={item.id || item.uuid || item._id || "Not available"} />} fullWidth />
          <DetailField label="Created At" icon={<CalendarMonthOutlinedIcon />} value={formatDate(item.createdAt)} />
          <DetailField label="Last Updated" icon={<HistoryOutlinedIcon />} value={formatDate(item.updatedAt)} />
        </ViewDetailGrid>
      </ViewPageSection>
    </ModulePageLayout>
  );
}
