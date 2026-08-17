"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import { BackButton, DetailField, ModulePageLayout, ViewDetailGrid, ViewPageSection } from "@/components/common";
import { Spinner } from "@/components/ui";
import { useToast } from "@/lib/toast";
import { createTruckRoutes, deleteTruckRoute, getTruck, getTruckRoutes, updateTruckRoute, type Truck, type TruckRoute } from "@/model/api";
import FormAddressField from "@/components/common/Formaddressfield";
import FormTextField from "@/components/common/Formtextfield";
import { FormDialog } from "@/components/ui";
import { routes as appRoutes } from "@/lib/routes";
import TruckRoutesTable from "./TruckRoutesTable";

export function TruckRoutePage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = typeof params?.id === "string" ? params.id : "";

  const [truck, setTruck] = useState<Truck | null>(null);
  const [routes, setRoutes] = useState<TruckRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editingRoute, setEditingRoute] = useState<TruckRoute | null>(null);
  const [viewRoute, setViewRoute] = useState<TruckRoute | null>(null);

  const [fromAddress, setFromAddress] = useState("");
  const [fromLat, setFromLat] = useState("0.0000");
  const [fromLang, setFromLang] = useState("0.0000");
  const [toAddress, setToAddress] = useState("");
  const [toLat, setToLat] = useState("0.0000");
  const [toLang, setToLang] = useState("0.0000");
  const [price, setPrice] = useState("");

  const load = () => {
    if (!id) {
      setLoading(false);
      setError("Invalid truck id.");
      return;
    }
    setLoading(true);
    setError("");
    Promise.all([getTruck(id), getTruckRoutes(id)])
      .then(([t, r]) => {
        setTruck(t as Truck);
        setRoutes(r || []);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Failed to load truck routes";
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleCreateRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setError("");
    if (!fromAddress.trim() || !toAddress.trim()) {
      const msg = "From and To addresses are required.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setSubmitting(true);
    const payload = {
      from: {
        address: fromAddress.trim(),
        lat: fromLat || "0.0000",
        lang: fromLang || "0.0000",
      },
      to: {
        address: toAddress.trim(),
        lat: toLat || "0.0000",
        lang: toLang || "0.0000",
      },
      price: price.trim() || "0",
    };

    const routeId = editingRoute ? String(editingRoute._id ?? editingRoute.id ?? "") : "";

    try {
      if (routeId) {
        await updateTruckRoute(id, routeId, payload);
        toast.success("Route updated successfully.");
      } else {
        await createTruckRoutes(id, [payload]);
        toast.success("Route created successfully.");
      }

      setFromAddress("");
      setFromLat("0.0000");
      setFromLang("0.0000");
      setToAddress("");
      setToLat("0.0000");
      setToLang("0.0000");
      setPrice("");
      setEditingRoute(null);
      load();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : routeId
            ? "Failed to update route"
            : "Failed to create route";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleView = (route: TruckRoute) => {
    setViewRoute(route);
  };

  const handleEdit = (route: TruckRoute) => {
    setEditingRoute(route);
    setFromAddress(route.from?.address || "");
    setFromLat(route.from?.lat ?? "0.0000");
    setFromLang(String((route.from as { lng?: string; lang?: string })?.lng ?? route.from?.lang ?? "0.0000"));
    setToAddress(route.to?.address || "");
    setToLat(route.to?.lat ?? "0.0000");
    setToLang(String((route.to as { lng?: string; lang?: string })?.lng ?? route.to?.lang ?? "0.0000"));
    setPrice(route.price ?? "");
  };

  const handleCancelEdit = () => {
    setEditingRoute(null);
    setFromAddress("");
    setFromLat("0.0000");
    setFromLang("0.0000");
    setToAddress("");
    setToLat("0.0000");
    setToLang("0.0000");
    setPrice("");
  };

  const handleDelete = async (route: TruckRoute) => {
    const routeId = String(route._id ?? route.id ?? "");
    if (!routeId) return;
    if (!window.confirm("Are you sure you want to delete this route?")) return;

    setDeletingId(routeId);
    setError("");
    try {
      await deleteTruckRoute(id, routeId);
      toast.danger("Route deleted successfully.");
      load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete route";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
  };

  if (!id) {
    return (
      <ModulePageLayout
        title="Truck Routes"
        subtitle="Invalid truck id"
        breadcrumbs={[
          { label: "Dashboard", href: appRoutes.dashboard() },
          { label: "Trucks", href: appRoutes.truck.list() },
          { label: "Routes" },
        ]}
        backButton={<BackButton fallback={appRoutes.truck.list()} />}
        showAds={false}
      >
        <Alert severity="error">Invalid truck id.</Alert>
      </ModulePageLayout>
    );
  }

  return (
    <ModulePageLayout
      title="Truck Routes"
      subtitle={truck?.registrationNumber ? `Routes for ${truck.registrationNumber}` : "Manage from/to routes and price for this truck."}
      breadcrumbs={[
        { label: "Dashboard", href: appRoutes.dashboard() },
        { label: "Trucks", href: appRoutes.truck.list() },
        { label: truck?.registrationNumber || "Routes" },
      ]}
      backButton={<BackButton fallback={appRoutes.truck.list()} label="Back to truck list" />}
      error={error}
      onErrorClose={() => setError("")}
    >
      <Typography variant="body2" sx={{ mb: 2 }}>Truck ID: {id}</Typography>

      <Box
        component="form"
        onSubmit={handleCreateRoute}
        sx={{
          mb: 3,
          p: 2,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 2,
          "& .fullWidth": { gridColumn: "1 / -1" },
        }}
      >
        {editingRoute && (
          <Typography variant="body2" color="primary" className="fullWidth" sx={{ mb: 1 }}>
            Editing route — click Update to save or Cancel to add a new route.
          </Typography>
        )}

        <FormAddressField
          label="From (address)"
          value={fromAddress}
          onChange={setFromAddress}
          onPlaceSelect={(addr, { lat, lng }) => {
            setFromAddress(addr);
            setFromLat(String(lat ?? 0));
            setFromLang(String(lng ?? 0));
          }}
          required
        />

        <FormAddressField
          label="To (address)"
          value={toAddress}
          onChange={setToAddress}
          onPlaceSelect={(addr, { lat, lng }) => {
            setToAddress(addr);
            setToLat(String(lat ?? 0));
            setToLang(String(lng ?? 0));
          }}
          required
        />

        <FormTextField
          label="Price (₹)"
          value={price}
          onChange={setPrice}
          type="number"
        />

        <Box className="fullWidth" sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1 }}>
          {editingRoute && (
            <Button type="button" variant="outlined" onClick={handleCancelEdit} disabled={submitting}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? "Saving…" : editingRoute ? "Update Route" : "Add Route"}
          </Button>
        </Box>
      </Box>

      <TruckRoutesTable
        routes={routes}
        loading={loading || !!deletingId}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {viewRoute && (
        <FormDialog
          open={!!viewRoute}
          onClose={() => setViewRoute(null)}
          title="View Route"
          submitLabel="Close"
          onSubmit={async () => {
            setViewRoute(null);
          }}
          maxWidth="sm"
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="subtitle2">From</Typography>
            <Typography variant="body2">{viewRoute.from.address}</Typography>
            <Typography variant="subtitle2">To</Typography>
            <Typography variant="body2">{viewRoute.to.address}</Typography>
            <Typography variant="subtitle2">Price</Typography>
            <Typography variant="body2">₹{viewRoute.price}</Typography>
          </Box>
        </FormDialog>
      )}
    </ModulePageLayout>
  );
}

