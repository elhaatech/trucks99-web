"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import {
  getAdvertisement,
  type Advertisement,
} from "@/model/api";
import { routes } from "@/lib/routes";
import { AdvertisementForm } from "../../_components/advertisementForm/advertisementForm";

export default function AdvertisementEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const [advertisement, setAdvertisement] = useState<Advertisement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      router.replace(routes.advertisement.list());
      return;
    }
    getAdvertisement(id)
      .then((ad) => setAdvertisement(ad))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, [id, router]);

  if (!id) return null;
  if (loading) return <Box sx={{ p: 2 }}>Loading…</Box>;
  if (!advertisement) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error || "Advertisement not found."}</Alert>
        <Button
          sx={{ mt: 2 }}
          onClick={() => router.push(routes.advertisement.list())}
        >
          Back to list
        </Button>
      </Box>
    );
  }

  return <AdvertisementForm advertisement={advertisement} mode="edit" />;
}
