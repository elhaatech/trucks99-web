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
import TagOutlinedIcon from "@mui/icons-material/TagOutlined";
import GrassOutlinedIcon from "@mui/icons-material/GrassOutlined";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";

import {
  BackButton,
  DetailField,
  ModulePageLayout,
  ViewDetailGrid,
  ViewPageSection,
} from "@/components/common";
import { Skeleton } from "@/components/ui/Skeleton";
import { getMaterial, type Material } from "@/model/api";
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
      <Typography
        component="span"
        sx={{ fontFamily: "monospace", fontSize: "0.875rem", wordBreak: "break-all" }}
      >
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

export default function MaterialViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const hasValidId = useInvalidIdRedirect(id, routes.material.list());
  const [item, setItem] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    getMaterial(id)
      .then((m) => setItem(m as Material))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  if (!hasValidId) return null;

  if (loading) {
    return (
      <ModulePageLayout
        title="Material"
        subtitle="Loading material details…"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Materials", href: routes.material.list() },
          { label: "Details" },
        ]}
        backButton={<BackButton fallback={routes.material.list()} />}
        showAds={false}
      >
        <ViewPageSection title="Material Information">
          <ViewDetailGrid>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={72} />
            ))}
          </ViewDetailGrid>
        </ViewPageSection>
      </ModulePageLayout>
    );
  }

  if (!item) {
    return (
      <ModulePageLayout
        title="Material"
        subtitle="Material not found"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Materials", href: routes.material.list() },
          { label: "Not found" },
        ]}
        backButton={<BackButton fallback={routes.material.list()} />}
        showAds={false}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || "Material not found."}
        </Alert>
      </ModulePageLayout>
    );
  }

  const statusColor =
    item.status === "active" ? "success" : item.status === "inactive" ? "default" : "warning";

  return (
    <ModulePageLayout
      title={item.materials_type || "Material"}
      subtitle="Material details"
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Materials", href: routes.material.list() },
        { label: item.materials_type || "Details" },
      ]}
      backButton={<BackButton fallback={routes.material.list()} />}
      error={error}
      onErrorClose={() => setError("")}
      action={
        <Button
          variant="contained"
          startIcon={<EditOutlinedIcon />}
          onClick={() => router.push(routes.material.edit(id))}
        >
          Edit
        </Button>
      }
    >
      <ViewPageSection title="Material Information" subtitle="Core material attributes">
        <ViewDetailGrid>
          <DetailField
            label="Material Type"
            icon={<GrassOutlinedIcon />}
            value={item.materials_type}
          />
          <DetailField label="Commodity" icon={<TagOutlinedIcon />} value={item.commodity || "Not specified"} />
          <DetailField label="Subcommodity" icon={<TagOutlinedIcon />} value={item.subcommodity || "Not specified"} />
          <DetailField
            label="Insurance Available"
            icon={<SecurityOutlinedIcon />}
            value={
              <Chip
                size="small"
                label={item.is_insurance_available ? "Yes — Covered" : "No — Not Covered"}
                color={item.is_insurance_available ? "success" : "default"}
                variant={item.is_insurance_available ? "filled" : "outlined"}
                sx={{ fontWeight: 700 }}
              />
            }
          />
          <DetailField
            label="Status"
            icon={<TagOutlinedIcon />}
            value={
              <Chip
                size="small"
                label={item.status || "unknown"}
                color={statusColor}
                sx={{ fontWeight: 700, textTransform: "capitalize" }}
              />
            }
          />
        </ViewDetailGrid>
      </ViewPageSection>

      <ViewPageSection title="Record Information" subtitle="System identifiers and timestamps">
        <ViewDetailGrid columns={{ xs: 1, sm: 2, md: 2 }}>
          <DetailField
            label="Record ID"
            icon={<TagOutlinedIcon />}
            value={<CopyableText value={item.id || item._id || "Not available"} />}
            fullWidth
          />
          {item._id ? (
            <DetailField
              label="Internal ID"
              icon={<TagOutlinedIcon />}
              value={<CopyableText value={item._id} />}
              fullWidth
            />
          ) : null}
          <DetailField label="Created At" icon={<CalendarMonthOutlinedIcon />} value={formatDate(item.createdAt)} />
          <DetailField label="Last Updated" icon={<HistoryOutlinedIcon />} value={formatDate(item.updatedAt)} />
        </ViewDetailGrid>
      </ViewPageSection>
    </ModulePageLayout>
  );
}
