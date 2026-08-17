"use client";

import React from "react";
import { ModulePageLayout } from "@/components/common";
import { routes } from "@/lib/routes";
import SubscriptionGate from "../_components/SubscriptionGate";
import MatchResultsView from "../_components/MatchResultsView";

export default function MatchLoadPage() {
  return (
    <ModulePageLayout
      title="Match Load"
      subtitle="Find trucks that match your posted loads."
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Match Load" },
      ]}
    >
      <SubscriptionGate matchType="load">
        <MatchResultsView mode="truck" />
      </SubscriptionGate>
    </ModulePageLayout>
  );
}
