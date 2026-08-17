"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import TagOutlinedIcon from "@mui/icons-material/TagOutlined";

import {
  BackButton,
  DetailField,
  ModulePageLayout,
  ViewDetailGrid,
  ViewPageSection,
} from "@/components/common";
import { Skeleton } from "@/components/ui/Skeleton";
import { getRowId, getSpecificationValue, type SpecificationValue } from "@/model/api";
import { routes } from "@/lib/routes";
import { useInvalidIdRedirect } from "@/lib/navigation";

export default function SpecificationValueViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const hasValidId = useInvalidIdRedirect(id, routes.specificationValue.list());
  const [item, setItem] = useState<SpecificationValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    getSpecificationValue(id)
      .then(setItem)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  if (!hasValidId) return null;

  if (loading) {
    return (
      <ModulePageLayout
        title="Specification Value"
        subtitle="Loading value details…"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Specification Values", href: routes.specificationValue.list() },
          { label: "Details" },
        ]}
        backButton={<BackButton fallback={routes.specificationValue.list()} />}
        showAds={false}
      >
        <ViewPageSection title="Value Information">
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
        title="Specification Value"
        subtitle="Value not found"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Specification Values", href: routes.specificationValue.list() },
          { label: "Not found" },
        ]}
        backButton={<BackButton fallback={routes.specificationValue.list()} />}
        showAds={false}
      >
        <Alert severity="error">{error || "Specification value not found."}</Alert>
      </ModulePageLayout>
    );
  }

  const rowId = getRowId(item);

  return (
    <ModulePageLayout
      title={item.specification_value_name || "Specification Value"}
      subtitle="Specification value details"
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Specification Values", href: routes.specificationValue.list() },
        { label: item.specification_value_name || "Details" },
      ]}
      backButton={<BackButton fallback={routes.specificationValue.list()} />}
      error={error}
      onErrorClose={() => setError("")}
      action={
        <Button
          variant="contained"
          startIcon={<EditOutlinedIcon />}
          onClick={() => router.push(routes.specificationValue.edit(rowId))}
        >
          Edit
        </Button>
      }
    >
      <ViewPageSection title="Value Information" subtitle="Specification value attributes">
        <ViewDetailGrid>
          <DetailField
            label="Specification"
            icon={<CategoryOutlinedIcon />}
            value={item.specification?.specification_name || "—"}
          />
          <DetailField
            label="Value Name"
            icon={<TagOutlinedIcon />}
            value={item.specification_value_name}
          />
          <DetailField
            label="Status"
            icon={<TagOutlinedIcon />}
            value={
              <Chip
                size="small"
                label={item.status}
                color={item.status === "Active" ? "success" : "default"}
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            }
          />
        </ViewDetailGrid>
      </ViewPageSection>
    </ModulePageLayout>
  );
}
