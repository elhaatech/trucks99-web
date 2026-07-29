"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui";
import { userProductRoutes } from "@/lib/userProductRoutes";

/** Legacy route — redirects to unified Sell Vehicle screen. */
export default function UserProductCreateRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(userProductRoutes.sellVehicle("create"));
  }, [router]);

  return <Spinner label="Opening Sell Vehicle…" />;
}
