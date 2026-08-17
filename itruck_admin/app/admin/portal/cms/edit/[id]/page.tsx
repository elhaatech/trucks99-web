"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { routes } from "@/lib/routes";
import { CMSPage, getCMSPage } from "@/model/services/cms";
import CMSForm from "../../components/cmsForm/cmsForm";

export default function CMSEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const [item, setItem] = useState<CMSPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      router.replace(routes.cms.list());
      return;
    }
    getCMSPage(id)
      .then((e) => setItem(e as CMSPage))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, [id, router]);

  if (!id) return null;
  if (loading) return <Box sx={{ p: 2 }}>Loading…</Box>;
  if (!item) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error || "CMS page not found."}</Alert>
        <Button sx={{ mt: 2 }} onClick={() => router.push(routes.cms.list())}>
          Back to list
        </Button>
      </Box>
    );
  }

  return <CMSForm cmsPage={item} mode="edit" />;
}