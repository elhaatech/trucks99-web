"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import {
  getLoad,
  getBitRecords,
  getVehicleTypeAll,
  getVehicleBodyTypeAll,
  getTruckAllWithPagination,
  deleteLoad,
  updateLoad,
  getRowId,
  type Load,
  type LoadBitRecord,
  type VehicleType,
  type VehicleBodyType,
  type Truck,
} from "@/model/api";
import { getCurrentUser } from "@/model/services/user";
import type { User } from "@/model/services/user";
import { subscribeToLoadBidRealtime } from "@/model/services/firebase";
import Button from "@mui/material/Button";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { ROUTES, routes } from "@/lib/routes";
import { useInvalidIdRedirect, useSmartBack } from "@/lib/navigation";
import { getEffectiveLoadStatus } from "@/lib/loadStatus";
import { BitRecordsSection } from "@/components/common/BitRecordsSection";
import { BackButton, ConfirmDialog, ModulePageLayout } from "@/components/common";
import { Spinner } from "@/components/ui";
import { useNotification } from "@/hooks/useNotification";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { LoadCancelDialog } from "../../_components/loadList/LoadCancelDialog";
import Acceptedtruckdetails from "../../_components/loadList/acceptedtruckdetails";

// ── Types ─────────────────────────────────────────────────────────────────────
type LoadExtended = Load & {
  vehicle_name?: string;
  total_tire?: string;
  vehicleCapacity?: number;
  loadCapacity?: number;
  pickupTime?: string;
  truck_status?: string;
  ownerUser?: {
    _id?: string;
    name?: string;
    mobile?: string;
    email?: string;
  };
  accepted_truckIds?: Array<{
    _id?: string;
    id?: string;
    truckNumber?: string;
    registrationNumber?: string;
    truckType?: string;
    capacity?: string;
    loadCapacity?: string;
    vehicleBodyType?: string;
    total_tire?: string;
    status?: string;
    contactNumber?: string | null;
    vehicleImage?: string | null;
    owner?: {
      _id?: string;
      id?: string;
      name?: string;
      mobile?: string;
      email?: string;
    };
  }>;
};

type TruckExtended = Truck & {
  total_tire?: string;
  containerFeet?: string;
  vehicleBodyLength?: string;
  truck_status?: string;
  load_status?: string;
  loadCapacity?: string;
  contactNumber?: string;
  bitReason?: string;
  vehicleType?: string | { _id?: string; name?: string };
  ownerUser?: { _id?: string; name?: string; mobile?: string };
  bitRecords?: Array<{
    _id?: string;
    bit?: number;
    status?: string;
    userName?: string;
    bitReason?: string;
  }>;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (iso?: string) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const fmtTime = (iso?: string) => {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const fmt = (n?: number | null) =>
  n != null ? "₹" + Number(n).toLocaleString("en-IN") : "—";

const truckRowId = (t: Truck) => (t as any)._id || (t as any).id || "";

function userIdsMatch(
  user?: { id?: string; _id?: string } | null,
  ...candidates: (string | undefined | null)[]
): boolean {
  if (!user) return false;
  const userIds = new Set(
    [user.id, user._id, getRowId(user as { id?: string; _id?: string })]
      .filter(Boolean)
      .map(String),
  );
  return candidates.filter(Boolean).some((c) => userIds.has(String(c)));
}

function hasAcceptedTruckOnLoad(
  load: LoadExtended,
  records: LoadBitRecord[] = [],
): boolean {
  if (load.truck_id) return true;
  const accepted = load.accepted_truckIds;
  if (Array.isArray(accepted) && accepted.length > 0) return true;
  return records.some((r) => {
    const s = String(r.status || "").toLowerCase();
    return (s === "accept" || s === "accepted") && Boolean(r.truckId);
  });
}

const vehicleTypeName = (
  vt?: string | { _id?: string; name?: string } | null,
): string => {
  if (!vt) return "—";
  if (typeof vt === "string") return vt;
  if (typeof vt === "object" && "name" in vt) return vt.name ?? "—";
  return "—";
};

// ── Inline SVG icons ──────────────────────────────────────────────────────────
const IconTruck = () => (
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
);

const IconFile = () => (
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
);

const IconPin = () => (
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
);

const IconPhone = () => (
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
);

const IconMsg = () => (
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
);

const IconWarn = () => (
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
);

const IconEdit = () => (
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
);

const IconTrash = () => (
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
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
);

const IconRepost = () => (
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
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);

const IconCancel = () => (
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
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

const IconDeliver = () => (
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
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

// ── Section SVG icons (gradient) ──────────────────────────────────────────────
const IconRoute = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="6" cy="19" r="3" />
    <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
    <circle cx="18" cy="5" r="3" />
  </svg>
);

const IconCargo = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

const IconVehicle = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="1" y="3" width="15" height="13" rx="2" />
    <path d="M16 8h4l3 3v5h-7V8z" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const IconWallet = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
  </svg>
);

const IconNotes = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="white"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

// ── Reusable tiny components ──────────────────────────────────────────────────
const ViewSectionHeader = ({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) => (
  <div
    style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}
  >
    <div
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        flexShrink: 0,
        background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icon}
    </div>
    <div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 700,
          color: "#1e293b",
          lineHeight: 1.2,
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>
          {subtitle}
        </div>
      )}
    </div>
  </div>
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
      {value ?? "—"}
    </span>
  </div>
);

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

const btnBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  fontSize: 12,
  border: "0.5px solid #cbd5e1",
  borderRadius: 8,
  padding: "6px 12px",
  background: "#ffffff",
  cursor: "pointer",
  color: "#64748b",
  fontFamily: "inherit",
};

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
              background: "#f8fafc",
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
export default function LoadViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const hasValidId = useInvalidIdRedirect(id, ROUTES.load.list);
  const goBack = useSmartBack(ROUTES.load.list);

  const [load, setLoad] = useState<LoadExtended | null>(null);
  console.log("🚚 Load details:", load);
  const [bitRecords, setBitRecords] = useState<LoadBitRecord[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [vehicleBodyTypes, setVehicleBodyTypes] = useState<VehicleBodyType[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Current logged-in user — needed for BitRecordsSection bid form
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Selected truck id from TruckSelectorCard — passed as linkedEntityId to BitRecordsSection
  const [selectedTruckId, setSelectedTruckId] = useState("");

  // All trucks for selector
  const [allTrucks, setAllTrucks] = useState<Truck[]>([]);
  const [trucksLoading, setTrucksLoading] = useState(true);

  // Cancel dialog state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Deliver action state
  const [delivering, setDelivering] = useState(false);

  // Delete confirm dialog
  const {
    open: deleteOpen,
    openWith: openDeleteConfirm,
    close: closeDeleteConfirm,
  } = useConfirmDialog<{ row: LoadExtended }>();

  const { notify } = useNotification();

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const reloadLoad = useCallback(() => {
    if (!id) return;
    getLoad(id)
      .then((d) => setLoad(d as LoadExtended))
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("Missing load id");
      return;
    }
    setLoading(true);
    setError("");
    Promise.all([
      getLoad(id),
      getBitRecords<LoadBitRecord>({ entityId: id }),
      getVehicleTypeAll(),
      getVehicleBodyTypeAll(),
    ])
      .then(([loadData, records, vts, vbts]) => {
        setLoad(loadData as LoadExtended);
        setBitRecords(records ?? []);
        setVehicleTypes(vts ?? []);
        setVehicleBodyTypes(vbts ?? []);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, [id]);

  // Fetch current user for bid form
  useEffect(() => {
    getCurrentUser()
      .then((u) => setCurrentUser(u))
      .catch(() => {});
  }, []);

  // Fetch all trucks for the truck selector
  useEffect(() => {
    getTruckAllWithPagination({ page: 1, limit: 200 })
      .then((r) => setAllTrucks(r.trucks ?? []))
      .catch(() => {})
      .finally(() => setTrucksLoading(false));
  }, []);

  // Realtime bid updates
  useEffect(() => {
    if (!id) return;
    const unsubscribe = subscribeToLoadBidRealtime(id, () => {
      getBitRecords<LoadBitRecord>({ entityId: id })
        .then(setBitRecords)
        .catch(() => {});
    });
    return () => unsubscribe();
  }, [id]);

  // ── Action handlers ─────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!load) return;
    try {
      await deleteLoad([getRowId(load)]);
      notify({ type: "danger", message: "Load deleted." });
      router.push(ROUTES.load.list);
    } catch (err) {
      const m = err instanceof Error ? err.message : "Delete failed";
      setError(m);
      notify({ type: "error", message: m });
    }
  }, [load, notify, router]);

  const handleCancelSubmit = useCallback(async () => {
    if (!load || !cancelReason.trim()) return;
    try {
      const { cancelLoad } = await import("@/model/api");
      await cancelLoad(getRowId(load), cancelReason.trim());
      notify({ type: "success", message: "Load cancelled." });
      setCancelDialogOpen(false);
      setCancelReason("");
      reloadLoad();
    } catch (err) {
      const m = err instanceof Error ? err.message : "Cancel failed";
      setError(m);
      notify({ type: "error", message: m });
    }
  }, [load, cancelReason, notify, reloadLoad]);

  // Mark the load delivered — backend (PUT /api/load/edit/:id) detects the
  // assigned/accepted → delivered transition and auto-creates the
  // Income/Expense transactions for the truck owner and load owner.
  const handleDeliver = useCallback(async () => {
    if (!load) return;

    const amount = load.bit != null ? Number(load.bit) : NaN;
    if (!Number.isFinite(amount) || amount <= 0) {
      const m = "Cannot mark delivered: load bit amount is missing or invalid.";
      setError(m);
      notify({ type: "error", message: m });
      return;
    }

    if (!hasAcceptedTruckOnLoad(load, bitRecords)) {
      const m =
        "Cannot mark delivered: no accepted truck is linked to this load.";
      setError(m);
      notify({ type: "error", message: m });
      return;
    }

    setDelivering(true);
    try {
      await updateLoad(getRowId(load), { status: "delivered" });
      notify({
        type: "success",
        message:
          "Load marked as delivered. Income and expense entries were created.",
      });
      reloadLoad();
    } catch (err) {
      const m = err instanceof Error ? err.message : "Failed to mark delivered";
      setError(m);
      notify({ type: "error", message: m });
    } finally {
      setDelivering(false);
    }
  }, [load, bitRecords, notify, reloadLoad]);

  const vehicleTypeLabel = (vtId?: string) => {
    if (!vtId) return "—";
    const vt = vehicleTypes.find(
      (v) => (v.id ?? (v as { _id?: string })._id) === vtId,
    );
    return vt?.vehicle_type || (vt as { name?: string })?.name || vtId;
  };

  const vehicleBodyLabel = (vbId?: string) => {
    if (!vbId) return undefined;
    const vb = vehicleBodyTypes.find(
      (v) => v.vehicle_id === vbId || v._id === vbId || v.id === vbId,
    );
    return vb?.vehicle_name;
  };

  // ── Loading / error guards ──────────────────────────────────────────────────
  if (!hasValidId) {
    return null;
  }

  if (loading) {
    return (
      <ModulePageLayout
        title="Load"
        subtitle="Loading load details…"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Loads", href: routes.load.list() },
          { label: "Details" },
        ]}
        backButton={<BackButton fallback={routes.load.list()} />}
        showAds={false}
      >
        <Spinner label="Loading load…" />
      </ModulePageLayout>
    );
  }

  if (error || !load) {
    return (
      <ModulePageLayout
        title="Load"
        subtitle="Load not found"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Loads", href: routes.load.list() },
          { label: "Not found" },
        ]}
        backButton={<BackButton fallback={routes.load.list()} />}
        showAds={false}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || "Load not found"}
        </Alert>
      </ModulePageLayout>
    );
  }

  const effectiveStatus = getEffectiveLoadStatus({
    ...load,
    bitRecords: bitRecords.length > 0 ? bitRecords : load.bitRecords,
  }).toLowerCase();
  const rawStatus = effectiveStatus;
  const isCancelled = rawStatus === "cancelled" || rawStatus === "rejected";
  const isAdmin = currentUser?.role?.status === "admin";
  const isLoadOwner = userIdsMatch(
    currentUser,
    load.ownerId,
    load.userId,
    load.createdBy,
    load.ownerUser?._id,
    load.ownerUser?.id,
  );
  const canManageLoad = isAdmin || isLoadOwner;
  const canMarkDelivered =
    rawStatus !== "delivered" && rawStatus === "accepted";
  const statusLabel = isCancelled
    ? "Cancelled"
    : rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);

  const statusStyle: React.CSSProperties = isCancelled
    ? { background: "#FCEBEB", color: "#A32D2D", border: "0.5px solid #F09595" }
    : rawStatus === "active" || rawStatus === "delivered"
      ? {
          background: "#EAF3DE",
          color: "#3B6D11",
          border: "0.5px solid #97C459",
        }
      : rawStatus === "assigned" || rawStatus === "accepted"
        ? {
            background: "#EFF6FF",
            color: "#1D4ED8",
            border: "0.5px solid #BFDBFE",
          }
        : {
            background: "#FAEEDA",
            color: "#854F0B",
            border: "0.5px solid #EF9F27",
          };

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

  const hasRejectReason = Boolean(load.rejectReason?.trim());

  const stopAll = Array.isArray((load as { stop_all?: unknown[] }).stop_all)
    ? (load as unknown as { stop_all: { address?: string }[] }).stop_all
    : [];

  return (
    <ModulePageLayout
      title={load.loadNumber || "Load"}
      subtitle={`${originCity} → ${destCity}`}
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Loads", href: routes.load.list() },
        { label: load.loadNumber || id },
      ]}
      backButton={<BackButton fallback={routes.load.list()} />}
      error={error}
      onErrorClose={() => setError("")}
      action={
        canManageLoad ? (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {rawStatus !== "accepted" ? (
              <Button
                variant="outlined"
                size="small"
                startIcon={<EditOutlinedIcon />}
                onClick={() => router.push(ROUTES.load.edit(id))}
              >
                Edit
              </Button>
            ) : null}
            {hasRejectReason ? (
              <Button
                variant="outlined"
                size="small"
                color="error"
                onClick={() =>
                  router.push(`${ROUTES.load.create}?from=${encodeURIComponent(id)}`)
                }
              >
                Repost
              </Button>
            ) : (
              <Button variant="outlined" size="small" color="error" onClick={() => setCancelDialogOpen(true)}>
                Cancel
              </Button>
            )}
            {rawStatus !== "accepted" ? (
              <Button variant="outlined" size="small" color="error" onClick={() => openDeleteConfirm({ row: load })}>
                Delete
              </Button>
            ) : null}
            {canMarkDelivered ? (
              <Button variant="contained" size="small" color="success" onClick={handleDeliver} disabled={delivering}>
                {delivering ? "Marking…" : "Mark Delivered"}
              </Button>
            ) : null}
          </Box>
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
                {load.loadNumber || "Load"}
              </div>
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                {load.material || "—"}
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
                ...statusStyle,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: statusDot,
                  display: "inline-block",
                }}
              />
              {statusLabel}
            </span>
          </div>

          {/* Route track */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#f8fafc",
              borderRadius: 8,
              padding: "14px 16px",
              border: "0.5px solid #e2e8f0",
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 10,
                  color: "#94a3b8",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <IconPin /> Pickup
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#1e293b" }}>
                {originCity}
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                {load.pickupLocation?.address || "—"}
              </div>
            </div>
            <div
              style={{
                flex: "0 0 auto",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "0 16px",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 1,
                  background: "#cbd5e1",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    right: -1,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 0,
                    height: 0,
                    borderTop: "4px solid transparent",
                    borderBottom: "4px solid transparent",
                    borderLeft: "6px solid #cbd5e1",
                  }}
                />
              </div>
              <span
                style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap" }}
              >
                {load.distanceKm != null ? `${load.distanceKm} km` : "—"}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0, textAlign: "right" }}>
              <div
                style={{
                  fontSize: 10,
                  color: "#94a3b8",
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 3,
                }}
              >
                <IconPin /> Drop
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#1e293b" }}>
                {destCity}
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                {load.dropLocation?.address || "—"}
              </div>
            </div>
          </div>
        </div>

        {/* ── 1. Trip Details ── */}
        <div style={panel}>
          <ViewSectionHeader
            icon={<IconRoute />}
            title="Trip Details"
            subtitle="Route, stops and timing"
          />
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <RowItem
                label="Pickup address"
                value={load.pickupLocation?.address}
              />
              {stopAll.length > 0 && (
                <RowItem
                  label={`Stops (${stopAll.length})`}
                  value={
                    <span>
                      {stopAll.map((s, i) => (
                        <span
                          key={i}
                          style={{
                            display: "block",
                            fontSize: 12,
                            color: "#475569",
                          }}
                        >
                          {i + 1}. {s.address || "—"}
                        </span>
                      ))}
                    </span>
                  }
                />
              )}
              <RowItem
                label="Drop address"
                value={load.dropLocation?.address}
              />
            </div>
            <div>
              <RowItem label="Pickup date" value={fmtDate(load.pickupTime)} />
              <RowItem
                label="Pickup time"
                value={fmtTime(load.pickupTime) || undefined}
              />
              <RowItem
                label="Distance"
                value={
                  load.distanceKm != null ? `${load.distanceKm} km` : undefined
                }
                last
              />
            </div>
          </div>
        </div>

        {/* ── 2. Load Details ── */}
        <div style={panel}>
          <ViewSectionHeader
            icon={<IconCargo />}
            title="Load Details"
            subtitle="Material, weight and owner"
          />
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <RowItem label="Material" value={load.material} />
              <RowItem
                label="Weight / Capacity"
                value={
                  load.vehicleCapacity != null
                    ? `${load.vehicleCapacity} T`
                    : undefined
                }
              />
              <RowItem
                label="Load capacity"
                value={
                  load.loadCapacity != null
                    ? `${load.loadCapacity} T`
                    : undefined
                }
                last
              />
            </div>
            <div>
              <RowItem label="Load number" value={load.loadNumber} />
              <RowItem label="Truck status" value={load.truck_status} last />
            </div>
          </div>

          {/* Owner inline */}
          {load.ownerUser && (
            <div
              style={{
                marginTop: 12,
                paddingTop: 12,
                borderTop: "0.5px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: "#64748b",
                  width: 100,
                  flexShrink: 0,
                }}
              >
                Owner
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flex: 1,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: "#EFF6FF",
                    color: "#2563EB",
                    fontWeight: 600,
                    fontSize: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {(load.ownerUser.name || "?")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{ fontSize: 13, fontWeight: 500, color: "#1e293b" }}
                  >
                    {load.ownerUser.name || "—"}
                  </div>
                  {load.ownerUser.mobile && (
                    <div
                      style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}
                    >
                      {load.ownerUser.mobile}
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
                    <IconPhone /> Call
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
                    <IconMsg />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── 3. Vehicle Requirement ── */}
        <div style={panel}>
          <ViewSectionHeader
            icon={<IconVehicle />}
            title="Vehicle Requirement"
            subtitle="Type, body, wheels and length"
          />
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
          >
            <div>
              <RowItem
                label="Vehicle type"
                value={vehicleTypeLabel(load.vehicleType)}
              />
              <RowItem
                label="Body type"
                value={
                  vehicleBodyLabel(load.vehicleBodyType) ?? load.vehicle_name
                }
                last
              />
            </div>
            <div>
              <RowItem label="Total wheels" value={load.total_tire} />
              <RowItem
                label="Container / Length"
                value={load.containerFeet}
                last
              />
            </div>
          </div>
        </div>

        {/* ── 4. Budget & Booking ── */}
        <div style={panel}>
          <ViewSectionHeader
            icon={<IconWallet />}
            title="Budget & Booking"
            subtitle="Expected price, booking time and status"
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <div
              style={{
                background: "#EFF6FF",
                borderRadius: 8,
                padding: "12px 14px",
                border: "0.5px solid #BFDBFE",
              }}
            >
              <div
                style={{
                  color: "#3B82F6",
                  opacity: 0.7,
                  marginBottom: 6,
                  fontSize: 16,
                }}
              >
                ₹
              </div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#1D4ED8" }}>
                {load.bit != null
                  ? `₹${load.bit.toLocaleString("en-IN")}`
                  : "—"}
              </div>
              <div style={{ fontSize: 11, color: "#3B82F6", marginTop: 2 }}>
                Expected budget
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
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>
                {fmtDate(load.pickupTime)}
              </div>
              <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
                Booking date
              </div>
            </div>
            <div
              style={{ ...statusStyle, borderRadius: 8, padding: "12px 14px" }}
            >
              <div style={{ marginBottom: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: statusDot,
                    display: "inline-block",
                  }}
                />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{statusLabel}</div>
              <div style={{ fontSize: 11, marginTop: 2, opacity: 0.7 }}>
                Current status
              </div>
            </div>
          </div>
        </div>

        {/* ── Cancel reason ── */}
        {isCancelled && load.rejectReason && (
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
            <IconWarn />
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
                Cancel reason
              </div>
              <div style={{ fontSize: 13, color: "#633806" }}>
                {load.rejectReason}
              </div>
            </div>
          </div>
        )}

        {/* ── 5. Additional Information ── */}
        {load.description && (
          <div style={panel}>
            <ViewSectionHeader
              icon={<IconNotes />}
              title="Additional Information"
              subtitle="Notes for transporter"
            />
            <div
              style={{
                fontSize: 13,
                color: "#475569",
                lineHeight: 1.6,
                background: "#f8fafc",
                borderRadius: 8,
                padding: "10px 14px",
                border: "0.5px solid #e2e8f0",
                whiteSpace: "pre-wrap",
              }}
            >
              {load.description}
            </div>
          </div>
        )}

        {/* ── Bid Records + Truck Selector ── */}
        <div
          style={{
            background: "#ffffff",
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
              <IconFile />
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
            {(rawStatus === "accepted" || rawStatus === "delivered") && (
              <Acceptedtruckdetails acceptedTrucks={load.accepted_truckIds} />
            )}
            {/* Bid records — currentUser enables the Place Bid form; selectedTruckId links the bid to a truck */}
            <BitRecordsSection
              type="load"
              entityId={id}
              initialRecords={bitRecords}
              onStatusChanged={reloadLoad}
              currentUser={currentUser}
              linkedEntityId={selectedTruckId || undefined}
              ownerUserId={
                getRowId(load.ownerUser || {}) ||
                load.ownerId ||
                load.userId ||
                load.createdBy
              }
            />
          </div>
        </div>
      </div>

      {/* ── Cancel dialog ── */}
      <LoadCancelDialog
        open={cancelDialogOpen}
        onClose={() => {
          setCancelDialogOpen(false);
          setCancelReason("");
        }}
        reason={cancelReason}
        onReasonChange={setCancelReason}
        onSubmit={handleCancelSubmit}
      />

      {/* ── Delete confirm dialog ── */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={closeDeleteConfirm}
        onConfirm={handleDelete}
        title="Delete load?"
        description={`Permanently delete load ${load.loadNumber ?? ""}? This cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="error"
        pendingLabel="Deleting…"
      />
    </ModulePageLayout>
  );
}
