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
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";

import {
  BackButton,
  DetailField,
  ModulePageLayout,
  ViewDetailGrid,
  ViewPageSection,
} from "@/components/common";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  type Category,
  getCategory,
  getCategoryRowId,
} from "@/model/services/category";
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
        sx={{
          fontFamily: "monospace",
          fontSize: "0.875rem",
          wordBreak: "break-all",
        }}
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

export default function CategoryViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const hasValidId = useInvalidIdRedirect(id, routes.category.list());
  const [item, setItem] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    getCategory(id)
      .then(setItem)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (!hasValidId) {
    return null;
  }

  if (loading) {
    return (
      <ModulePageLayout
        title="Category"
        subtitle="Loading category details…"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Categories", href: routes.category.list() },
          { label: "Details" },
        ]}
        backButton={<BackButton fallback={routes.category.list()} />}
        showAds={false}
      >
        <ViewPageSection title="Category Information">
          <ViewDetailGrid>
            {Array.from({ length: 3 }).map((_, i) => (
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
        title="Category"
        subtitle="Category not found"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Categories", href: routes.category.list() },
          { label: "Not found" },
        ]}
        backButton={<BackButton fallback={routes.category.list()} />}
        showAds={false}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || "Category not found."}
        </Alert>
      </ModulePageLayout>
    );
  }

  const rowId = getCategoryRowId(item);
  const statusColor =
    item.status?.toLowerCase() === "active" ? "success" : "default";

  return (
    <ModulePageLayout
      title={item.category_name || "Category"}
      subtitle="Category details"
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Categories", href: routes.category.list() },
        { label: item.category_name || "Details" },
      ]}
      backButton={<BackButton fallback={routes.category.list()} />}
      error={error}
      onErrorClose={() => setError("")}
      action={
        <Button
          variant="contained"
          startIcon={<EditOutlinedIcon />}
          onClick={() => router.push(routes.category.edit(rowId))}
        >
          Edit
        </Button>
      }
    >
      <ViewPageSection title="Category Information" subtitle="Core category attributes">
        <ViewDetailGrid>
          <DetailField
            label="Category Name"
            icon={<CategoryOutlinedIcon />}
            value={item.category_name}
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

      <ViewPageSection title="Audit Information" subtitle="Creation and update history">
        <ViewDetailGrid>
          <DetailField
            label="Created By"
            icon={<PersonOutlinedIcon />}
            value={item.created_by || "Not available"}
          />
          <DetailField
            label="Updated By"
            icon={<PersonOutlinedIcon />}
            value={item.updated_by || "Not available"}
          />
          <DetailField
            label="Created At"
            icon={<CalendarMonthOutlinedIcon />}
            value={formatDate(item.createdAt)}
          />
          <DetailField
            label="Last Updated"
            icon={<HistoryOutlinedIcon />}
            value={formatDate(item.updatedAt)}
          />
        </ViewDetailGrid>
      </ViewPageSection>

      <ViewPageSection title="Record Information" subtitle="System identifiers">
        <ViewDetailGrid columns={{ xs: 1, sm: 1, md: 2 }}>
          <DetailField
            label="Record ID"
            icon={<TagOutlinedIcon />}
            value={
              <CopyableText value={item.id || item.uuid || item._id || "Not available"} />
            }
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
        </ViewDetailGrid>
      </ViewPageSection>
    </ModulePageLayout>
  );
}
