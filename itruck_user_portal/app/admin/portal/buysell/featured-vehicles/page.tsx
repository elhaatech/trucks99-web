"use client";

import { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { SearchableSelect, type SelectOption } from "@/components/common/SearchableSelect";
import {
  DataTable,
  ModulePageLayout,
  ConfirmDialog,
  type DataTableAction,
} from "@/components/common";
import { useNotification } from "@/hooks/useNotification";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { routes } from "@/lib/routes";
import {
  fetchFeaturedVehiclesAdminAll,
  removeFeaturedVehicleAdmin,
  updateFeaturedVehicleAdminStatus,
  type BuySellProduct,
} from "@/model/services/buysellapi";
import {
  DeleteIcon,
  ViewIcon,
  BlockIcon,
} from "@/components/ui/Icons";

type StatusFilter = "all" | "active" | "expired" | "cancelled";

type Row = BuySellProduct & {
  placementId: string;
  vehicleLabel: string;
  sellerLabel: string;
  expiryLabel: string;
  statusLabel: string;
};

const STATUS_FILTER_OPTIONS: SelectOption[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Disabled" },
];

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN");
}

export default function AdminFeaturedVehiclesPage() {
  const { notify } = useNotification();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const {
    open: deleteOpen,
    target: deleteTarget,
    openWith: openDeleteConfirm,
    close: closeDeleteConfirm,
  } = useConfirmDialog<{ placementId: string; label: string }>();

  const mapRows = (items: BuySellProduct[]): Row[] =>
    items.map((item) => {
      const placement = item.placement || item.featured;
      const placementId = String(
        item.placement?._id ||
          item.featured?.featuredPlacementId ||
          "",
      );
      const vehicleLabel =
        item.description?.trim() ||
        item.bsNumber ||
        String(item._id || item.id || "Vehicle");
      return {
        ...item,
        placementId,
        vehicleLabel,
        sellerLabel: item.sellerName || "—",
        expiryLabel: formatDate(
          placement?.featuredEndDate ||
            (placement as { expiresAt?: string })?.expiresAt,
        ),
        statusLabel: String(
          item.placement?.status ||
            item.featured?.featuredStatus ||
            "—",
        ),
      };
    });

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await fetchFeaturedVehiclesAdminAll({
        search: appliedSearch,
        status: statusFilter,
        sort: "newest",
      });
      setRows(mapRows(rows));
    } catch (err) {
      notify({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to load featured vehicles",
      });
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, notify, statusFilter]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const toggleStatus = async (row: Row) => {
    if (!row.placementId) return;
    const next = row.statusLabel === "active" ? "cancelled" : "active";
    try {
      await updateFeaturedVehicleAdminStatus(row.placementId, next);
      notify({
        type: "success",
        message:
          next === "active" ? "Featured vehicle enabled" : "Featured vehicle disabled",
      });
      await loadRows();
    } catch (err) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : "Update failed",
      });
    }
  };

  const confirmRemove = async () => {
    if (!deleteTarget?.placementId) return;
    await removeFeaturedVehicleAdmin(deleteTarget.placementId);
    notify({ type: "success", message: "Featured vehicle removed" });
    await loadRows();
  };

  const columns = [
    { id: "vehicleLabel", label: "Vehicle", minWidth: 180 },
    { id: "sellerLabel", label: "Seller", minWidth: 140 },
    {
      id: "statusLabel",
      label: "Status",
      minWidth: 100,
      render: (row: Row) => (
        <Chip
          size="small"
          label={row.statusLabel}
          color={
            row.statusLabel === "active"
              ? "success"
              : row.statusLabel === "expired"
                ? "warning"
                : "default"
          }
        />
      ),
    },
    { id: "expiryLabel", label: "Featured until", minWidth: 120 },
    {
      id: "paymentAmount",
      label: "Amount",
      minWidth: 90,
      render: (row: Row) =>
        `₹${Number(row.placement?.paymentAmount ?? row.featured?.paymentAmount ?? 0).toLocaleString("en-IN")}`,
    },
  ];

  const actions: DataTableAction<Row>[] = [
    {
      label: "Toggle status",
      icon: <BlockIcon />,
      onClick: (row) => void toggleStatus(row),
    },
    {
      label: "View listing",
      icon: <ViewIcon />,
      onClick: (row) => {
        const pid = String(row._id || row.id || "");
        if (pid) window.open(routes.buysell.view(pid), "_blank");
      },
    },
    {
      label: "Remove",
      icon: <DeleteIcon />,
      onClick: (row) =>
        openDeleteConfirm({
          placementId: row.placementId,
          label: row.vehicleLabel,
        }),
      color: "error",
    },
  ];

  return (
    <ModulePageLayout title="Featured Vehicles" subtitle="Manage paid featured placements">
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
        <TextField
          size="small"
          label="Search vehicle or seller"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setAppliedSearch(search.trim());
            }
          }}
          sx={{ minWidth: 260, flex: 1 }}
        />
        <SearchableSelect
          label="Filter"
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v as StatusFilter);
          }}
          options={STATUS_FILTER_OPTIONS}
          sx={{ minWidth: 160 }}
        />
        <Button
          variant="contained"
          onClick={() => {
            setAppliedSearch(search.trim());
          }}
          sx={{ textTransform: "none" }}
        >
          Apply
        </Button>
      </Box>

      <DataTable<Row>
        columns={columns}
        rows={rows}
        getRowId={(row) => row.placementId || String(row._id)}
        loading={loading}
        actions={actions}
        emptyMessage="No featured vehicle records found."
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Remove featured vehicle?"
        description={
          deleteTarget ? (
            <>
              Remove featured placement for <strong>{deleteTarget.label}</strong>? This
              cannot be undone.
            </>
          ) : undefined
        }
        confirmLabel="Remove"
        confirmColor="error"
        onConfirm={() => void confirmRemove()}
        onClose={closeDeleteConfirm}
      />
    </ModulePageLayout>
  );
}
