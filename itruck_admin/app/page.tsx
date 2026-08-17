"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCurrentUser, logout, type User } from "@/model/api";
import LoginPage from "./login/Login";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <LoginPage />
  );
}
