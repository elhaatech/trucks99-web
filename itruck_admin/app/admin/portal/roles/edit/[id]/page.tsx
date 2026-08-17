"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { getRoles, getRowId, type Role } from "@/model/api";
import { routes } from "@/lib/routes";
import RoleForm from "../../_components/roleForm/roleForm";

export default function RoleEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      router.replace(routes.role.list());
      return;
    }
    getRoles()
      .then((roles) => {
        const r = roles.find((x) => getRowId(x) === id || x._id === id);
        setRole(r || null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (!id) return null;
  if (loading) return <Box sx={{ p: 2 }}>Loading…</Box>;
  if (!role) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error || "Role not found."}</Alert>
        <Button sx={{ mt: 2 }} onClick={() => router.push(routes.role.list())}>
          Back to list
        </Button>
      </Box>
    );
  }

  return <RoleForm role={role} />;
}
