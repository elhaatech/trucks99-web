"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { Spinner } from "@/components/ui";
import BuySellForm from "@/app/admin/portal/buysell/_components/buysellcolumnsForm/buysellForm";
import { VehicleGrid } from "@/app/common/components/buysell";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { PRODUCT_THEME as T } from "@/lib/theme";
import {
  deleteBuySellProducts,
  getBuySellList,
  getBuySellRowId,
  type BuySellProduct,
} from "@/model/services/buysellapi";
import { toBuySellListPayload } from "@/lib/buySellListUtils";
import { EMPTY_FILTERS } from "@/app/admin/portal/buysell/_components/interface/buysell_interface";
import { useNotification } from "@/hooks/useNotification";
import { getProductTitle } from "@/app/common/components/buysell/utils";

function SellVehicleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notify } = useNotification();

  const isCreate = searchParams.get("tab") === "create";
  const [products, setProducts] = useState<BuySellProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<BuySellProduct | null>(null);

  const loadListings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBuySellList(
        toBuySellListPayload({ ...EMPTY_FILTERS, usear_type: "sell" }),
      );
      setProducts(res ?? []);
    } catch (err) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to load listings",
      });
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    if (!isCreate) {
      void loadListings();
    }
  }, [isCreate, loadListings]);

  const handleCreateSuccess = () => {
    notify({ type: "success", message: "Vehicle listed successfully." });
    router.replace(userProductRoutes.sellVehicle());
  };

  const handleEdit = useCallback(
    (productId: string) => {
      router.push(userProductRoutes.edit(productId));
    },
    [router],
  );

  const handleDeleteRequest = useCallback(
    (productId: string) => {
      const product = products.find((p) => getBuySellRowId(p) === productId);
      if (product) setDeleteTarget(product);
    },
    [products],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;

    const id = getBuySellRowId(deleteTarget);
    setDeletingIds((prev) => new Set(prev).add(id));
    try {
      await deleteBuySellProducts([id]);
      notify({ type: "success", message: "Listing deleted successfully." });
      setDeleteTarget(null);
      await loadListings();
    } catch (err) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to delete listing",
      });
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [deleteTarget, loadListings, notify]);

  if (isCreate) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push(userProductRoutes.sellVehicle())}
          sx={{ mb: 2, textTransform: "none", fontWeight: 600, color: T.color.textSecondary }}
        >
          Back to my listings
        </Button>

        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 24, color: T.color.textPrimary }}>
            List New Vehicle
          </Typography>
          <Typography sx={{ color: T.color.textSecondary, mt: 0.5 }}>
            Add photos, price, and details to publish your vehicle on TRUCK99.
          </Typography>
        </Box>

        <BuySellForm
          mode="create"
          requireAuth
          loginHref="/"
          cancelHref={userProductRoutes.sellVehicle()}
          backLabel="Back to my listings"
          onSuccess={handleCreateSuccess}
        />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 24, color: T.color.textPrimary }}>
          Sell Vehicle
        </Typography>
        <Typography sx={{ color: T.color.textSecondary, mt: 0.5 }}>
          Manage your active ads and list new vehicles.
        </Typography>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => router.push(userProductRoutes.sellVehicle("create"))}
          sx={{ textTransform: "none", fontWeight: 600 }}
        >
          List New Vehicle
        </Button>
      </Box>

      <VehicleGrid
        products={products}
        loading={loading}
        layout="grid"
        onProductClick={(id) => router.push(userProductRoutes.view(id))}
        onEdit={handleEdit}
        onDelete={handleDeleteRequest}
        deletingIds={deletingIds}
        emptyTitle="No listings yet"
        emptyDescription='Tap "List New Vehicle" to create your first ad on TRUCK99.'
      />

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete listing?</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: T.color.textSecondary, lineHeight: 1.6 }}>
            {deleteTarget
              ? `Remove "${getProductTitle(deleteTarget)}" from your listings? This cannot be undone.`
              : "Remove this listing?"}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void handleConfirmDelete()}
            disabled={deleteTarget ? deletingIds.has(getBuySellRowId(deleteTarget)) : false}
            sx={{ textTransform: "none" }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default function SellVehiclePage() {
  return (
    <Suspense fallback={<Spinner label="Loading…" />}>
      <SellVehicleContent />
    </Suspense>
  );
}
