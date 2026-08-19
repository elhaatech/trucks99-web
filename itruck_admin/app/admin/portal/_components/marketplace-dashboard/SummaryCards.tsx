"use client";

import Box from "@mui/material/Box";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HourglassEmptyOutlinedIcon from "@mui/icons-material/HourglassEmptyOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import HighlightOffOutlinedIcon from "@mui/icons-material/HighlightOffOutlined";
import SellOutlinedIcon from "@mui/icons-material/SellOutlined";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import { useRouter } from "next/navigation";
import { StatCard } from "@/components/ui/StatCard";
import { StatCardSkeleton } from "@/components/ui/Skeleton";
import { routes } from "@/lib/routes";
import {
  formatCount,
  formatPercentChange,
  type DashboardSummary,
} from "@/model/services/marketplaceDashboard";

type CardAccent = "primary" | "secondary" | "success" | "info" | "warning" | "error";

function trendFrom(change?: { percentChange: number }) {
  if (!change) return undefined;
  return {
    value: formatPercentChange(change.percentChange),
    up: change.percentChange >= 0,
  };
}

export function SummaryCards({
  data,
  loading,
}: {
  data: DashboardSummary | null;
  loading: boolean;
}) {
  const router = useRouter();

  if (loading && !data) {
    return (
      <Box sx={{ mb: 3 }}>
        <StatCardSkeleton count={5} />
        <Box sx={{ mt: 2.5 }}>
          <StatCardSkeleton count={3} />
        </Box>
      </Box>
    );
  }

  const cards: {
    title: string;
    value: number;
    subtitle: string;
    icon: React.ReactNode;
    accent: CardAccent;
    onClick?: () => void;
    trendKey: keyof DashboardSummary["changes"];
  }[] = [
    {
      title: "Total Products",
      value: data?.totalProducts ?? 0,
      subtitle: `${formatCount(data?.periodCounts?.totalProducts)} new in period`,
      icon: <Inventory2OutlinedIcon />,
      accent: "primary",
      onClick: () => router.push(routes.buysell.list()),
      trendKey: "totalProducts",
    },
    {
      title: "Pending Approval",
      value: data?.pendingProducts ?? 0,
      subtitle: "Waiting for admin review",
      icon: <HourglassEmptyOutlinedIcon />,
      accent: "warning",
      trendKey: "pendingProducts",
    },
    {
      title: "Approved Products",
      value: data?.approvedProducts ?? 0,
      subtitle: "Offer accepted listings",
      icon: <VerifiedOutlinedIcon />,
      accent: "info",
      trendKey: "approvedProducts",
    },
    {
      title: "Total Users",
      value: data?.totalUsers ?? 0,
      subtitle: `${formatCount(data?.periodCounts?.totalUsers)} new in period`,
      icon: <PeopleOutlineIcon />,
      accent: "info",
      onClick: () => router.push(routes.user.list()),
      trendKey: "totalUsers",
    },
    {
      title: "Active Users",
      value: data?.activeUsers ?? 0,
      subtitle: "Users with active status",
      icon: <PersonOutlineIcon />,
      accent: "success",
      onClick: () => router.push(routes.user.list()),
      trendKey: "activeUsers",
    },
  ];

  const primary = cards.slice(0, 5);
  const secondary = cards.slice(5);

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 2.5, mb: 2.5 }}>
        {primary.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={formatCount(card.value)}
            subtitle={card.subtitle}
            icon={card.icon}
            accent={card.accent}
            onClick={card.onClick}
            trend={trendFrom(data?.changes?.[card.trendKey])}
          />
        ))}
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 2.5 }}>
        {secondary.map((card) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={formatCount(card.value)}
            subtitle={card.subtitle}
            icon={card.icon}
            accent={card.accent}
            onClick={card.onClick}
            trend={trendFrom(data?.changes?.[card.trendKey])}
          />
        ))}
      </Box>
    </Box>
  );
}
