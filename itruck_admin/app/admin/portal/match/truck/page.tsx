"use client";

import React from "react";
import { ModulePageLayout } from "@/components/common";
import { routes } from "@/lib/routes";
import SubscriptionGate from "../_components/SubscriptionGate";
import MatchResultsView from "../_components/MatchResultsView";

export default function MatchTruckPage() {
  return (
    <ModulePageLayout
      title="Match Truck"
      subtitle="Find loads that match your posted trucks."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Match Truck" },
      ]}
    >
      <SubscriptionGate matchType="truck">
        <MatchResultsView mode="load" />
      </SubscriptionGate>
    </ModulePageLayout>
  );
}
