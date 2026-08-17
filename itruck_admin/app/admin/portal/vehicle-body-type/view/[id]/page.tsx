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
import DirectionsCarOutlinedIcon from "@mui/icons-material/DirectionsCarOutlined";
import TagOutlinedIcon from "@mui/icons-material/TagOutlined";
import BrokenImageOutlinedIcon from "@mui/icons-material/BrokenImageOutlined";

import {
  BackButton,
  DetailField,
  ModulePageLayout,
  ViewDetailGrid,
  ViewPageSection,
} from "@/components/common";
import { Skeleton } from "@/components/ui/Skeleton";
import { getVehicleBodyType, type VehicleBodyType } from "@/model/api";
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
      <Box sx={{ py: 4, textAlign: "center", color: "text.disabled", border: "1px dashed", borderColor: "divider", borderRadius: 2 }}>
        <BrokenImageOutlinedIcon sx={{ fontSize: 36, mb: 1 }} />
        <Typography variant="caption" display="block">No image available</Typography>
      </Box>
    );
  }
  return (
    <Box component="img" src={src} alt={alt} onError={() => setErrored(true)} sx={{ width: "100%", maxWidth: 320, height: 180, objectFit: "cover", borderRadius: 2, border: "1px solid", borderColor: "divider" }} />
  );
}

export default function VehicleBodyTypeViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const hasValidId = useInvalidIdRedirect(id, routes.vehicleBodyType.list());
  const [item, setItem] = useState<VehicleBodyType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    getVehicleBodyType(id)
      .then((v) => setItem(v as VehicleBodyType))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  if (!hasValidId) return null;

  if (loading) {
    return (
      <ModulePageLayout
        title="Vehicle Body Type"
        subtitle="Loading details…"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Vehicle Body Types", href: routes.vehicleBodyType.list() },
          { label: "Details" },
        ]}
        backButton={<BackButton fallback={routes.vehicleBodyType.list()} />}
        showAds={false}
      >
        <Skeleton variant="rounded" height={200} />
      </ModulePageLayout>
    );
  }

  if (!item) {
    return (
      <ModulePageLayout
        title="Vehicle Body Type"
        subtitle="Not found"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Vehicle Body Types", href: routes.vehicleBodyType.list() },
          { label: "Not found" },
        ]}
        backButton={<BackButton fallback={routes.vehicleBodyType.list()} />}
        showAds={false}
      >
        <Alert severity="error">{error || "Vehicle body type not found."}</Alert>
      </ModulePageLayout>
    );
  }

  const statusColor = item.status === "active" ? "success" : item.status === "inactive" ? "default" : "warning";
  const imageUrl = getFileUrl(item.image);

  return (
    <ModulePageLayout
      title={item.vehicle_name || "Vehicle Body Type"}
      subtitle="Vehicle body type details"
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Vehicle Body Types", href: routes.vehicleBodyType.list() },
        { label: item.vehicle_name || "Details" },
      ]}
      backButton={<BackButton fallback={routes.vehicleBodyType.list()} />}
      error={error}
      onErrorClose={() => setError("")}
      action={
        <Button variant="contained" startIcon={<EditOutlinedIcon />} onClick={() => router.push(routes.vehicleBodyType.edit(id))}>
          Edit
        </Button>
      }
    >
      <ViewPageSection title="Body Type Information" subtitle="Core vehicle body attributes">
        <ViewDetailGrid>
          <DetailField label="Vehicle Body Name" icon={<DirectionsCarOutlinedIcon />} value={item.vehicle_name} />
          <DetailField
            label="Status"
            icon={<TagOutlinedIcon />}
            value={<Chip size="small" label={item.status || "unknown"} color={statusColor} sx={{ fontWeight: 700, textTransform: "capitalize" }} />}
          />
          <DetailField label="Vehicle ID" icon={<TagOutlinedIcon />} value={item.vehicle_id || "—"} />
        </ViewDetailGrid>
      </ViewPageSection>

      <ViewPageSection title="Vehicle Image" subtitle="Associated body type image">
        <VehicleImage src={imageUrl} alt={item.vehicle_name || "Vehicle body"} />
      </ViewPageSection>

      <ViewPageSection title="Record Information" subtitle="System identifiers and timestamps">
        <ViewDetailGrid columns={{ xs: 1, sm: 2, md: 2 }}>
          <DetailField label="Record ID" icon={<TagOutlinedIcon />} value={<CopyableText value={item.id || item._id || "Not available"} />} fullWidth />
          <DetailField label="Created At" icon={<CalendarMonthOutlinedIcon />} value={formatDate(item.createdAt)} />
          <DetailField label="Last Updated" icon={<HistoryOutlinedIcon />} value={formatDate(item.updatedAt)} />
        </ViewDetailGrid>
      </ViewPageSection>
    </ModulePageLayout>
  );
}
