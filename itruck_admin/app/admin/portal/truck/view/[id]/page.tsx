"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Popover from "@mui/material/Popover";
import {
  getTruck,
  getTruckRoutes,
  getBitRecords,
  getTruckAllWithPagination,
  getLoadAllWithPagination,
  type Truck,
  type TruckRoute,
  type TruckBitRecord,
  VehicleBodyType,
  getVehicleBodyTypeAll,
  type Load,
} from "@/model/api";
import { getCurrentUser } from "@/model/services/user";
import { routes } from "@/lib/routes";
import { useInvalidIdRedirect, useSmartBack } from "@/lib/navigation";
import { resolvePublicFileUrl } from "@/lib/fileUrl";
import Button from "@mui/material/Button";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { BitRecordsSection } from "@/components/common/BitRecordsSection";
import { BackButton, ModulePageLayout } from "@/components/common";
import { Spinner } from "@/components/ui";
import type { User } from "@/model/services/user";
import LoadAccepted from "../../_components/loadaccepted";

// ── Extended types ─────────────────────────────────────────────────────────────
type TruckExtended = Truck & {
  vehicleImage?: string;
  vehicleImages?: string[];
  vehicleRCDocument?: string;
  total_tire?: string;
  containerFeet?: string;
  vehicleBodyLength?: string;
  truck_status?: string;
  load_status?: string;
  loadCapacity?: string;
  contactNumber?: string;
  bitReason?: string;
  vehicleType?: VehicleType;
  ownerUser?: { _id?: string; name?: string; mobile?: string; email?: string };
  createdByUser?: { name?: string };
  driverName?: string;
};

type LoadExtended = Load & {
  vehicle_name?: string;
  total_tire?: string;
  pickupTime?: string;
  containerFeet?: string;
  rejectReason?: string;
  ownerUser?: { _id?: string; name?: string; mobile?: string };
  pickupLocation?: { address?: string };
  dropLocation?: { address?: string };
  bitRecords?: Array<{
    _id?: string;
    bit?: number;
    status?: string;
    userName?: string;
    bitReason?: string;
  }>;
  truckbitRecords?: Array<{
    _id?: string;
    bit?: number;
    status?: string;
    userName?: string;
    bitReason?: string;
  }>;
};

type VehicleType =
  | string
  | { _id?: string; uuid?: string; name?: string }
  | null
  | undefined;

// ── Helpers ───────────────────────────────────────────────────────────────────
const getFileUrl = (path?: string) => resolvePublicFileUrl(path);

const vehicleTypeName = (vt: VehicleType): string => {
  if (!vt) return "—";
  if (typeof vt === "string") return vt;
  if (typeof vt === "object" && "name" in vt) return vt.name ?? "—";
  return "—";
};

const truckRowId = (t: Truck) =>
  (t as { _id?: string })._id || (t as { id?: string }).id || "";
const loadRowId = (l: Load) =>
  (l as { _id?: string })._id || (l as { id?: string }).id || "";

const fmt = (n?: number | null) =>
  n != null ? "₹" + Number(n).toLocaleString("en-IN") : "—";

const fmtDate = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

// ── Detail Popover helpers ────────────────────────────────────────────────────
const EXCLUDED_KEYS = new Set(["_id", "id", "__v", "createdAt", "updatedAt"]);

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^\s+/, "")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function formatFieldValue(val: unknown): string {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "number") return val.toLocaleString("en-IN");
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.length === 0 ? "—" : val.join(", ");
  if (typeof val === "object") {
    return (
      Object.entries(val as Record<string, unknown>)
        .filter(([k]) => !EXCLUDED_KEYS.has(k))
        .map(([k, v]) => `${humanizeKey(k)}: ${v ?? "—"}`)
        .join(" · ") || "—"
    );
  }
  return String(val);
}

