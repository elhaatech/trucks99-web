"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Alert, Box, Button } from "@mui/material";
import { getSpecification, type Specification } from "@/model/api";
import { routes } from "@/lib/routes";
import { PageHeader } from "@/components/ui";
import { SpecificationValuesManager } from "../../_components/SpecificationValuesManager";

export default function SpecificationValuesPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const [item, setItem] = useState<Specification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      router.replace(routes.specification.list());
      return;
    }
    getSpecification(id)
      .then(setItem)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (!id) return null;
  if (loading) return <Box sx={{ p: 2 }}>Loading...</Box>;
  if (!item)
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error || "Specification not found."}</Alert>
        <Button sx={{ mt: 2 }} onClick={() => router.push(routes.specification.list())}>
          Back to list
        </Button>
      </Box>
    );

  if (item.type !== "selectable")
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="warning">This specification type is input. Values are allowed only for selectable type.</Alert>
        <Button sx={{ mt: 2 }} onClick={() => router.push(routes.specification.view(id))}>
          Back to specification
        </Button>
      </Box>
    );

  return (
    <Box>
      <PageHeader
        title={`Specification Values - ${item.specification_name}`}
        subtitle="Manage values for this specification."
        action={
          <Button variant="outlined" onClick={() => router.push(routes.specification.view(id))}>
            Back
          </Button>
        }
      />
      <SpecificationValuesManager specification={item} />
    </Box>
  );
}
