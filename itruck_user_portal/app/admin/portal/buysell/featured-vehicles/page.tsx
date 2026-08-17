"use client";

import { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Chip from "@mui/material/Chip";
import Pagination from "@mui/material/Pagination";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
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
  fetchFeaturedVehiclesAdmin,
  removeFeaturedVehicleAdmin,
  updateFeaturedVehicleAdminStatus,
  type BuySellProduct,
} from "@/model/services/buysellapi";
import {
  DeleteIcon,
  ViewIcon,
  BlockIcon,
} from "@/components/ui/Icons";

type StatusFilter = "all" | "pending" | "active" | "expired" | "cancelled" | "rejected";

type Row = BuySellProduct & {
  placementId: string;
  vehicleLabel: string;
  sellerLabel: string;
  userDetails: string;
  requestLabel: string;
  expiryLabel: string;
  statusLabel: string;
};

const STATUS_FILTER_OPTIONS: SelectOption[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending Approval" },
  { value: "active", label: "Approved / Featured" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Disabled" },
  { value: "rejected", label: "Rejected" },
];

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN");
}

function statusColor(status: string): "success" | "warning" | "error" | "info" | "default" {
  if (status === "active") return "success";
  if (status === "pending") return "warning";
  if (status === "expired") return "info";
  if (status === "rejected" || status === "cancelled") return "error";
  return "default";
}

export default function AdminFeaturedVehiclesPage() {
  const { notify } = useNotification();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const {
    open: deleteOpen,
    target: deleteTarget,
    openWith: openDeleteConfirm,
    close: closeDeleteConfirm,
  } = useConfirmDialog<{ placementId: string; label: string }>();
  const {
    open: rejectOpen,
    target: rejectTarget,
    openWith: openRejectConfirm,
    close: closeRejectConfirm,
  } = useConfirmDialog<{ placementId: string; label: string }>();
  const [rejectReason, setRejectReason] = useState("");

  const mapRows = (items: BuySellProduct[]): Row[] =>
    items.map((item) => {
      const placement = item.placement || item.featured;
      const placementId = String(
        item.placement?.placementId ||
          item.placement?._id ||
          item.featured?.featuredPlacementId ||
          "",
      );
      const vehicleLabel =
        item.description?.trim() ||
        item.bsNumber ||
        String(item._id || item.id || "Vehicle");
      const requester = item.placement?.requester || item.featured?.requester;
      const statusLabel = String(
        item.placement?.status ||
          item.featured?.featuredStatus ||
          "—",
      );
      const source = String(item.placement?.source || item.featured?.source || "");
      return {
        ...item,
        placementId,
        vehicleLabel,
        sellerLabel: requester?.name || item.sellerName || "—",
        userDetails: [requester?.email, requester?.mobile].filter(Boolean).join(" · ") || "—",
        requestLabel: source === "free_plan" ? "Free Plan" : "Paid plan",
        expiryLabel: formatDate(
          placement?.featuredEndDate ||
            (placement as { expiresAt?: string })?.expiresAt,
        ),
        statusLabel,
      };
    });

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchFeaturedVehiclesAdmin({
        page,
        limit: 20,
        search: appliedSearch,
        status: statusFilter,
        sort: "newest",
      });
      setRows(mapRows(res.data ?? []));
      setTotalPages(res.pagination?.totalPages ?? 1);
    } catch (err) {
      notify({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to load featured vehicles",
      });
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, notify, page, statusFilter]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const approveRequest = async (row: Row) => {
    if (!row.placementId) return;
    try {
      await updateFeaturedVehicleAdminStatus(row.placementId, "approved");
      notify({
        type: "success",
        message: "Free Plan approved. Vehicle is now featured.",
      });
      await loadRows();
    } catch (err) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : "Approval failed",
      });
    }
  };

  const rejectRequest = async () => {
    if (!rejectTarget?.placementId) return;
    try {
      await updateFeaturedVehicleAdminStatus(
        rejectTarget.placementId,
        "rejected",
        rejectReason.trim() || undefined,
      );
      notify({
        type: "success",
        message: "Free Plan request rejected. Vehicle will stay out of Featured Vehicles.",
      });
      setRejectReason("");
      await loadRows();
    } catch (err) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : "Reject failed",
      });
      throw err;
    }
  };

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
    { id: "sellerLabel", label: "User", minWidth: 140 },
    { id: "userDetails", label: "User details", minWidth: 180 },
    { id: "requestLabel", label: "Request", minWidth: 110 },
    {
      id: "statusLabel",
      label: "Status",
      minWidth: 140,
      render: (row: Row) => (
        <Chip
          size="small"
          label={
            row.statusLabel === "pending"
              ? "Pending"
              : row.statusLabel === "active"
                ? "Approved / Featured"
                : row.statusLabel
          }
          color={statusColor(row.statusLabel)}
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

  const actions = (row: Row): DataTableAction<Row>[] => {
    const list: DataTableAction<Row>[] = [];
    if (row.statusLabel === "pending") {
      list.push({
        label: "Approve",
        icon: <CheckCircleOutlineIcon fontSize="small" />,
        color: "success",
        onClick: (r) => void approveRequest(r),
      });
      list.push({
        label: "Reject",
        icon: <HighlightOffIcon fontSize="small" />,
        color: "error",
        onClick: (r) =>
          openRejectConfirm({
            placementId: r.placementId,
            label: r.vehicleLabel,
          }),
      });
    }
    if (row.statusLabel === "active" || row.statusLabel === "cancelled") {
      list.push({
        label: "Toggle status",
        icon: <BlockIcon />,
        onClick: (r) => void toggleStatus(r),
      });
    }
    list.push({
      label: "View listing",
      icon: <ViewIcon />,
      onClick: (r) => {
        const pid = String(r._id || r.id || "");
        if (pid) window.open(routes.buysell.view(pid), "_blank");
      },
    });
    list.push({
      label: "Remove",
      icon: <DeleteIcon />,
      onClick: (r) =>
        openDeleteConfirm({
          placementId: r.placementId,
          label: r.vehicleLabel,
        }),
      color: "error",
    });
    return list;
  };

  return (
    <ModulePageLayout
      title="Featured Vehicles"
      subtitle="Review Free Plan requests and manage featured placements"
    >
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 2 }}>
        <TextField
          size="small"
          label="Search vehicle or seller"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setAppliedSearch(search.trim());
              setPage(1);
            }
          }}
          sx={{ minWidth: 260, flex: 1 }}
        />
        <SearchableSelect
          label="Filter"
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v as StatusFilter);
            setPage(1);
          }}
          options={STATUS_FILTER_OPTIONS}
          sx={{ minWidth: 180 }}
        />
        <Button
          variant="contained"
          onClick={() => {
            setAppliedSearch(search.trim());
            setPage(1);
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

      {totalPages > 1 ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, value) => setPage(value)}
            color="primary"
          />
        </Box>
      ) : null}

      <ConfirmDialog
        open={rejectOpen}
        title="Reject Free Plan request?"
        description={
          rejectTarget ? (
            <>
              Reject the Free Plan request for <strong>{rejectTarget.label}</strong>?
              The vehicle will not appear in Featured Vehicles.
            </>
          ) : undefined
        }
        confirmLabel="Reject"
        confirmColor="error"
        onConfirm={rejectRequest}
        onClose={() => {
          setRejectReason("");
          closeRejectConfirm();
        }}
      >
        <TextField
          size="small"
          label="Reason (optional)"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          fullWidth
          multiline
          minRows={2}
        />
      </ConfirmDialog>

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
