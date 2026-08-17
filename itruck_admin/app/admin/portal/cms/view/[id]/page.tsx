"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";

import {
  BackButton,
  DetailField,
  ModulePageLayout,
  ViewDetailGrid,
  ViewPageSection,
} from "@/components/common";
import { Skeleton } from "@/components/ui/Skeleton";
import { routes } from "@/lib/routes";
import { useInvalidIdRedirect } from "@/lib/navigation";
import { CMSPage, getCMSPage } from "@/model/services/cms";

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

export default function CMSViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const hasValidId = useInvalidIdRedirect(id, routes.cms.list());
  const [item, setItem] = useState<CMSPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    getCMSPage(id)
      .then((e) => setItem(e as CMSPage))
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
        title="CMS Page"
        subtitle="Loading page details…"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "CMS Pages", href: routes.cms.list() },
          { label: "Details" },
        ]}
        backButton={<BackButton fallback={routes.cms.list()} />}
        showAds={false}
      >
        <ViewPageSection title="Page Details">
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
        title="CMS Page"
        subtitle="Page not found"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "CMS Pages", href: routes.cms.list() },
          { label: "Not found" },
        ]}
        backButton={<BackButton fallback={routes.cms.list()} />}
        showAds={false}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          CMS page not found.
        </Alert>
      </ModulePageLayout>
    );
  }

  const isActive = (item.status ?? "active").toLowerCase() === "active";

  return (
    <ModulePageLayout
      title={item.page_title}
      subtitle="CMS page details"
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "CMS Pages", href: routes.cms.list() },
        { label: item.page_title },
      ]}
      backButton={<BackButton fallback={routes.cms.list()} />}
      error={error}
      onErrorClose={() => setError("")}
      action={
        <Button
          variant="contained"
          startIcon={<EditOutlinedIcon />}
          onClick={() => router.push(routes.cms.edit(id))}
        >
          Edit
        </Button>
      }
    >
      <ViewPageSection title="Page Details" subtitle="Title, slug, and status">
        <ViewDetailGrid>
          <DetailField
            label="Title"
            icon={<ArticleOutlinedIcon />}
            value={item.page_title}
          />
          <DetailField
            label="Slug"
            icon={<LinkOutlinedIcon />}
            value={<CopyableText value={item.slug} />}
          />
          <DetailField
            label="Status"
            icon={<TagOutlinedIcon />}
            value={
              <Chip
                size="small"
                label={item.status || "active"}
                color={isActive ? "success" : "default"}
                sx={{ fontWeight: 700, textTransform: "capitalize" }}
              />
            }
          />
        </ViewDetailGrid>
      </ViewPageSection>

      <ViewPageSection title="Content" subtitle="Page body and description">
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "10px",
            p: 2,
            bgcolor: "background.default",
            maxHeight: 360,
            overflowY: "auto",
            "& img": { maxWidth: "100%" },
          }}
        >
          {item.page_description ? (
            <Box
              // Description may contain HTML markup authored by admins.
              dangerouslySetInnerHTML={{ __html: item.page_description }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              No description provided.
            </Typography>
          )}
        </Box>
      </ViewPageSection>

      <ViewPageSection title="Record Information" subtitle="System identifiers and timestamps">
        <ViewDetailGrid columns={{ xs: 1, sm: 2, md: 2 }}>
          <DetailField
            label="Record ID"
            icon={<TagOutlinedIcon />}
            value={<CopyableText value={item.id || item._id || "Not available"} />}
          />
          {item._id ? (
            <DetailField
              label="Internal ID"
              icon={<TagOutlinedIcon />}
              value={<CopyableText value={item._id} />}
            />
          ) : null}
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
    </ModulePageLayout>
  );
}
