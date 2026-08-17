"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CampaignOutlinedIcon from "@mui/icons-material/CampaignOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import PriorityHighOutlinedIcon from "@mui/icons-material/PriorityHighOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import TagOutlinedIcon from "@mui/icons-material/TagOutlined";

import {
  getAdvertisement,
  type Advertisement,
} from "@/model/api";
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
import { AdvertisementStatusChip } from "../../_components/AdvertisementStatusChip";
import {
  formatDisplayDate,
  isVideoMedia,
  resolveMediaUrl,
} from "../../_components/interface/advertisementTypes";

export default function AdvertisementViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const hasValidId = useInvalidIdRedirect(id, routes.advertisement.list());
  const [item, setItem] = useState<Advertisement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    getAdvertisement(id)
      .then((ad) => setItem(ad))
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
        title="Advertisement"
        subtitle="Loading advertisement details…"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Advertisements", href: routes.advertisement.list() },
          { label: "Details" },
        ]}
        backButton={<BackButton fallback={routes.advertisement.list()} />}
        showAds={false}
      >
        <ViewPageSection title="Overview">
          <ViewDetailGrid>
            {Array.from({ length: 6 }).map((_, i) => (
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
        title="Advertisement"
        subtitle="Advertisement not found"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Advertisements", href: routes.advertisement.list() },
          { label: "Not found" },
        ]}
        backButton={<BackButton fallback={routes.advertisement.list()} />}
        showAds={false}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || "Advertisement not found."}
        </Alert>
      </ModulePageLayout>
    );
  }

  const mediaSrc = resolveMediaUrl(item.mediaUrl || "");
  const showVideo = isVideoMedia(item.adType, item.mediaUrl);

  return (
    <ModulePageLayout
      title={item.adTitle || "Advertisement"}
      subtitle="Advertisement details"
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Advertisements", href: routes.advertisement.list() },
        { label: item.adTitle || "Details" },
      ]}
      backButton={<BackButton fallback={routes.advertisement.list()} />}
      error={error}
      onErrorClose={() => setError("")}
      action={
        <Button
          variant="contained"
          startIcon={<EditOutlinedIcon />}
          onClick={() => router.push(routes.advertisement.edit(id))}
        >
          Edit
        </Button>
      }
      showAds={false}
    >
      <ViewPageSection title="Overview" subtitle="Core advertisement attributes">
        <ViewDetailGrid>
          <DetailField
            label="Ad Title"
            icon={<CampaignOutlinedIcon />}
            value={item.adTitle}
          />
          <DetailField
            label="Client"
            icon={<PersonOutlinedIcon />}
            value={item.clientName}
          />
          <DetailField
            label="Ad Type"
            icon={<TagOutlinedIcon />}
            value={
              item.adType ? (
                <Chip size="small" label={item.adType} variant="outlined" />
              ) : null
            }
          />
          <DetailField
            label="Display Location"
            icon={<PlaceOutlinedIcon />}
            value={item.displayLocation}
          />
          <DetailField
            label="Status"
            icon={<CampaignOutlinedIcon />}
            value={<AdvertisementStatusChip status={item.status} />}
          />
          <DetailField
            label="Live Now"
            icon={<CampaignOutlinedIcon />}
            value={
              <Chip
                size="small"
                label={item.isActive ? "Active" : "Inactive"}
                color={item.isActive ? "success" : "default"}
                variant="outlined"
              />
            }
          />
          {item.isExpired ? (
            <DetailField
              label="Expired"
              icon={<CalendarMonthOutlinedIcon />}
              value={
                <Chip size="small" label="Yes" color="warning" variant="outlined" />
              }
            />
          ) : null}
        </ViewDetailGrid>
      </ViewPageSection>

      <ViewPageSection title="Schedule & Priority" subtitle="Timing and display order">
        <ViewDetailGrid>
          <DetailField
            label="Start Date"
            icon={<CalendarMonthOutlinedIcon />}
            value={formatDisplayDate(item.startDate)}
          />
          <DetailField
            label="Expiry Date"
            icon={<CalendarMonthOutlinedIcon />}
            value={formatDisplayDate(item.expiryDate)}
          />
          <DetailField
            label="Display Priority"
            icon={<PriorityHighOutlinedIcon />}
            value={String(item.displayPriority ?? 0)}
          />
        </ViewDetailGrid>
      </ViewPageSection>

      <ViewPageSection title="Content" subtitle="Description, links, and media">
        <ViewDetailGrid columns={{ xs: 1, sm: 1, md: 1 }}>
          <DetailField
            label="Description"
            icon={<CampaignOutlinedIcon />}
            value={item.description}
            fullWidth
          />
          <DetailField
            label="Redirect URL"
            icon={<LinkOutlinedIcon />}
            value={
              item.redirectUrl ? (
                <Typography
                  component="a"
                  href={item.redirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="body2"
                  sx={{ color: "primary.main", wordBreak: "break-all" }}
                >
                  {item.redirectUrl}
                </Typography>
              ) : null
            }
            fullWidth
          />
        </ViewDetailGrid>

        {mediaSrc ? (
          <Box sx={{ mt: 2.5 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              Media Preview
            </Typography>
            {showVideo ? (
              <Box
                component="video"
                src={mediaSrc}
                controls
                sx={{
                  maxWidth: "100%",
                  maxHeight: 320,
                  borderRadius: "10px",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              />
            ) : (
              <Box
                component="img"
                src={mediaSrc}
                alt={item.adTitle}
                sx={{
                  maxWidth: "100%",
                  maxHeight: 320,
                  borderRadius: "10px",
                  border: "1px solid",
                  borderColor: "divider",
                  objectFit: "contain",
                }}
              />
            )}
          </Box>
        ) : null}
      </ViewPageSection>

      <ViewPageSection title="Record Information" subtitle="Identifiers and audit trail">
        <ViewDetailGrid>
          <DetailField
            label="Record ID"
            icon={<TagOutlinedIcon />}
            value={
              <Typography component="span" sx={{ fontFamily: "monospace" }}>
                {item.id || "Not available"}
              </Typography>
            }
          />
          <DetailField
            label="Created By"
            icon={<PersonOutlinedIcon />}
            value={
              item.createdBy?.name
                ? `${item.createdBy.name}${item.createdBy.role ? ` (${item.createdBy.role})` : ""}`
                : "Not available"
            }
          />
          <DetailField
            label="Created At"
            icon={<CalendarMonthOutlinedIcon />}
            value={formatDisplayDate(item.createdAt)}
          />
          <DetailField
            label="Updated At"
            icon={<CalendarMonthOutlinedIcon />}
            value={formatDisplayDate(item.updatedAt)}
          />
        </ViewDetailGrid>
      </ViewPageSection>
    </ModulePageLayout>
  );
}
