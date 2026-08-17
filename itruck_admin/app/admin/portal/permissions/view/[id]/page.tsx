"use client";

import { use, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";

import {
  BackButton,
  DetailField,
  ViewDetailGrid,
  ViewPageSection,
} from "@/components/common";
import { PageContainer, PageHeader, Spinner } from "@/components/ui";
import { routes } from "@/lib/routes";
import {
  getPermissionById,
  type PermissionGroup,
  DEFAULT_PERMISSION_TEMPLATE,
  type PermissionItem,
} from "@/model/services/permission";

export default function ViewPermissionPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const router = useRouter();

  const [group, setGroup] = useState<PermissionGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    getPermissionById(unwrappedParams.id)
      .then((data) => setGroup(data))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load permission group");
      })
      .finally(() => setLoading(false));
  }, [unwrappedParams.id]);

  const previewPermissions: PermissionItem[] = useMemo(() => {
    if (!group) return [];

    const merged = JSON.parse(JSON.stringify(DEFAULT_PERMISSION_TEMPLATE)) as PermissionItem[];
    const fetchedItems = group.permissions || [];

    for (const fetched of fetchedItems) {
      const t = (fetched.title_name || "").toLowerCase();
      const existingIdx = merged.findIndex((p) => p.title_name.toLowerCase() === t);

      const normalizedAccess = {
        create: Boolean(fetched.access?.create),
        view: Boolean(fetched.access?.view),
        edit: Boolean(fetched.access?.edit || fetched.access?.update),
        delete: Boolean(fetched.access?.delete),
        list: Boolean(fetched.access?.list),
      };

      if (existingIdx >= 0) {
        merged[existingIdx].access = normalizedAccess;
        if (fetched.display_name) merged[existingIdx].display_name = fetched.display_name;
      } else if (fetched.title_name) {
        merged.push({
          title_name: fetched.title_name,
          display_name: fetched.display_name || fetched.title_name,
          access: normalizedAccess,
        });
      }
    }
    return merged;
  }, [group]);

  const activeScopes = useMemo(
    () =>
      previewPermissions.filter((p) =>
        ["create", "view", "edit", "delete"].some((key) => Boolean(p.access?.[key as keyof typeof p.access])),
      ).length,
    [previewPermissions],
  );

  if (loading) {
    return (
      <PageContainer maxWidth={1000}>
        <Spinner label="Loading permission details…" fullHeight />
      </PageContainer>
    );
  }

  if (error || !group) {
    return (
      <PageContainer maxWidth={800}>
        <Alert severity="error" sx={{ mb: 2.5 }}>
          {error || "Permission group not found"}
        </Alert>
        <BackButton fallback={routes.permission.list()} label="Back to list" />
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth={1000}>
      <PageHeader
        title={group.name}
        subtitle="Permission group details and assigned feature access."
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Permission Groups", href: routes.permission.list() },
          { label: group.name },
        ]}
        backButton={<BackButton fallback={routes.permission.list()} />}
        action={
          <Button
            variant="contained"
            size="small"
            startIcon={<EditOutlinedIcon />}
            onClick={() => router.push(routes.permission.edit(group._id))}
          >
            Edit Group
          </Button>
        }
      />

      <ViewPageSection title="Group Information" subtitle="Basic details for this permission group">
        <ViewDetailGrid columns={{ xs: 1, sm: 2, md: 2 }}>
          <DetailField label="Group Name" value={group.name} icon={<ShieldOutlinedIcon fontSize="inherit" />} />
          <DetailField
            label="Created At"
            value={group.createdAt ? new Date(group.createdAt).toLocaleString() : undefined}
          />
          <DetailField
            label="Description"
            value={group.description || "No description provided."}
            fullWidth
          />
        </ViewDetailGrid>
      </ViewPageSection>

      <ViewPageSection
        title="Features & Access Rights"
        subtitle={`${activeScopes} of ${previewPermissions.length} modules have active scopes`}
      >
        {previewPermissions.length > 0 ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {previewPermissions.map((p, idx) => {
              const isActive = ["create", "view", "edit", "delete"].some((key) =>
                Boolean(p.access?.[key as keyof typeof p.access]),
              );
              return (
                <Box
                  key={idx}
                  sx={{
                    p: 2,
                    borderRadius: "10px",
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.default",
                    opacity: isActive ? 1 : 0.65,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 2,
                      alignItems: { xs: "flex-start", sm: "center" },
                      justifyContent: "space-between",
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 200 }}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {p.display_name || p.title_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                        {p.title_name}
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                      {(["create", "view", "edit", "delete"] as const).map((key) => {
                        const hasAccess = Boolean(p.access?.[key]);
                        return (
                          <Chip
                            key={key}
                            icon={hasAccess ? <CheckCircleIcon /> : <CancelIcon />}
                            label={key.charAt(0).toUpperCase() + key.slice(1)}
                            size="small"
                            color={hasAccess ? "success" : "default"}
                            variant={hasAccess ? "filled" : "outlined"}
                            sx={{
                              opacity: hasAccess ? 1 : 0.7,
                              "& .MuiChip-icon": { color: hasAccess ? "inherit" : "action.disabled" },
                            }}
                          />
                        );
                      })}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No features assigned to this permission group.
          </Typography>
        )}
      </ViewPageSection>
    </PageContainer>
  );
}
