"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import { getUser, type User } from "@/model/api";
import { routes } from "@/lib/routes";
import { canAccess } from "@/lib/permissions";
import UserForm from "@/app/admin/portal/user/_components/userForm";

export default function UserEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      router.replace(routes.user.list());
      return;
    }
    getUser(id)
      .then((u) => setUser(u as User))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (!id) return null;
  if (loading) return <Box sx={{ p: 2 }}>Loading…</Box>;
  if (!user) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error">{error || "User not found."}</Alert>
        <Button sx={{ mt: 2 }} onClick={() => router.push(routes.user.list())}>
          Back to list
        </Button>
      </Box>
    );
  }

  return <UserForm user={user} mode="edit" />;
}
