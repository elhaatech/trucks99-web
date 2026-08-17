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
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import ScaleOutlinedIcon from "@mui/icons-material/ScaleOutlined";
import TagOutlinedIcon from "@mui/icons-material/TagOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import BrokenImageOutlinedIcon from "@mui/icons-material/BrokenImageOutlined";

import {
  BackButton,
  DetailField,
  ModulePageLayout,
  ViewDetailGrid,
  ViewPageSection,
} from "@/components/common";
import { Skeleton } from "@/components/ui/Skeleton";
import { getVehicleType, type VehicleType } from "@/model/api";
import { resolveApiBase } from "@/model/services/common";
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

function getFileUrl(path?: string) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${resolveApiBase()}${path}`;
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

function VehicleImage({ src, alt }: { src: string; alt: string }) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) {
    return (
      <Box
        sx={{
          width: "100%",
          maxWidth: 320,
          height: 180,
          bgcolor: "action.hover",
          borderRadius: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          color: "text.disabled",
          border: "1px dashed",
          borderColor: "divider",
        }}
      >
        <BrokenImageOutlinedIcon sx={{ fontSize: 36 }} />
        <Typography variant="caption">No image available</Typography>
      </Box>
    );
  }
  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      sx={{ width: "100%", maxWidth: 320, height: 180, objectFit: "cover", borderRadius: 2, border: "1px solid", borderColor: "divider" }}
    />
  );
}

export default function VehicleTypeViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const hasValidId = useInvalidIdRedirect(id, routes.vehicleType.list());
  const [item, setItem] = useState<VehicleType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    getVehicleType(id)
      .then((v) => setItem(v as VehicleType))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  if (!hasValidId) return null;

  if (loading) {
    return (
      <ModulePageLayout
        title="Vehicle Type"
        subtitle="Loading vehicle type details…"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Vehicle Types", href: routes.vehicleType.list() },
          { label: "Details" },
        ]}
        backButton={<BackButton fallback={routes.vehicleType.list()} />}
        showAds={false}
      >
        <ViewPageSection title="Vehicle Type Information">
          <ViewDetailGrid>
            {Array.from({ length: 5 }).map((_, i) => (
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
        title="Vehicle Type"
        subtitle="Vehicle type not found"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Vehicle Types", href: routes.vehicleType.list() },
          { label: "Not found" },
        ]}
        backButton={<BackButton fallback={routes.vehicleType.list()} />}
        showAds={false}
      >
        <Alert severity="error">{error || "Vehicle type not found."}</Alert>
      </ModulePageLayout>
    );
  }

  const statusColor = item.status === "active" ? "success" : item.status === "inactive" ? "default" : "warning";
  const imageUrl = getFileUrl(item.image);

  return (
    <ModulePageLayout
      title={item.vehicle_type || "Vehicle Type"}
      subtitle="Vehicle type details"
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Vehicle Types", href: routes.vehicleType.list() },
        { label: item.vehicle_type || "Details" },
      ]}
      backButton={<BackButton fallback={routes.vehicleType.list()} />}
      error={error}
      onErrorClose={() => setError("")}
      action={
        <Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={() => router.push(routes.vehicleType.edit(id))}>
          Edit
        </Button>
      }
    >
      <ViewPageSection title="Vehicle Details" subtitle="Type, capacity, and description">
        <ViewDetailGrid>
          <DetailField label="Vehicle Type" icon={<LocalShippingOutlinedIcon />} value={item.vehicle_type} />
          <DetailField label="Description" icon={<DescriptionOutlinedIcon />} value={item.description || "No description provided"} />
          <DetailField
            label="Minimum Capacity"
            icon={<ScaleOutlinedIcon />}
            value={item.minimumCapacity ? `${item.minimumCapacity} tons` : undefined}
          />
          <DetailField
            label="Maximum Capacity"
            icon={<ScaleOutlinedIcon />}
            value={item.maximumCapacity ? `${item.maximumCapacity} tons` : undefined}
          />
          <DetailField
            label="Status"
            icon={<TagOutlinedIcon />}
            value={
              <Chip size="small" label={item.status || "unknown"} color={statusColor} sx={{ fontWeight: 700, textTransform: "capitalize" }} />
            }
          />
        </ViewDetailGrid>
      </ViewPageSection>

      <ViewPageSection title="Vehicle Image" subtitle="Associated vehicle type image">
        <VehicleImage src={imageUrl} alt={item.vehicle_type || "Vehicle"} />
      </ViewPageSection>

      <ViewPageSection title="Record Information" subtitle="System identifiers and timestamps">
        <ViewDetailGrid columns={{ xs: 1, sm: 2, md: 2 }}>
          <DetailField label="Record ID" icon={<TagOutlinedIcon />} value={<CopyableText value={item.id || item.uuid || "Not available"} />} fullWidth />
          {item._id ? (
            <DetailField label="Internal ID" icon={<TagOutlinedIcon />} value={<CopyableText value={item._id} />} fullWidth />
          ) : null}
          <DetailField label="Created At" icon={<CalendarMonthOutlinedIcon />} value={formatDate(item.createdAt)} />
          <DetailField label="Last Updated" icon={<HistoryOutlinedIcon />} value={formatDate(item.updatedAt)} />
        </ViewDetailGrid>
      </ViewPageSection>
    </ModulePageLayout>
  );
}
