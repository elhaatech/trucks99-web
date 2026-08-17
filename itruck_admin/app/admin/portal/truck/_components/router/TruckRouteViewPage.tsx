"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { getTruck, getTruckRoute, type Truck, type TruckRoute } from "@/model/api";
import { routes } from "@/lib/routes";
import {
  BackButton,
  DetailField,
  ModulePageLayout,
  ViewDetailGrid,
  ViewPageSection,
} from "@/components/common";
import { Spinner } from "@/components/ui";

export function TruckRouteViewPage() {
  const params = useParams();
  const router = useRouter();
  const routeId = typeof params?.routeId === "string" ? params.routeId : "";

  const [truck, setTruck] = useState<Truck | null>(null);
  const [route, setRoute] = useState<TruckRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!routeId) {
      setLoading(false);
      setError("Invalid route id.");
      return;
    }
    setLoading(true);
    setError("");

    getTruckRoute(routeId)
      .then(async (r) => {
        const rt = r as TruckRoute;
        setRoute(rt);
        if (rt.truckId) {
          try {
            const t = await getTruck(rt.truckId);
            setTruck(t as Truck);
          } catch {
            // ignore truck load error; still show route
          }
        }
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Failed to load route";
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [routeId]);

  const handleBack = () => {
    if (route?.truckId) router.push(routes.truck.route(route.truckId));
    else router.push(routes.truck.list());
  };

  if (loading) {
    return (
      <ModulePageLayout
        title="Truck Route"
        subtitle="Loading route details…"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Trucks", href: routes.truck.list() },
          { label: "Route" },
        ]}
        backButton={<BackButton fallback={routes.truck.list()} label="Back to routes" />}
        showAds={false}
      >
        <Spinner label="Loading route…" />
      </ModulePageLayout>
    );
  }

  if (error && !route) {
    return (
      <ModulePageLayout
        title="Truck Route"
        subtitle="Route not found"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Trucks", href: routes.truck.list() },
          { label: "Not found" },
        ]}
        backButton={<BackButton fallback={routes.truck.list()} label="Back to trucks" />}
        showAds={false}
      >
        <Alert severity="error">{error}</Alert>
      </ModulePageLayout>
    );
  }

  if (!route) return null;

  return (
    <ModulePageLayout
      title="View Truck Route"
      subtitle={truck?.registrationNumber ? `Route for ${truck.registrationNumber}` : "Route details"}
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Trucks", href: routes.truck.list() },
        { label: truck?.registrationNumber || "Route" },
      ]}
      backButton={
        <Button variant="outlined" onClick={handleBack}>
          Back to routes
        </Button>
      }
      error={error}
      onErrorClose={() => setError("")}
    >
      <ViewPageSection title="Route Details" subtitle="From, to, and price">
        <ViewDetailGrid>
          <DetailField label="From" value={route.from.address} fullWidth />
          <DetailField label="From Coordinates" value={`${route.from.lat}, ${route.from.lang}`} />
          <DetailField label="To" value={route.to.address} fullWidth />
          <DetailField label="To Coordinates" value={`${route.to.lat}, ${route.to.lang}`} />
          <DetailField label="Price" value={`₹${route.price}`} />
        </ViewDetailGrid>
      </ViewPageSection>
    </ModulePageLayout>
  );
}
