"use client";

import { useRouter } from "next/navigation";
import { routes } from "@/lib/routes";
import { SubscriptionForm } from "../_components/subscriptionForm/subscriptionForm";

export default function SubscriptionCreatePage() {
  const router = useRouter();

  return (
    <SubscriptionForm
    mode="create"
      onSuccess={() => router.push(routes.subscription.list())}
    />
  );
}