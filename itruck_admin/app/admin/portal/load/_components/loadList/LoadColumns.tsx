"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import type {
  Load,
  VehicleType,
  VehicleBodyType,
  Material,
  User,
} from "@/model/api";

import { getRowId } from "@/model/api";
import { routes, ROUTES } from "@/lib/routes";

import { formatDateTime, pickupStr, dropStr } from "@/lib/loadUtils";

import { StatusBadge, createdAtColumn } from "@/components/common";
import { renderClickableName } from "@/components/common/table/tableColumnHelpers";
import { renderNumberColumn } from "@/components/common/table/renderNumberColumn";

interface Maps {
  usersMap: Map<string, User>;
  materialsMap: Map<string, Material>;
  vehicleTypesMap: Map<string, VehicleType>;
  vehicleBodyTypesMap: Map<string, VehicleBodyType>;
  currentUser?: User;
}

// ── Inline Route cell ─────────────────────────────────────────────────────────
function RouteCell({ row }: { row: Load }) {
  const pickup = pickupStr(row);
  const drop = dropStr(row);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {/* green dot = pickup */}
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#639922",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 13,
            color: "#1e293b",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: 180,
          }}
        >
          {pickup || "—"}
        </span>
      </div>

      {/* dashed connector line */}
      <div
        style={{
          width: 1,
          height: 10,
          borderLeft: "1.5px dashed #cbd5e1",
          marginLeft: 3,
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {/* red dot = drop */}
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#E24B4A",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 13,
            color: "#1e293b",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: 180,
          }}
        >
          {drop || "—"}
        </span>
      </div>
    </div>
  );
}

export function useLoadColumns({
  usersMap,
  materialsMap,
  vehicleTypesMap,
  vehicleBodyTypesMap,
  currentUser,
}: Maps) {
  const router = useRouter();

  // Determine admin access once at hook level
  const isAdmin = currentUser?.role?.status === "admin";
  console.log("current", currentUser);

  return useMemo(
    () => [
      {
        id: "loadNumber",
        label: "Load No",
        minWidth: 160,
        sortable: true,
        render: (row: Load) =>
          renderNumberColumn(
            row,
            row.loadNumber,
            ROUTES.load.view(getRowId(row)),
            renderClickableName,
          ),
      },
      {
        id: "user",
        label: "Load Owner",
        minWidth: 120,
        sortable: true,
        render: (row: Load) => {
          const uid =
            (row as { ownerId?: string; userId?: string; createdBy?: string })
              .ownerId ||
            (row as { userId?: string }).userId ||
            (row as { createdBy?: string }).createdBy;

          if (!uid) return "—";

          const u =
            (row as { ownerUser?: User }).ownerUser ??
            usersMap.get(String(uid));

          const userName = u?.name ?? u?.mobile ?? "—";

          // Only show clickable link for admins
          if (isAdmin) {
            return renderClickableName(userName, routes.user.view(String(uid)));
          }

          return userName; // ← Plain text for non-admins
        },
      },

      // ── Merged pickup + drop ──────────────────────────────────────────────
      {
        id: "route",
        label: "Route",
        minWidth: 200,
        render: (row: Load) => <RouteCell row={row} />,
      },

      // ── Merged material + capacity ────────────────────────────────────────
      {
        id: "materialId",
        label: "Material / Vehicle",
        minWidth: 140,
        sortable: true,
        render: (row: Load) => {
          const mat =
            materialsMap.get(String(row.materialId ?? ""))?.materials_type ??
            (row as { material?: string }).material ??
            "—";
          const cap = (row as { vehicleCapacity?: number }).vehicleCapacity;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 13, color: "#1e293b", fontWeight: 500 }}>
                {mat}
              </span>
              <span style={{ fontSize: 11, color: "#64748b" }}>
                {cap != null ? `${cap} Ton` : "—"}
              </span>
            </div>
          );
        },
      },

      {
        id: "vehicleType",
        label: "Vehicle Type",
        sortable: true,
        minWidth: 120,
        render: (row: Load) => {
          if (!row.vehicleType) return "—";
          const key = String(row.vehicleType);
          const vt =
            vehicleTypesMap.get(key) ??
            [...vehicleTypesMap.values()].find(
              (v) => v._id === key || v.id === key || v.uuid === key,
            );
          return vt?.vehicle_type ?? vt?.name ?? row.vehicleType;
        },
      },

      {
        id: "vehicleBodyType",
        label: "Body Type",
        sortable: true,
        minWidth: 120,
        render: (row: Load) => {
          if (!row.vehicleBodyType) return "—";
          const key = String(row.vehicleBodyType);
          const vbt =
            vehicleBodyTypesMap.get(key) ??
            [...vehicleBodyTypesMap.values()].find(
              (v) => v._id === key || v.id === key || v.vehicle_id === key,
            );
          return vbt?.vehicle_name ?? row.vehicleBodyType;
        },
      },

      // {
      //   id: "pickupTime",
      //   label: "Pickup Time",
      //   minWidth: 160,
      //   render: (row: Load) => formatDateTime(row.pickupTime),
      //   sortable: true,
      // },

      {
        id: "bit",
        label: "Bid",
        minWidth: 80,
        render: (row: Load) => (row.bit != null ? row.bit : "—"),
        sortable: true,
      },

      {
        id: "distanceKm",
        label: "Km",
        minWidth: 70,
        render: (row: Load) => (row.distanceKm != null ? row.distanceKm : "—"),
        sortable: true,
      },

      {
        id: "status",
        label: "Status",
        minWidth: 90,
        render: (row: Load) => <StatusBadge status={row.status} />,
        sortable: true,
      },
      createdAtColumn<Load>(),
    ],
    [
      router,
      usersMap,
      materialsMap,
      vehicleTypesMap,
      vehicleBodyTypesMap,
      isAdmin,
    ],
  );
}