// ── Load Detail Popover ───────────────────────────────────────────────────────
// Uses the app's amber/green/blue palette matching TruckViewPage styling
function LoadDetailPopover({
  anchorEl,
  load,
  onClose,
}: {
  anchorEl: HTMLElement | null;
  load: LoadExtended | null;
  onClose: () => void;
}) {
  const open = Boolean(anchorEl) && Boolean(load);
  if (!load) return null;

  const entries = Object.entries(load as Record<string, unknown>).filter(
    ([k, v]) =>
      !EXCLUDED_KEYS.has(k) && v !== undefined && v !== null && v !== "",
  );

  const rawStatus = (load.status || "").toLowerCase();
  const isCancelled = rawStatus === "cancelled" || rawStatus === "rejected";
  const statusSty = isCancelled
    ? { bg: "#FCEBEB", color: "#A32D2D", border: "#F09595" }
    : rawStatus === "active" || rawStatus === "delivered"
      ? { bg: "#EAF3DE", color: "#3B6D11", border: "#97C459" }
      : rawStatus === "assigned" || rawStatus === "accepted"
        ? { bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" }
        : { bg: "#FAEEDA", color: "#854F0B", border: "#EF9F27" };

  const statusDot = isCancelled
    ? "#E24B4A"
    : rawStatus === "active" || rawStatus === "delivered"
      ? "#639922"
      : rawStatus === "assigned" || rawStatus === "accepted"
        ? "#3B82F6"
        : "#BA7517";

  const originCity =
    load.pickupLocation?.address?.split(",")[0] ||
    load.origin?.split(",")[0] ||
    "—";
  const destCity =
    load.dropLocation?.address?.split(",")[0] ||
    load.destination?.split(",")[0] ||
    "—";

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      slotProps={{
        paper: {
          sx: {
            mt: "6px",
            borderRadius: "12px",
            border: "1.5px solid #e2e8f0",
            boxShadow: "0 8px 32px #0f172a18, 0 2px 8px #0001",
            width: 400,
            overflow: "hidden",
          },
        },
      }}
    >
      {/* ── Header ── */}
      <Box
        sx={{
          px: "16px",
          py: "12px",
          background: "linear-gradient(135deg, #f8fafc 0%, #fff 100%)",
          borderBottom: "0.5px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: "9px",
            flexShrink: 0,
            background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 8h14M5 12h14M5 16h6" />
          </svg>
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>
            {load.loadNumber || "Load Details"}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>
            {originCity} → {destCity}
            {load.distanceKm ? ` · ${load.distanceKm} km` : ""}
          </div>
        </Box>
        {/* Status badge */}
        {load.status && (
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              borderRadius: 20,
              padding: "3px 9px",
              background: statusSty.bg,
              color: statusSty.color,
              border: `1px solid ${statusSty.border}`,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: statusDot,
                display: "inline-block",
              }}
            />
            {load.status.charAt(0).toUpperCase() + load.status.slice(1)}
          </span>
        )}
        {/* Close */}
        <Box
          component="button"
          onClick={onClose}
          sx={{
            background: "none",
            border: "none",
            cursor: "pointer",
            width: 26,
            height: 26,
            borderRadius: "7px",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#94a3b8",
            "&:hover": { background: "#f1f5f9", color: "#475569" },
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </Box>
      </Box>

      {/* ── Route strip ── */}
      <Box
        sx={{
          mx: "14px",
          mt: "12px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "#f8fafc",
          borderRadius: "8px",
          padding: "10px 14px",
          border: "0.5px solid #e2e8f0",
          fontSize: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 2,
            }}
          >
            Pickup
          </div>
          <div
            style={{
              fontWeight: 500,
              color: "#1e293b",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {load.pickupLocation?.address || load.origin || "—"}
          </div>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#94a3b8"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0 }}
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
        <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
          <div
            style={{
              fontSize: 10,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 2,
            }}
          >
            Drop
          </div>
          <div
            style={{
              fontWeight: 500,
              color: "#1e293b",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {load.dropLocation?.address || load.destination || "—"}
          </div>
        </div>
      </Box>

      {/* ── Fields grid ── */}
      <Box sx={{ p: "12px 14px", maxHeight: 280, overflowY: "auto" }}>
        {entries.length === 0 ? (
          <div
            style={{
              fontSize: 12,
              color: "#94a3b8",
              textAlign: "center",
              padding: "16px 0",
            }}
          >
            No details available.
          </div>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px 10px",
            }}
          >
            {entries.map(([key, val]) => {
              const isObj = typeof val === "object" && val !== null;
              const isStatusKey = key.toLowerCase().includes("status");
              const displayVal = formatFieldValue(val);

              // skip pickupLocation / dropLocation since we show the route strip above
              if (key === "pickupLocation" || key === "dropLocation")
                return null;

              return (
                <Box
                  key={key}
                  sx={{
                    background: "#f8fafc",
                    border: "0.5px solid #e2e8f0",
                    borderRadius: "8px",
                    p: "8px 10px",
                    ...(isObj ? { gridColumn: "1 / -1" } : {}),
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#94a3b8",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 3,
                    }}
                  >
                    {humanizeKey(key)}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "#1e293b",
                      wordBreak: "break-word",
                    }}
                  >
                    {isStatusKey ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          borderRadius: 10,
                          padding: "2px 8px",
                          background: statusSty.bg,
                          color: statusSty.color,
                          border: `0.5px solid ${statusSty.border}`,
                        }}
                      >
                        {displayVal}
                      </span>
                    ) : key === "bit" ? (
                      <span style={{ color: "#1D4ED8", fontWeight: 700 }}>
                        {fmt(val as number)}
                      </span>
                    ) : (
                      displayVal
                    )}
                  </div>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* ── Owner footer ── */}
      {load.ownerUser && (
        <Box
          sx={{
            px: "14px",
            py: "10px",
            borderTop: "0.5px solid #e2e8f0",
            background: "#f8fafc",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: "7px",
              flexShrink: 0,
              background: "#FEF3C7",
              color: "#92400E",
              fontWeight: 700,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {(load.ownerUser.name || "?")[0].toUpperCase()}
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#1e293b" }}>
              {load.ownerUser.name || "—"}
            </div>
            {load.ownerUser.mobile && (
              <div style={{ fontSize: 11, color: "#64748b" }}>
                {load.ownerUser.mobile}
              </div>
            )}
          </Box>
          <span
            style={{
              fontSize: 10,
              color: "#854F0B",
              background: "#FAEEDA",
              border: "0.5px solid #EF9F27",
              borderRadius: 10,
              padding: "2px 8px",
              fontWeight: 600,
            }}
          >
            Owner
          </span>
        </Box>
      )}
    </Popover>
  );
}

// ── Status config ─────────────────────────────────────────────────────────────
const statusStyle = (s?: string): React.CSSProperties => {
  const v = (s || "").toLowerCase();
  if (v === "available")
    return {
      background: "#EAF3DE",
      color: "#3B6D11",
      border: "0.5px solid #97C459",
    };
  if (v === "busy" || v === "in transit")
    return {
      background: "#FAEEDA",
      color: "#854F0B",
      border: "0.5px solid #EF9F27",
    };
  return {
    background: "#F1EFE8",
    color: "#5F5E5A",
    border: "0.5px solid #B4B2A9",
  };
};

const statusDot = (s?: string) => {
  const v = (s || "").toLowerCase();
  if (v === "available") return "#639922";
  if (v === "busy" || v === "in transit") return "#BA7517";
  return "#888780";
};

const loadStatusStyle = (s?: string): React.CSSProperties => {
  const v = (s || "").toLowerCase();
  if (v === "cancelled" || v === "rejected")
    return {
      background: "#FCEBEB",
      color: "#A32D2D",
      border: "0.5px solid #F09595",
    };
  if (v === "active" || v === "delivered")
    return {
      background: "#EAF3DE",
      color: "#3B6D11",
      border: "0.5px solid #97C459",
    };
  if (v === "assigned" || v === "accepted")
    return {
      background: "#EFF6FF",
      color: "#1D4ED8",
      border: "0.5px solid #BFDBFE",
    };
  return {
    background: "#FAEEDA",
    color: "#854F0B",
    border: "0.5px solid #EF9F27",
  };
};

const loadStatusDot = (s?: string) => {
  const v = (s || "").toLowerCase();
  if (v === "cancelled" || v === "rejected") return "#E24B4A";
  if (v === "active" || v === "delivered") return "#639922";
  if (v === "assigned" || v === "accepted") return "#3B82F6";
  return "#BA7517";
};

// ── Inline SVG icons ──────────────────────────────────────────────────────────
const Ic = {
  truck: () => (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="1" y="3" width="15" height="13" rx="2" />
      <path d="M16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  load: () => (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 8h14M5 12h14M5 16h6" />
    </svg>
  ),
  route: () => (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12h18M3 6l6 6-6 6" />
    </svg>
  ),
  user: () => (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  file: () => (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  pin: () => (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  phone: () => (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.81a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  msg: () => (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  edit: () => (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  back: () => (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  ),
  image: () => (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  ),
  doc: () => (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
};

// ── Primitive components ──────────────────────────────────────────────────────
const panel: React.CSSProperties = {
  background: "#ffffff",
  border: "0.5px solid #e2e8f0",
  borderRadius: 12,
  padding: 16,
};

const PanelTitle = ({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <p
    style={{
      fontSize: 11,
      fontWeight: 600,
      color: "#64748b",
      textTransform: "uppercase",
      letterSpacing: "0.07em",
      marginBottom: 12,
      display: "flex",
      alignItems: "center",
      gap: 6,
    }}
  >
    {icon}
    {children}
  </p>
);

const RowItem = ({
  label,
  value,
  valueColor,
  last,
}: {
  label: string;
  value?: React.ReactNode;
  valueColor?: string;
  last?: boolean;
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      padding: "7px 0",
      borderBottom: last ? "none" : "0.5px solid #e2e8f0",
    }}
  >
    <span style={{ fontSize: 12, color: "#64748b" }}>{label}</span>
    <span
      style={{
        fontSize: 13,
        fontWeight: 500,
        color: valueColor || "#1e293b",
        textAlign: "right",
        maxWidth: "60%",
      }}
    >
      {value || "—"}
    </span>
  </div>
);

// ── Bid list sub-component ────────────────────────────────────────────────────
function BidList({
  bids,
  label,
}: {
  bids: Array<{
    _id?: string;
    bit?: number;
    status?: string;
    userName?: string;
    bitReason?: string;
  }>;
  label: string;
}) {
  if (!bids.length) return null;
  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 12,
        borderTop: "0.5px solid #e2e8f0",
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: "#94a3b8",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          marginBottom: 8,
        }}
      >
        {label} ({bids.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {bids.map((b, i) => (
          <div
            key={b._id || i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#fff",
              borderRadius: 6,
              padding: "6px 10px",
              borderLeft: `2px solid ${b.status === "accept" ? "#639922" : b.status === "reject" ? "#E24B4A" : "#EF9F27"}`,
            }}
          >
            <span style={{ fontSize: 12, color: "#475569" }}>
              {b.userName || "—"}
              {b.bitReason ? ` · ${b.bitReason}` : ""}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 500 }}>
                {fmt(b.bit)}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  borderRadius: 10,
                  padding: "2px 7px",
                  background:
                    b.status === "accept"
                      ? "#EAF3DE"
                      : b.status === "reject"
                        ? "#FCEBEB"
                        : "#FAEEDA",
                  color:
                    b.status === "accept"
                      ? "#3B6D11"
                      : b.status === "reject"
                        ? "#A32D2D"
                        : "#854F0B",
                  textTransform: "capitalize",
                }}
              >
                {b.status || "pending"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TruckViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const hasValidId = useInvalidIdRedirect(id, routes.truck.list());
  const goBack = useSmartBack(routes.truck.list());

  const [item, setItem] = useState<TruckExtended | null>(null);
  console.log("item---", item);
  const [truckRoutes, setTruckRoutes] = useState<TruckRoute[]>([]);
  const [bitRecords, setBitRecords] = useState<TruckBitRecord[]>([]);
  console.log("bitRecords---", bitRecords);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [vehicleBodyTypes, setVehicleBodyTypes] = useState<VehicleBodyType[]>(
    [],
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allTrucks, setAllTrucks] = useState<Truck[]>([]);
  const [trucksLoading, setTrucksLoading] = useState(true);
  const [allLoads, setAllLoads] = useState<Load[]>([]);
  const [loadsLoading, setLoadsLoading] = useState(true);
  const [selectedLoadId, setSelectedLoadId] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    Promise.all([
      getTruck(id),
      getTruckRoutes(id),
      getBitRecords<TruckBitRecord>({ entityId: id }),
      getVehicleBodyTypeAll(),
    ])
      .then(([t, routesList, records, bodyTypes]) => {
        setItem(t as TruckExtended);
        setTruckRoutes(routesList ?? []);
        setBitRecords(records ?? []);
        setVehicleBodyTypes(bodyTypes ?? []);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    getCurrentUser()
      .then((u) => setCurrentUser(u))
      .catch(() => {});
  }, []);

  useEffect(() => {
    getTruckAllWithPagination({ page: 1, limit: 200 })
      .then((r) =>
        setAllTrucks((r.trucks ?? []).filter((t) => truckRowId(t) !== id)),
      )
      .catch(() => {})
      .finally(() => setTrucksLoading(false));
  }, [id]);

  useEffect(() => {
    getLoadAllWithPagination({ page: 1, limit: 200 })
      .then((r) => {
        const currentUserId =
          (currentUser as ({ _id?: string } & User) | null)?._id ||
          currentUser?.id ||
          "";
        const loads = r.loads ?? [];
        const filtered = currentUserId
          ? loads.filter((l) => {
              const ownerUserId =
                (l as any).ownerUser?._id || (l as any).ownerUser?.id || "";
              return ownerUserId !== currentUserId;
            })
          : loads;
        setAllLoads(filtered);
      })
      .catch(() => {})
      .finally(() => setLoadsLoading(false));
  }, [currentUser]);

  const refreshTruck = () => {
    if (!id) return;
    getTruck(id)
      .then((t) => setItem(t as TruckExtended))
      .catch(() => {});
  };

  if (!hasValidId) {
    return null;
  }

  if (loading && !item) {
    return (
      <ModulePageLayout
        title="Truck"
        subtitle="Loading truck details…"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Trucks", href: routes.truck.list() },
          { label: "Details" },
        ]}
        backButton={<BackButton fallback={routes.truck.list()} />}
        showAds={false}
      >
        <Spinner label="Loading truck…" />
      </ModulePageLayout>
    );
  }

  if (!item) {
    return (
      <ModulePageLayout
        title="Truck"
        subtitle="Truck not found"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Trucks", href: routes.truck.list() },
          { label: "Not found" },
        ]}
        backButton={<BackButton fallback={routes.truck.list()} />}
        showAds={false}
      >
        <Alert severity="error">Truck not found.</Alert>
      </ModulePageLayout>
    );
  }

  const owner = item.ownerUser;
  const statusLabel =
    (item.status || "").charAt(0).toUpperCase() + (item.status || "").slice(1);
  const vtLabel = vehicleTypeName(item.vehicleType);
  const bodyTypeLabel =
    vehicleBodyTypes.find(
      (v) =>
        v.vehicle_id === item.vehicleBodyType ||
        v._id === item.vehicleBodyType ||
        v.id === item.vehicleBodyType,
    )?.vehicle_name || "—";

  return (
    <ModulePageLayout
      title={item.registrationNumber || item.truckNumber || "Truck"}
      subtitle={`${vtLabel}${item.containerFeet ? ` · ${item.containerFeet} ft` : ""}`}
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Trucks", href: routes.truck.list() },
        { label: item.registrationNumber || id },
      ]}
      backButton={<BackButton fallback={routes.truck.list()} />}
      error={error}
      onErrorClose={() => setError("")}
      action={
        currentUser?.role?.name === "admin" || currentUser?.id === item?.ownerUser?.id ? (
          <Button
            variant="contained"
            size="small"
            startIcon={<EditOutlinedIcon />}
            onClick={() => router.push(routes.truck.edit(id))}
          >
            Edit
          </Button>
        ) : undefined
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {/* ── Hero card ── */}
        <div style={panel}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 22, fontWeight: 600, color: "#0f172a" }}>
                {item.truckNumber || "Truck"}
              </div>
              <div style={{ fontSize: 22, fontWeight: 300, color: "#0f172a" }}>
                {item.registrationNumber || "Truck"}
              </div>

              <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                {vtLabel}
                {item.containerFeet ? ` · ${item.containerFeet} ft` : ""}
              </div>
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                borderRadius: 20,
                padding: "4px 11px",
                fontSize: 11,
                fontWeight: 500,
                flexShrink: 0,
                ...statusStyle(item.status),
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: statusDot(item.status),
                  display: "inline-block",
                }}
              />
              {statusLabel || "—"}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#f8fafc",
              borderRadius: 8,
              padding: "12px 16px",
              border: "0.5px solid #e2e8f0",
            }}
          >
            <Ic.pin />
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: "#94a3b8",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 2,
                }}
              >
                Current location
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#1e293b" }}>
                {item.currentLocation || "—"}
              </div>
            </div>
          </div>
        </div>

        {/* ── Metric tiles ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: 10,
          }}
        >
          <div
            style={{
              background: "#f8fafc",
              borderRadius: 8,
              padding: "12px 14px",
              border: "0.5px solid #e2e8f0",
            }}
          >
            <div style={{ color: "#94a3b8", marginBottom: 6 }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#1e293b" }}>
              {item.capacity ? `${item.capacity} T` : "—"}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              Capacity
            </div>
          </div>
          <div
            style={{
              background: "#f8fafc",
              borderRadius: 8,
              padding: "12px 14px",
              border: "0.5px solid #e2e8f0",
            }}
          >
            <div style={{ color: "#94a3b8", marginBottom: 6 }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#1e293b" }}>
              {item.total_tire || "—"}
            </div>
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              Tyres
            </div>
          </div>
        </div>

        {/* ── Detail panels ── */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <div style={panel}>
            <PanelTitle icon={<Ic.truck />}>Vehicle</PanelTitle>
            <RowItem label="Type" value={vtLabel} />
            <RowItem label="Body type" value={bodyTypeLabel} />
            <RowItem label="Container feet" value={item.containerFeet} />
            <RowItem label="Body length" value={item.vehicleBodyLength} />
            <RowItem label="Tyres" value={item.total_tire} last />
          </div>
          <div style={panel}>
            <PanelTitle icon={<Ic.route />}>Status & load</PanelTitle>
            <RowItem
              label="Status"
              value={statusLabel}
              valueColor={
                item.status?.toLowerCase() === "available"
                  ? "#3B6D11"
                  : undefined
              }
            />
            <RowItem label="Truck status" value={item.truck_status} />
            <RowItem label="Load status" value={item.load_status} />
            <RowItem
              label="Load capacity"
              value={item.loadCapacity ? `${item.loadCapacity} T` : undefined}
            />
            <RowItem
              label="Contact"
              value={item.contactNumber || undefined}
              last
            />
          </div>
        </div>

        {/* ── Bid reason ── */}
        {item.bitReason && (
          <div
            style={{
              background: "#FAEEDA",
              border: "0.5px solid #EF9F27",
              borderRadius: 8,
              padding: "10px 14px",
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#BA7517"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginTop: 1, flexShrink: 0 }}
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#854F0B",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 2,
                }}
              >
                Bid reason
              </div>
              <div style={{ fontSize: 13, color: "#633806" }}>
                {item.bitReason}
              </div>
            </div>
          </div>
        )}

        {/* ── Owner card ── */}
        {owner && (
          <div style={panel}>
            <PanelTitle icon={<Ic.user />}>Owner</PanelTitle>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: "#EFF6FF",
                  color: "#2563EB",
                  fontWeight: 600,
                  fontSize: 15,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {(owner.name || "?")[0].toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{ fontSize: 14, fontWeight: 500, color: "#1e293b" }}
                >
                  {owner.name || "—"}
                </div>
                {owner.mobile && (
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    {owner.mobile}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    border: "0.5px solid #cbd5e1",
                    borderRadius: 8,
                    padding: "5px 10px",
                    background: "#fff",
                    color: "#64748b",
                    cursor: "pointer",
                  }}
                >
                  <Ic.phone /> Call
                </button>
                <button
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    fontSize: 12,
                    border: "0.5px solid #cbd5e1",
                    borderRadius: 8,
                    padding: "5px 8px",
                    background: "#fff",
                    color: "#64748b",
                    cursor: "pointer",
                  }}
                >
                  <Ic.msg />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Routes ── */}
        <div
          style={{
            background: "#fff",
            border: "0.5px solid #e2e8f0",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "0.5px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Ic.route />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                Truck routes
              </span>
            </div>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>
              {truckRoutes.length} route{truckRoutes.length !== 1 ? "s" : ""}
            </span>
          </div>
          {truckRoutes.length > 0 ? (
            <div style={{ padding: "8px 16px" }}>
              {truckRoutes.map((r: any, i: number) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 0",
                    borderBottom:
                      i < truckRoutes.length - 1
                        ? "0.5px solid #e2e8f0"
                        : "none",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#1e293b",
                        }}
                      >
                        {r.from?.address?.split(",")[0] || "—"}
                      </span>
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#94a3b8"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: "#1e293b",
                        }}
                      >
                        {r.to?.address?.split(",")[0] || "—"}
                      </span>
                    </div>
                  </div>
                  {r.price != null && r.price !== "" && (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#1D4ED8",
                        background: "#EFF6FF",
                        borderRadius: 6,
                        padding: "3px 8px",
                        border: "0.5px solid #BFDBFE",
                        flexShrink: 0,
                      }}
                    >
                      ₹{r.price}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: "24px 16px", textAlign: "center" }}>
              <p style={{ fontSize: 13, color: "#94a3b8" }}>No routes added</p>
            </div>
          )}
        </div>

        {/* ── Vehicle image ── */}
        {item.vehicleImage && getFileUrl(item.vehicleImage) && (
          <div style={panel}>
            <PanelTitle icon={<Ic.image />}>Truck image</PanelTitle>
            <img
              src={getFileUrl(item.vehicleImage)}
              alt="Truck"
              style={{
                maxWidth: "100%",
                maxHeight: 260,
                borderRadius: 8,
                border: "0.5px solid #e2e8f0",
                display: "block",
              }}
            />
          </div>
        )}

        {/* ── RC Document ── */}
        {item.vehicleRCDocument && getFileUrl(item.vehicleRCDocument) && (
          <div style={panel}>
            <PanelTitle icon={<Ic.doc />}>RC document</PanelTitle>
            <a
              href={getFileUrl(item.vehicleRCDocument)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: "#2563eb",
                fontWeight: 500,
                border: "0.5px solid #BFDBFE",
                borderRadius: 8,
                padding: "7px 12px",
                background: "#EFF6FF",
                textDecoration: "none",
              }}
            >
              <Ic.doc /> View RC document
            </a>
          </div>
        )}

        {/* ── Bid Records + Load Selector ── */}
        <div
          style={{
            background: "#fff",
            border: "0.5px solid #e2e8f0",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "0.5px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Ic.file />
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                Bid records
              </span>
            </div>
            <span style={{ fontSize: 11, color: "#94a3b8" }}>
              {bitRecords.length} bid{bitRecords.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div
            style={{
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <LoadAccepted loadBitRecords={item?.bitRecords ?? []} />{" "}
            <BitRecordsSection
              type="truck"
              entityId={id}
              initialRecords={bitRecords}
              onStatusChanged={refreshTruck}
              currentUser={currentUser}
              linkedEntityId={selectedLoadId || undefined}
              ownerUserId={item?.ownerUser?.id}
            />
          </div>
        </div>
      </div>
    </ModulePageLayout>
  );
}
