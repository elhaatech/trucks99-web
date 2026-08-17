"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LocalOfferOutlinedIcon from "@mui/icons-material/LocalOfferOutlined";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import ScheduleOutlinedIcon from "@mui/icons-material/ScheduleOutlined";
import TagOutlinedIcon from "@mui/icons-material/TagOutlined";

import {
  BackButton,
  DetailField,
  ModulePageLayout,
  ViewDetailGrid,
  ViewPageSection,
} from "@/components/common";
import { Skeleton } from "@/components/ui/Skeleton";
import { routes } from "@/lib/routes";
import { getSubscriptionAll, type Subscription } from "@/model/services/subscription";
import { SubscriptionItemRow } from "../../_components/subscriptionList/subscriptionColumns";

export default function SubscriptionViewPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [item, setItem] = useState<SubscriptionItemRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    getSubscriptionAll()
      .then((docs: Subscription[]) => {
        for (const doc of docs) {
          for (const [fieldKey, items] of Object.entries(doc.subscriptions)) {
            const found = items.find((i) => i.id === id);
            if (found) {
              setItem({
                id: found.id,
                docId: doc._id,
                packageName: found.packageName,
                packageType: found.packageType,
                fieldName: fieldKey,
                price: found.price,
                durationDays: found.durationDays,
                status: found.status,
                description: found.description,
              });
              return;
            }
          }
        }
        setError("Subscription item not found.");
      })
      .catch(() => setError("Failed to load subscription."))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <ModulePageLayout
        title="Subscription"
        subtitle="Loading subscription details…"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Subscriptions", href: routes.subscription.list() },
          { label: "Details" },
        ]}
        backButton={<BackButton fallback={routes.subscription.list()} />}
        showAds={false}
      >
        <Skeleton variant="rounded" height={200} />
      </ModulePageLayout>
    );
  }

  if (error || !item) {
    return (
      <ModulePageLayout
        title="Subscription"
        subtitle="Subscription not found"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Subscriptions", href: routes.subscription.list() },
          { label: "Not found" },
        ]}
        backButton={<BackButton fallback={routes.subscription.list()} />}
        showAds={false}
      >
        <Alert severity="error">{error || "Item not found."}</Alert>
      </ModulePageLayout>
    );
  }

  const typeColors: Record<string, string> = {
    match_load: "#4f46e5",
    match_truck: "#0891b2",
    match_product: "#059669",
  };
  const typeColor = typeColors[item.packageType] || "primary.main";

  return (
    <ModulePageLayout
      title={item.packageName}
      subtitle={`Subscription package — ${item.fieldName}`}
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Subscriptions", href: routes.subscription.list() },
        { label: item.packageName },
      ]}
      backButton={<BackButton fallback={routes.subscription.list()} />}
      action={
        <Button
          variant="contained"
          startIcon={<EditOutlinedIcon />}
          onClick={() => router.push(routes.subscription.edit(item.id))}
        >
          Edit
        </Button>
      }
    >
      <ViewPageSection title="Package Information" subtitle="Subscription package details">
        <ViewDetailGrid>
          <DetailField label="Package Name" icon={<LocalOfferOutlinedIcon />} value={item.packageName} />
          <DetailField label="Document ID" icon={<TagOutlinedIcon />} value={item.docId} />
          <DetailField
            label="Field Name"
            icon={<TagOutlinedIcon />}
            value={<Chip size="small" label={item.fieldName} color="primary" variant="outlined" sx={{ fontWeight: 600 }} />}
          />
          <DetailField
            label="Package Type"
            icon={<TagOutlinedIcon />}
            value={
              <Chip
                size="small"
                label={item.packageType.replace("match_", "")}
                sx={{ fontWeight: 600, bgcolor: `${typeColor}18`, color: typeColor, textTransform: "capitalize" }}
              />
            }
          />
          <DetailField label="Price" icon={<PaymentsOutlinedIcon />} value={`₹${item.price.toLocaleString("en-IN")}`} />
          <DetailField label="Duration" icon={<ScheduleOutlinedIcon />} value={`${item.durationDays} days`} />
          <DetailField
            label="Status"
            icon={<TagOutlinedIcon />}
            value={
              <Chip
                size="small"
                label={item.status}
                color={item.status === "active" ? "success" : "warning"}
                sx={{ fontWeight: 700, textTransform: "capitalize" }}
              />
            }
          />
          {item.description ? (
            <DetailField label="Description" value={item.description} fullWidth />
          ) : null}
        </ViewDetailGrid>
      </ViewPageSection>
    </ModulePageLayout>
  );
}
