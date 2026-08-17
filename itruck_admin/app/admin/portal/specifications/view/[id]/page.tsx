"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import TagOutlinedIcon from "@mui/icons-material/TagOutlined";

import {
  BackButton,
  DetailField,
  ModulePageLayout,
  ViewDetailGrid,
  ViewPageSection,
} from "@/components/common";
import { Skeleton } from "@/components/ui/Skeleton";
import { getSpecification, getRowId, type Specification } from "@/model/api";
import { routes } from "@/lib/routes";
import { useInvalidIdRedirect } from "@/lib/navigation";

export default function SpecificationViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const hasValidId = useInvalidIdRedirect(id, routes.specification.list());
  const [item, setItem] = useState<Specification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    getSpecification(id)
      .then(setItem)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id]);

  if (!hasValidId) return null;

  if (loading) {
    return (
      <ModulePageLayout
        title="Specification"
        subtitle="Loading specification details…"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Specifications", href: routes.specification.list() },
          { label: "Details" },
        ]}
        backButton={<BackButton fallback={routes.specification.list()} />}
        showAds={false}
      >
        <ViewPageSection title="Specification Information">
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
        title="Specification"
        subtitle="Specification not found"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Specifications", href: routes.specification.list() },
          { label: "Not found" },
        ]}
        backButton={<BackButton fallback={routes.specification.list()} />}
        showAds={false}
      >
        <Alert severity="error">{error || "Specification not found."}</Alert>
      </ModulePageLayout>
    );
  }

  const rowId = getRowId(item);

  return (
    <ModulePageLayout
      title={item.specification_name}
      subtitle="Specification details"
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Specifications", href: routes.specification.list() },
        { label: item.specification_name },
      ]}
      backButton={<BackButton fallback={routes.specification.list()} />}
      error={error}
      onErrorClose={() => setError("")}
      action={
        <>
          <Button
            variant="contained"
            startIcon={<EditOutlinedIcon />}
            onClick={() => router.push(routes.specification.edit(rowId))}
          >
            Edit
          </Button>
          {item.type === "selectable" ? (
            <Button
              variant="outlined"
              startIcon={<ListAltOutlinedIcon />}
              onClick={() => router.push(routes.specification.values(rowId))}
            >
              Manage Values
            </Button>
          ) : null}
        </>
      }
    >
      <ViewPageSection title="Specification Information" subtitle="Core specification attributes">
        <ViewDetailGrid>
          <DetailField
            label="Name"
            icon={<SettingsOutlinedIcon />}
            value={item.specification_name}
          />
          <DetailField
            label="Type"
            icon={<TagOutlinedIcon />}
            value={<Chip size="small" label={item.type} sx={{ fontWeight: 600 }} />}
          />
          <DetailField label="Required" value={item.is_required} />
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
