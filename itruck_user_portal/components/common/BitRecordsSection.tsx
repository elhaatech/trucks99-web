"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import Collapse from "@mui/material/Collapse";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Popover from "@mui/material/Popover";
import {
  updateBitRecordStatus,
  createBitRecord,
  type BitRecordKind,
  type LoadBitRecord,
  type TruckBitRecord,
  type ProductBitRecord,
  type BitRecordStatus,
  BIT_RECORD_API_BASE,
  getLoaderAll,
} from "@/model/api";
import { api } from "@/model/services/common_fixed";
import { getUserAll, type User } from "@/model/services/user";
import { getTruckAll, type Truck } from "@/model/services/truck";
import { getBuySellAll, getLoadAll, type Load } from "@/model/services/load";
import { PRIMARY } from "@/lib/theme";
import { ROUTES } from "@/lib/routes";

type AnyBitRecord = LoadBitRecord | TruckBitRecord | ProductBitRecord;
type TabId = "primary" | "secondary";

interface LinkedItem {
  id: string;
  label: string;
  raw: Truck | Load;
}

export interface BitRecordsSectionProps {
  type: BitRecordKind;
  entityId: string;
  initialRecords?: any;
  onStatusChanged?: () => void;
  currentUser?: User | null;
  linkedEntityId?: string;
  ownerUserId?: string;
  ownerUser?: { _id?: string; id?: string; name?: string } | null;
}

const recordId = (r: AnyBitRecord) =>
  (r as { _id?: string })._id || (r as { id?: string }).id || "";

const fmt = (n?: number | null) =>
  n != null ? "₹" + Number(n).toLocaleString("en-IN") : "—";

function isAdmin(user: User): boolean {
  const role = user.role as
    | string
    | { name?: string; status?: string }
    | null
    | undefined;
  if (!role) return false;
  if (typeof role === "string") return role.toLowerCase() === "admin";
  const roleStatus = (role.status ?? "").toLowerCase();
  const roleName = (role.name ?? "").toLowerCase();
  return (
    roleStatus === "admin" || roleName === "admin" || roleName === "super admin"
  );
}

function getRoleName(user: User): string {
  if (!user.role) return "";
  if (typeof user.role === "string") return user.role;
  return (user.role as { name?: string }).name ?? "";
}

function getUserId(user: User): string {
  return (user as { _id?: string } & User)._id || user.id || "";
}

function getAllUserIds(user: User): string[] {
  const ids = new Set<string>();
  const mongoId = (user as any)._id;
  const uuid = user.id;
  if (mongoId) ids.add(String(mongoId));
  if (uuid) ids.add(String(uuid));
  return [...ids].filter(Boolean);
}

function getAllOwnerIds(
  ownerUserId?: string,
  ownerUser?: { _id?: string; id?: string } | null,
): string[] {
  const ids = new Set<string>();
  if (ownerUserId) ids.add(String(ownerUserId));
  if (ownerUser?._id) ids.add(String(ownerUser._id));
  if (ownerUser?.id) ids.add(String(ownerUser.id));
  return [...ids].filter(Boolean);
}

function checkIsOwner(
  currentUser: User | null | undefined,
  ownerUserId?: string,
  ownerUser?: { _id?: string; id?: string } | null,
): boolean {
  if (!currentUser) return false;
  const userIds = getAllUserIds(currentUser);
  const ownerIds = getAllOwnerIds(ownerUserId, ownerUser);
  if (userIds.length === 0 || ownerIds.length === 0) return false;
  return userIds.some((uid) => ownerIds.includes(uid));
}

function getEntityId(e: { _id?: string; id?: string }): string {
  return e._id || e.id || "";
}

function getTruckLabel(truck: Truck): string {
  const base = truck.truckNumber || getEntityId(truck);
  const vehicleType = (truck.vehicleType as any)?.name;
  return vehicleType ? `${base} · ${vehicleType}` : base;
}
function getLoadLabel(load: Load): string {
  const base = load.loadNumber || load.title || getEntityId(load);
  const vehicleType = (load as any).vehicleTypeLabel;
  return vehicleType ? `${base} · ${vehicleType}` : base;
}
// ── API fetch helpers ─────────────────────────────────────────────────────────

async function fetchAllOffers(params: {
  type: BitRecordKind;
  entityId: string;
  userId?: string;
}): Promise<AnyBitRecord[]> {
  const body: Record<string, unknown> = {
    type: "",
    entityId: params.entityId,
  };

  if (params.type === "load") body.loadId = params.entityId;
  else if (params.type === "truck") body.truckId = params.entityId;
  else body.productId = params.entityId;

  if (params.userId) {
    body.userId = params.userId;
  }

  const res = await api<
    AnyBitRecord[] | { bitRecords?: AnyBitRecord[]; success?: boolean }
  >(`${BIT_RECORD_API_BASE}/list`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (Array.isArray(res)) return res;
  if (Array.isArray((res as any)?.bitRecords)) return (res as any).bitRecords;
  return [];
}

// ── Fetch ONLY current user's own offers for a given entity ───────────────────
// Used when the viewer is not the owner/admin — they can only see their own bids.

async function fetchMyOffersForEntity(params: {
  // type: BitRecordKind;
  // off
  offerType: "my_offers" | "received_offers";

  entityId: string;
  userId: string;
}): Promise<AnyBitRecord[]> {
  const body: Record<string, unknown> = {
    // type: params.type,
    type: "",
    entityId: params.entityId,
    userId: params.userId,
    offerType: "my_offers",
  };

  const res = await api<
    AnyBitRecord[] | { bitRecords?: AnyBitRecord[]; success?: boolean }
  >(`${BIT_RECORD_API_BASE}/list`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (Array.isArray(res)) return res;
  if (Array.isArray((res as any)?.bitRecords)) return (res as any).bitRecords;
  return [];
}

const sectionLabel = (): React.CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  color: PRIMARY,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  marginBottom: 8,
});

const primaryBtnSx = {
  fontSize: 12,
  fontWeight: 500,
  textTransform: "none" as const,
  borderRadius: "8px",
  color: "#fff",
  backgroundColor: PRIMARY,
  boxShadow: `0 1px 4px ${PRIMARY}55 !important`,
  "&:hover": {
    backgroundColor: PRIMARY,
    filter: "brightness(0.88)",
    boxShadow: `0 2px 8px ${PRIMARY}77 !important`,
  },
  "&.Mui-disabled": {
    backgroundColor: PRIMARY,
    filter: "brightness(1.3) saturate(0.5)",
    color: "#fff",
    boxShadow: "none !important",
    opacity: 0.55,
  },
};

// ── Current User Banner ───────────────────────────────────────────────────────

function CurrentUserBanner({ user }: { user: User }) {
  const roleName = getRoleName(user);
  const admin = isAdmin(user);
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        background: `linear-gradient(135deg, ${PRIMARY}0d 0%, ${PRIMARY}18 100%)`,
        border: `1.5px solid ${PRIMARY}33`,
        borderRadius: "10px",
        p: "10px 14px",
        mb: "14px",
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          borderRadius: "9px",
          flexShrink: 0,
          backgroundColor: PRIMARY,
          color: "#fff",
          fontWeight: 700,
          fontSize: 15,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {(user.name || "?")[0].toUpperCase()}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
          {user.name || "—"}
        </div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 1 }}>
          {(user as any).mobile || (user as any).email || ""}
          {roleName && (
            <span
              style={{
                marginLeft: 6,
                fontSize: 10,
                fontWeight: 600,
                color: admin ? "#7c3aed" : PRIMARY,
                background: admin ? "#f5f3ff" : `${PRIMARY}14`,
                border: `1px solid ${admin ? "#c4b5fd" : PRIMARY + "44"}`,
                borderRadius: 10,
                padding: "1px 7px",
              }}
            >
              {roleName}
            </span>
          )}
        </div>
      </Box>
      <span
        style={{
          fontSize: 10,
          color: "#3B6D11",
          background: "#EAF3DE",
          border: "1px solid #97C459",
          borderRadius: 10,
          padding: "2px 9px",
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        Logged in
      </span>
    </Box>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  const raw = (status ?? "").trim().toLowerCase();
  const canonical =
    raw === "accept" || raw === "accepted"
      ? "accept"
      : raw === "reject" || raw === "rejected"
        ? "reject"
        : "pending";

  const map: Record<
    string,
    { bg: string; color: string; border: string; label: string }
  > = {
    accept: {
      bg: "#EAF3DE",
      color: "#3B6D11",
      border: "#97C459",
      label: "Accepted",
    },
    reject: {
      bg: "#FCEBEB",
      color: "#A32D2D",
      border: "#F09595",
      label: "Rejected",
    },
    pending: {
      bg: "#FAEEDA",
      color: "#854F0B",
      border: "#EF9F27",
      label: "Pending",
    },
  };
  const s = map[canonical];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 20,
        padding: "3px 10px",
        background: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: s.color,
          display: "inline-block",
        }}
      />
      {s.label}
    </span>
  );
}

// ── Source Tag ────────────────────────────────────────────────────────────────

function SourceTag({
  label,
  color,
  bg,
  border,
}: {
  label: string;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        borderRadius: 4,
        padding: "2px 7px",
        background: bg,
        color,
        border: `1px solid ${border}`,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

// ── Detail Popover ────────────────────────────────────────────────────────────
// ── Update EXCLUDED_KEYS (replace the existing one at line 389) ──────────────────
const EXCLUDED_KEYS = new Set([
  "_id",
  "id",
  "__v",
  "createdAt",
  "updatedAt",
  "bitRecords",
  "truckbitRecords",
  "loadbitRecords",
  "raw",
  "owner",
  "vehicleImages",
  "routes",
  "stop_all",
  "acceptedLoadId",
  "acceptedBitRecordId",
]);

// ── Improved formatFieldValue (replace existing at line 391) ────────────────────
function formatFieldValue(val: unknown): string {
  if (val === null || val === undefined || val === "") return "—";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "number") return val.toLocaleString("en-IN");
  if (typeof val === "string") return val;
  if (Array.isArray(val)) return val.length === 0 ? "—" : val.join(", ");

  // Handle nested objects (extract meaningful values)
  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;

    // For vehicleType object: show name
    if ("name" in obj) return String(obj.name);

    // For ownerUser object: show name
    if ("name" in obj && "mobile" in obj) return String(obj.name);

    // For location objects: show address
    if ("address" in obj) return String(obj.address);

    // Fallback: try to build meaningful string
    const fields = Object.entries(obj)
      .filter(([k]) => !EXCLUDED_KEYS.has(k) && typeof obj[k] === "string")
      .map(([k, v]) => v)
      .filter(Boolean);

    return fields.length > 0 ? fields.join(" · ") : "—";
  }

  return String(val);
}
function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]/g, " ")
    .replace(/^\s+/, "")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
// ── DetailPopover (replace entire existing DetailPopover function) ──────────────
function DetailPopover({
  anchorEl,
  item,
  kind,
  onClose,
}: {
  anchorEl: HTMLElement | null;
  item: Truck | Load | null;
  kind: "truck" | "load";
  onClose: () => void;
}) {
  const open = Boolean(anchorEl) && Boolean(item);
  if (!item) return null;

  const entries = Object.entries(item as Record<string, unknown>).filter(
    ([k, v]) => !EXCLUDED_KEYS.has(k) && v !== undefined,
  );

  const iconPath =
    kind === "truck"
      ? "M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM18.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"
      : "M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM4 5h16M9 3h6";

  const accentColor = kind === "truck" ? "#6366f1" : "#0ea5e9";
  const accentBg = kind === "truck" ? "#eef2ff" : "#e0f2fe";

  // Get vehicle type display
  const vehicleTypeDisplay =
    kind === "truck"
      ? ((item as any).vehicleType as any)?.name
      : (item as any).vehicleTypeLabel || "—";

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
            border: `1.5px solid ${accentColor}33`,
            boxShadow: `0 8px 32px ${accentColor}22, 0 2px 8px #0001`,
            width: 340,
            overflow: "hidden",
          },
        },
      }}
    >
      <Box
        sx={{
          px: "16px",
          py: "12px",
          background: `linear-gradient(135deg, ${accentBg} 0%, #fff 100%)`,
          borderBottom: `1px solid ${accentColor}22`,
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: "8px",
            flexShrink: 0,
            backgroundColor: accentColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={iconPath} />
          </svg>
        </Box>
        <Box sx={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#1e293b" }}>
            {kind === "truck"
              ? (item as Truck).truckNumber || "Truck Details"
              : (item as Load).loadNumber ||
                (item as Load).title ||
                "Load Details"}
          </div>
          <div
            style={{
              fontSize: 10,
              color: accentColor,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {vehicleTypeDisplay} · Full Details
          </div>
        </Box>
        <Box
          component="button"
          onClick={onClose}
          sx={{
            background: "none",
            border: "none",
            cursor: "pointer",
            width: 24,
            height: 24,
            borderRadius: "6px",
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
      <Box sx={{ p: "12px 16px", maxHeight: 320, overflowY: "auto" }}>
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
              gap: "8px 12px",
            }}
          >
            {entries.map(([key, val]) => (
              <Box
                key={key}
                sx={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "7px",
                  p: "7px 10px",
                  ...(typeof val === "object" && val !== null
                    ? { gridColumn: "1 / -1" }
                    : {}),
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#94a3b8",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 2,
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
                  {key.toLowerCase().includes("status") ? (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 10,
                        padding: "1px 8px",
                        background: accentBg,
                        color: accentColor,
                        border: `1px solid ${accentColor}44`,
                      }}
                    >
                      {formatFieldValue(val)}
                    </span>
                  ) : (
                    formatFieldValue(val)
                  )}
                </div>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Popover>
  );
}

// ── Add Bid Form ──────────────────────────────────────────────────────────────

function AddBidForm({
  type,
  entityId,
  currentUser,
  linkedEntityId,
  onCreated,
  onCancel,
}: {
  type: BitRecordKind;
  entityId: string;
  currentUser: User;
  linkedEntityId?: string;
  onCreated: (record: AnyBitRecord) => void;
  onCancel: () => void;
}) {
  const [amount, setAmount] = useState(type === "truck" ? "1" : "");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<BitRecordStatus>("pending");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const admin = isAdmin(currentUser);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(
    getUserId(currentUser),
  );
  const [usersLoading, setUsersLoading] = useState(false);
  const [linkedItems, setLinkedItems] = useState<LinkedItem[]>([]);
  const [selectedLinkedId, setSelectedLinkedId] = useState<string>(
    linkedEntityId ?? "",
  );
  const [linkedLoading, setLinkedLoading] = useState(false);
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [popoverItem, setPopoverItem] = useState<Truck | Load | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const usersLoadedRef = useRef(false);

  const filteredLinkedItems = linkedItems.filter((item) => {
    if (!selectedUserId) return true;
    const raw = item.raw as Record<string, unknown>;
    const ownerFieldId =
      (raw.ownerId as string) ||
      (raw.userId as string) ||
      (raw.createdBy as string) ||
      "";
    if (ownerFieldId) return ownerFieldId === selectedUserId;
    const userObj = raw.ownerUser as { _id?: string; id?: string } | undefined;
    if (userObj)
      return userObj._id === selectedUserId || userObj.id === selectedUserId;
    return true;
  });

  useEffect(() => {
    setSelectedLinkedId("");
    setPopoverAnchor(null);
    setPopoverItem(null);
  }, [selectedUserId]);

  useEffect(() => {
    if (admin && !usersLoadedRef.current) {
      usersLoadedRef.current = true;
      setUsersLoading(true);
      Promise.all([getUserAll(), getTruckAll()])
        .then(([users, trucks]) => {
          // Create a Set of all truck owner IDs (both _id and id formats)
          const truckOwnerIds = new Set<string>();
          trucks.forEach((t) => {
            if (t.ownerId) truckOwnerIds.add(String(t.ownerId));
            if (t.ownerUser?._id) truckOwnerIds.add(String(t.ownerUser._id));
            if (t.ownerUser?.id) truckOwnerIds.add(String(t.ownerUser.id));
            if (t.createdBy) truckOwnerIds.add(String(t.createdBy));
          });

          // Filter users: Agent or Transporter role + owns at least one truck
          const eligibleUsers = users.filter((user) => {
            const role = getRoleName(user);
            const userIds = getAllUserIds(user);
            const isEligibleRole = role === "Agent" || role === "Transporter";
            const ownsTruck = userIds.some((uid) => truckOwnerIds.has(uid));
            return isEligibleRole && ownsTruck;
          });

          setAllUsers(eligibleUsers);
          setSelectedUserId(getUserId(currentUser));
        })
        .catch(console.error)
        .finally(() => setUsersLoading(false));
    }
    setLinkedLoading(true);
    if (type === "load") {
      getTruckAll()
        .then((trucks: Truck[]) =>
          setLinkedItems(
            trucks.map((t) => ({
              id: getEntityId(t),
              label: getTruckLabel(t),
              raw: t,
            })),
          ),
        )
        .catch(console.error)
        .finally(() => setLinkedLoading(false));
    } else if (type === "truck") {
      getLoadAll()
        .then((loads: Load[]) =>
          setLinkedItems(
            loads.map((l) => ({
              id: getEntityId(l),
              label: getLoadLabel(l),
              raw: l,
            })),
          ),
        )
        .catch(console.error)
        .finally(() => setLinkedLoading(false));
    } else {
      setLinkedLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin, type]);

  useEffect(() => {
    if (linkedEntityId && linkedItems.length > 0) {
      const found = linkedItems.find((i) => i.id === linkedEntityId);
      if (found && dropdownRef.current) {
        setPopoverItem(found.raw);
        setPopoverAnchor(dropdownRef.current);
      }
    }
  }, [linkedItems, linkedEntityId]);

  const handleLinkedChange = (value: string) => {
    setSelectedLinkedId(value);
    if (!value) {
      setPopoverAnchor(null);
      setPopoverItem(null);
      return;
    }
    const found = linkedItems.find((i) => i.id === value);
    if (found && dropdownRef.current) {
      setPopoverItem(found.raw);
      setPopoverAnchor(dropdownRef.current);
    }
  };

  const activeBidder: User =
    admin && selectedUserId
      ? (allUsers.find((u) => getUserId(u) === selectedUserId) ?? currentUser)
      : currentUser;

  const handleSubmit = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError("Enter a valid offer amount.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const userEmail =
        (activeBidder as any).email || (activeBidder as any).mobile || "";

      const base = {
        bit: Number(amount),
        bitReason: reason.trim() || undefined,
        status,
        userName: activeBidder.name,
        userId: getUserId(activeBidder),
        userEmail,
        user: { name: activeBidder.name, role: activeBidder.role },
      };
      let payload: Parameters<typeof createBitRecord>[0];
      if (type === "load")
        payload = {
          ...base,
          type: "load" as const,
          loadId: entityId,
          truckId: selectedLinkedId || undefined,
        };
      else if (type === "truck")
        payload = {
          ...base,
          type: "truck" as const,
          truckId: entityId,
          loadId: selectedLinkedId || undefined,
        };
      else
        payload = {
          ...base,
          type: "product" as const,
          productId: entityId,
        };
      const record = await createBitRecord(
        payload as Parameters<typeof createBitRecord>[0],
      );
      onCreated(record);
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create bid");
    } finally {
      setSaving(false);
    }
  };

  const linkedLabel = type === "truck" ? "Associated Load" : "Associated Truck";
  const linkedPlaceholder =
    type === "truck" ? "Choose a load" : "Choose a truck";
  const popoverKind = type === "truck" ? "load" : "truck";
  const sectionCount = {
    user: "1",
    linked: type !== "product" ? "2" : null,
    details: type !== "product" ? "3" : "2",
  };

  return (
    <>
      <Box
        sx={{
          border: `2px solid ${PRIMARY} !important`,
          borderRadius: "10px",
          background: "#fafbff",
          overflow: "hidden",
          mb: "14px",
        }}
      >
        <Box
          sx={{
            px: "16px",
            py: "10px",
            borderBottom: "1px solid #e2e8f0",
            background: `linear-gradient(135deg, ${PRIMARY}0d 0%, ${PRIMARY}18 100%)`,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: "6px",
              flexShrink: 0,
              backgroundColor: PRIMARY,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </Box>
          <span style={{ fontSize: 12, fontWeight: 600, color: PRIMARY }}>
            Send Offer
          </span>
        </Box>
        <Box
          sx={{
            p: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {/* Section 1: User */}
          <div>
            <div style={sectionLabel()}>{sectionCount.user}. User Details</div>
            {admin ? (
              <FormControl fullWidth size="small">
                <InputLabel>Bidding as</InputLabel>
                <Select
                  label="Bidding as"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  disabled={usersLoading}
                  sx={{ background: "#fff", fontSize: 13 }}
                >
                  {usersLoading ? (
                    <MenuItem value="">
                      <CircularProgress size={13} sx={{ mr: 1 }} /> Loading…
                    </MenuItem>
                  ) : (
                    allUsers.map((u) => {
                      const uid = getUserId(u);
                      return (
                        <MenuItem key={uid} value={uid} sx={{ fontSize: 13 }}>
                          {u.name || "—"}
                          {getRoleName(u) ? ` (${getRoleName(u)})` : ""}
                        </MenuItem>
                      );
                    })
                  )}
                </Select>
              </FormControl>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  p: "8px 12px",
                }}
              >
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: "7px",
                    flexShrink: 0,
                    backgroundColor: `${PRIMARY}18`,
                    color: PRIMARY,
                    fontWeight: 700,
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {(currentUser.name || "?")[0].toUpperCase()}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <div
                    style={{ fontSize: 13, fontWeight: 500, color: "#1e293b" }}
                  >
                    {currentUser.name || "—"}
                  </div>
                  {currentUser.role && (
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>
                      {getRoleName(currentUser)}
                    </div>
                  )}
                </Box>
                <span
                  style={{
                    fontSize: 10,
                    color: "#3B6D11",
                    background: "#EAF3DE",
                    border: "1px solid #97C459",
                    borderRadius: 10,
                    padding: "2px 8px",
                    fontWeight: 600,
                  }}
                >
                  You
                </span>
              </Box>
            )}
          </div>

          {/* Section 2: Associated entity */}
          {type !== "product" && (
            <div>
              <div style={sectionLabel()}>
                {sectionCount.linked}. {linkedLabel}
              </div>
              <div ref={dropdownRef}>
                <FormControl fullWidth size="small">
                  <InputLabel>{linkedPlaceholder}</InputLabel>
                  <Select
                    label={linkedPlaceholder}
                    value={selectedLinkedId}
                    onChange={(e) => handleLinkedChange(e.target.value)}
                    disabled={linkedLoading}
                    displayEmpty
                    sx={{ background: "#fff", fontSize: 13 }}
                  >
                    <MenuItem value="" sx={{ fontSize: 13, color: "#94a3b8" }}>
                      — None —
                    </MenuItem>
                    {linkedLoading ? (
                      <MenuItem value="__loading__" disabled>
                        <CircularProgress size={13} sx={{ mr: 1 }} /> Loading…
                      </MenuItem>
                    ) : filteredLinkedItems.length === 0 ? (
                      <MenuItem
                        value=""
                        disabled
                        sx={{ fontSize: 13, color: "#94a3b8" }}
                      >
                        No {type === "truck" ? "loads" : "trucks"} found
                      </MenuItem>
                    ) : (
                      filteredLinkedItems.map((item) => (
                        <MenuItem
                          key={item.id}
                          value={item.id}
                          sx={{ fontSize: 13 }}
                        >
                          {item.label}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>
              </div>
              {selectedLinkedId && popoverItem && (
                <Box
                  onClick={() => setPopoverAnchor(dropdownRef.current)}
                  sx={{
                    mt: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    background: popoverKind === "truck" ? "#eef2ff" : "#e0f2fe",
                    border: `1px solid ${popoverKind === "truck" ? "#6366f133" : "#0ea5e933"}`,
                    borderRadius: "7px",
                    px: "10px",
                    py: "6px",
                    cursor: "pointer",
                    "&:hover": { filter: "brightness(0.96)" },
                  }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={popoverKind === "truck" ? "#6366f1" : "#0ea5e9"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: popoverKind === "truck" ? "#6366f1" : "#0ea5e9",
                      flex: 1,
                    }}
                  >
                    {popoverKind === "truck" ? "Truck" : "Load"} details loaded
                    — click to view
                  </span>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={popoverKind === "truck" ? "#6366f1" : "#0ea5e9"}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Box>
              )}
            </div>
          )}

          {/* Section 3: Bid Details */}
          <div>
            <div style={sectionLabel()}>
              {sectionCount.details}. Offer Details
            </div>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: type === "truck" ? "1fr" : "1fr 1fr",
                gap: "10px",
              }}
            >
              {type !== "truck" && (
                <TextField
                  label="Offer Amount (₹)"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setError("");
                  }}
                  size="small"
                  fullWidth
                  type="number"
                  inputProps={{ min: 1 }}
                  sx={{
                    "& .MuiInputBase-root": {
                      background: "#fff",
                      fontSize: 13,
                    },
                  }}
                />
              )}

              <TextField
                label="Offer Reason (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                size="small"
                fullWidth
                sx={{
                  "& .MuiInputBase-root": { background: "#fff", fontSize: 13 },
                }}
              />
            </Box>
          </div>

          {error && (
            <Box
              sx={{
                fontSize: 12,
                color: "#A32D2D",
                background: "#FCEBEB",
                border: "1px solid #F09595",
                borderRadius: "6px",
                p: "6px 10px",
              }}
            >
              {error}
            </Box>
          )}

          <Button
            variant="contained"
            disableElevation
            size="small"
            disabled={saving || (type !== "truck" && !amount.trim())}
            onClick={handleSubmit}
            startIcon={
              saving ? (
                <CircularProgress size={11} sx={{ color: "#fff" }} />
              ) : undefined
            }
            sx={{ ...primaryBtnSx, px: "16px", py: "7px" }}
          >
            {saving ? "Sending…" : "Send Offer"}
          </Button>
        </Box>
      </Box>
      <DetailPopover
        anchorEl={popoverAnchor}
        item={popoverItem}
        kind={popoverKind as "truck" | "load"}
        onClose={() => setPopoverAnchor(null)}
      />
    </>
  );
}

// ── Bid Table ─────────────────────────────────────────────────────────────────

interface BidTableProps {
  records: AnyBitRecord[];
  contextType: BitRecordKind;
  updatingId: string | null;
  onStatusChange: (record: AnyBitRecord, newStatus: BitRecordStatus) => void;
  disableActions?: boolean;
}

function BidTable({
  records,
  contextType,
  updatingId,
  onStatusChange,
  disableActions,
}: BidTableProps) {
  if (records.length === 0) {
    return (
      <Box
        sx={{
          py: "36px",
          textAlign: "center",
          color: "#94a3b8",
          fontSize: 13,
          background: "#f8fafc",
          borderRadius: "10px",
          border: "1px dashed #e2e8f0",
        }}
      >
        <Box sx={{ mb: "6px" }}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </Box>
        No offers available under this view.
      </Box>
    );
  }

  const hideLoadRef = contextType === "load" || contextType === "product";
  const hideTruckRef = contextType === "truck" || contextType === "product";

  const colParts = [
    "32px",
    "100px",
    "1.4fr",
    ...(!hideLoadRef ? ["1.1fr"] : []),
    ...(!hideTruckRef ? ["1.1fr"] : []),
    "1fr",
    "100px",
    ...(!disableActions ? ["130px"] : []),
  ];
  const cols = colParts.join(" ");

  const headers = [
    "#",
    ...(contextType !== "truck" ? ["Amount"] : []),
    "Bidder",
    ...(!hideLoadRef ? ["Load Ref"] : []),
    ...(contextType !== "truck" ? ["Truck Ref"] : []),
    "Reason",
    "Status",
    ...(!disableActions ? ["Actions"] : []),
  ];

  return (
    <Box
      sx={{
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: cols,
          background: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          p: "8px 14px",
        }}
      >
        {headers.map((h, i) => (
          <div
            key={i}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              paddingRight: 8,
            }}
          >
            {h}
          </div>
        ))}
      </Box>

      {records.map((record, idx) => {
        const id = recordId(record);
        const isUpdating = updatingId === id;

        const rawStatus = (
          (record as any).status ||
          (record as any).bitStatus ||
          "pending"
        )
          .toString()
          .trim()
          .toLowerCase();

        const status = rawStatus as BitRecordStatus;
        const isPending = status === "pending";

        const nestedTruck = ((record as any).truck_info ??
          (record as any).truck) as Truck | undefined;

        const nestedLoad = ((record as any).load_info ??
          (record as any).load) as Load | undefined;

        const rawLoadId = ((record as any).load_id ??
          (record as any).loadId) as string | undefined;

        const rawTruckId = ((record as any).truck_id ??
          (record as any).truckId) as string | undefined;

        const borderColor =
          status === "accept"
            ? "#97C459"
            : status === "reject"
              ? "#F09595"
              : "#EF9F27";

        return (
          <Box
            key={id || idx}
            sx={{
              display: "grid",
              gridTemplateColumns: cols,
              p: "11px 14px",
              borderBottom:
                idx < records.length - 1 ? "1px solid #f1f5f9" : "none",
              borderLeft: `3px solid ${borderColor}`,
              alignItems: "center",
              background: idx % 2 === 0 ? "#fff" : "#fafbfc",
            }}
          >
            <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 500 }}>
              {idx + 1}
            </div>
            {contextType !== "truck" && (
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: PRIMARY,
                  paddingRight: 8,
                }}
              >
                {fmt(record.bit)}
              </div>
            )}

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                paddingRight: "8px",
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "7px",
                  flexShrink: 0,
                  backgroundColor: `${PRIMARY}18`,
                  color: PRIMARY,
                  fontWeight: 700,
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {(record.userName || "?")[0].toUpperCase()}
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#1e293b",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {record.userName || "—"}
                </div>
                {(record as any).userEmail && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "#94a3b8",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {(record as any).userEmail}
                  </div>
                )}
              </Box>
            </Box>

            {/* Load Ref column */}
            {!hideLoadRef && (
              <div style={{ paddingRight: 8, minWidth: 0 }}>
                {nestedLoad ? (
                  <span
                    style={{
                      fontSize: 11,
                      color: "#0c4a6e",
                      background: "#e0f2fe",
                      borderRadius: 5,
                      padding: "2px 7px",
                      border: "1px solid #bae6fd",
                      display: "inline-block",
                      maxWidth: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={(nestedLoad as any)._id || rawLoadId || ""}
                  >
                    {nestedLoad.loadNumber ||
                      nestedLoad.title ||
                      rawLoadId ||
                      "Linked"}
                  </span>
                ) : rawLoadId ? (
                  <span
                    style={{
                      fontSize: 11,
                      color: "#0c4a6e",
                      background: "#e0f2fe",
                      borderRadius: 5,
                      padding: "2px 7px",
                      border: "1px solid #bae6fd",
                      display: "inline-block",
                      maxWidth: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={rawLoadId}
                  >
                    {rawLoadId}
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: "#cbd5e1" }}>—</span>
                )}
              </div>
            )}

            {/* Truck Ref column */}
            {!hideTruckRef && (
              <div style={{ paddingRight: 8, minWidth: 0 }}>
                {nestedTruck ? (
                  <span
                    style={{
                      fontSize: 11,
                      color: "#312e81",
                      background: "#eef2ff",
                      borderRadius: 5,
                      padding: "2px 7px",
                      border: "1px solid #e0e7ff",
                      display: "inline-block",
                      maxWidth: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={(nestedTruck as any)._id || rawTruckId || ""}
                  >
                    {nestedTruck.truckNumber ||
                      (nestedTruck as any).registrationNumber ||
                      rawTruckId ||
                      "Linked"}
                  </span>
                ) : rawTruckId ? (
                  <span
                    style={{
                      fontSize: 11,
                      color: "#312e81",
                      background: "#eef2ff",
                      borderRadius: 5,
                      padding: "2px 7px",
                      border: "1px solid #e0e7ff",
                      display: "inline-block",
                      maxWidth: "100%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={rawTruckId}
                  >
                    {rawTruckId}
                  </span>
                ) : (
                  <span style={{ fontSize: 11, color: "#cbd5e1" }}>—</span>
                )}
              </div>
            )}

            <div style={{ paddingRight: 8, minWidth: 0 }}>
              {record.bitReason ? (
                <span
                  style={{
                    fontSize: 11,
                    color: "#475569",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    display: "block",
                  }}
                >
                  {record.bitReason}
                </span>
              ) : (
                <span style={{ fontSize: 11, color: "#cbd5e1" }}>—</span>
              )}
            </div>

            <div>
              <StatusBadge status={status} />
            </div>

            {!disableActions && (
              <Box
                sx={{ display: "flex", gap: "5px", justifyContent: "flex-end" }}
              >
                {isPending ? (
                  <>
                    <Button
                      size="small"
                      disabled={isUpdating}
                      onClick={() => onStatusChange(record, "accept")}
                      startIcon={
                        isUpdating ? (
                          <CircularProgress
                            size={9}
                            sx={{ color: "#3B6D11" }}
                          />
                        ) : undefined
                      }
                      sx={{
                        fontSize: 11,
                        fontWeight: 500,
                        textTransform: "none",
                        color: "#3B6D11",
                        background: "#EAF3DE",
                        border: "1px solid #97C459",
                        borderRadius: "6px",
                        minWidth: 0,
                        px: "10px",
                        py: "3px",
                        "&:hover": {
                          background: "#d4edbc",
                          borderColor: "#7ab33e",
                        },
                        "&.Mui-disabled": { opacity: 0.6 },
                      }}
                    >
                      Accept
                    </Button>
                    <Button
                      size="small"
                      disabled={isUpdating}
                      onClick={() => onStatusChange(record, "reject")}
                      sx={{
                        fontSize: 11,
                        fontWeight: 500,
                        textTransform: "none",
                        color: "#A32D2D",
                        background: "#FCEBEB",
                        border: "1px solid #F09595",
                        borderRadius: "6px",
                        minWidth: 0,
                        px: "10px",
                        py: "3px",
                        "&:hover": {
                          background: "#fad5d5",
                          borderColor: "#e07070",
                        },
                        "&.Mui-disabled": { opacity: 0.6 },
                      }}
                    >
                      Reject
                    </Button>
                  </>
                ) : (
                  <span style={{ fontSize: 11, color: "#cbd5e1" }}>—</span>
                )}
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

// ── Stats Row ─────────────────────────────────────────────────────────────────

function StatsRow({ records }: { records: AnyBitRecord[] }) {
  if (records.length === 0) return null;
  const totalBidValue = records.reduce((sum, r) => sum + (r.bit ?? 0), 0);
  const acceptedRecords = records.filter((r) => {
    const s = ((r as any).status || "").toString().trim().toLowerCase();
    return s === "accept" || s === "accepted";
  });
  const pendingRecords = records.filter((r) => {
    const s = ((r as any).status || "").toString().trim().toLowerCase();
    return s === "pending";
  });
  const highestAccepted =
    acceptedRecords.length > 0
      ? Math.max(...acceptedRecords.map((r) => r.bit ?? 0))
      : null;
  const highestPending =
    pendingRecords.length > 0
      ? Math.max(...pendingRecords.map((r) => r.bit ?? 0))
      : null;

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "10px",
        mb: "14px",
      }}
    >
      <Box
        sx={{
          background: "#f8fafc",
          borderRadius: "10px",
          border: "1px solid #e2e8f0",
          p: "12px 14px",
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: "#94a3b8",
            fontWeight: 500,
            marginBottom: 6,
          }}
        >
          Total Offer Value
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#1e293b" }}>
          {fmt(totalBidValue)}
        </div>
        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>
          {records.length} offer{records.length !== 1 ? "s" : ""}
        </div>
      </Box>
      <Box
        sx={{
          background: acceptedRecords.length > 0 ? "#EAF3DE" : "#f8fafc",
          borderRadius: "10px",
          border: `1px solid ${acceptedRecords.length > 0 ? "#97C459" : "#e2e8f0"}`,
          p: "12px 14px",
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: acceptedRecords.length > 0 ? "#3B6D11" : "#94a3b8",
            fontWeight: 500,
            marginBottom: 6,
          }}
        >
          Accepted
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: acceptedRecords.length > 0 ? "#3B6D11" : "#94a3b8",
          }}
        >
          {acceptedRecords.length}
        </div>
        <div
          style={{
            fontSize: 11,
            color: acceptedRecords.length > 0 ? "#3B6D11" : "#94a3b8",
            marginTop: 3,
          }}
        >
          {highestAccepted != null ? fmt(highestAccepted) : "—"}
        </div>
      </Box>
      <Box
        sx={{
          background: pendingRecords.length > 0 ? "#FAEEDA" : "#f8fafc",
          borderRadius: "10px",
          border: `1px solid ${pendingRecords.length > 0 ? "#EF9F27" : "#e2e8f0"}`,
          p: "12px 14px",
        }}
      >
        <div
          style={{
            fontSize: 11,
            color: pendingRecords.length > 0 ? "#854F0B" : "#94a3b8",
            fontWeight: 500,
            marginBottom: 6,
          }}
        >
          Pending
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: pendingRecords.length > 0 ? "#854F0B" : "#94a3b8",
          }}
        >
          {pendingRecords.length}
        </div>
        <div
          style={{
            fontSize: 11,
            color: pendingRecords.length > 0 ? "#854F0B" : "#94a3b8",
            marginTop: 3,
          }}
        >
          {highestPending != null ? fmt(highestPending) : "—"}
        </div>
      </Box>
    </Box>
  );
}

// ── No Access Message (for "Received Offers" tab only) ────────────────────────

function NoAccessMessage({
  entityType,
}: {
  entityType: "load" | "truck" | "product";
}) {
  const entityLabel =
    entityType === "truck"
      ? "Truck"
      : entityType === "load"
        ? "Load"
        : "Product";

  return (
    <Box
      sx={{
        py: "48px",
        px: "24px",
        textAlign: "center",
        background: "#f8fafc",
        borderRadius: "10px",
        border: "1px solid #e2e8f0",
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: "10px",
          backgroundColor: "#fee2e2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 14px",
        }}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#dc2626"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </Box>
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          color: "#1e293b",
          marginBottom: 6,
        }}
      >
        Access Restricted
      </div>
      <div style={{ fontSize: 13, color: "#64748b", marginBottom: 2 }}>
        Only the {entityLabel.toLowerCase()} owner and administrators can view
        received offers.
      </div>
      <div style={{ fontSize: 12, color: "#94a3b8" }}>
        You can still send your own offer using the button above.
      </div>
    </Box>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
// ── Main Component ────────────────────────────────────────────────────────────

export function BitRecordsSection({
  type,
  entityId,
  onStatusChanged,
  currentUser,
  linkedEntityId,
  ownerUserId,
  ownerUser: ownerUserProp,
  initialRecords,
}: BitRecordsSectionProps) {
  // ── State for owner/admin path ────────────────────────────────────────────
  const [receivedOffers, setReceivedOffers] = useState<AnyBitRecord[]>([]);
  const [myOffers, setMyOffers] = useState<AnyBitRecord[]>([]);

  // ── State for non-owner path ─────────────────────────────────────────────
  const [myOffersDirect, setMyOffersDirect] = useState<AnyBitRecord[]>([]);

  const admin = currentUser ? isAdmin(currentUser) : false;

  // ── Derive owner ID from props (ownerUser._id takes priority) ────────────
  const resolvedOwnerIdForFilter =
    ownerUserProp?._id || ownerUserProp?.id || ownerUserId || "";

  // Admin defaults to the post owner's userId; non-admin always uses their own
  const [selectedFilterUserId, setSelectedFilterUserId] = useState<string>(
    admin ? resolvedOwnerIdForFilter : "",
  );

  const resolvedOwnerUser =
    ownerUserProp ??
    (initialRecords && !Array.isArray(initialRecords)
      ? (initialRecords.ownerUser as
          | { _id?: string; id?: string }
          | null
          | undefined)
      : null);

  const isOwner = checkIsOwner(currentUser, ownerUserId, resolvedOwnerUser);

  const canViewAll = !!(currentUser && (admin || isOwner));
  const canViewOwn = !!currentUser;

  const [activeTab, setActiveTab] = useState<TabId>(
    canViewAll ? "primary" : "secondary",
  );

  // ── Sync default filter userId if ownerUser arrives async ─────────────────
  const ownerFilterInitRef = useRef(false);
  useEffect(() => {
    if (!admin) return;
    if (ownerFilterInitRef.current) return;
    if (!resolvedOwnerIdForFilter) return;
    ownerFilterInitRef.current = true;
    setSelectedFilterUserId((prev) =>
      prev === "" ? resolvedOwnerIdForFilter : prev,
    );
  }, [admin, resolvedOwnerIdForFilter]);

  const tabInitialisedRef = useRef(false);
  useEffect(() => {
    if (tabInitialisedRef.current) return;
    if (!currentUser) return;
    tabInitialisedRef.current = true;
    setActiveTab(canViewAll ? "primary" : "secondary");
  }, [currentUser, canViewAll]);

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [myOffersLoading, setMyOffersLoading] = useState(false);
  const currentUserId = currentUser ? getUserId(currentUser) : "";

  // ── Fetch offers by type ──────────────────────────────────────────────────
  async function fetchOffersByType(params: {
    entityId: string;
    userId?: string;
    offerType: "my_offers" | "received_offers";
  }): Promise<AnyBitRecord[]> {
    const body: Record<string, unknown> = {
      type: "",
      entityId: params.entityId,
      offerType: params.offerType,
    };
    if (params.userId) {
      body.userId = params.userId;
    }
    const res = await api<AnyBitRecord[] | { bitRecords?: AnyBitRecord[] }>(
      `${BIT_RECORD_API_BASE}/list`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );
    if (Array.isArray(res)) return res;
    return Array.isArray((res as any)?.bitRecords)
      ? (res as any).bitRecords
      : [];
  }

  // ── Fetch all offers (owner/admin only) ───────────────────────────────────
  const loadAllOffers = useCallback(async () => {
    if (!entityId || !currentUserId || !canViewAll) return;
    setLoading(true);
    setError("");
    try {
      // Admin with selected user → use that ID exactly
      // Admin with no filter → omit userId (backend returns all)
      // Owner (non-admin) → always use their own ID
      const filterUserId = admin
        ? selectedFilterUserId || undefined
        : currentUserId;

      const [received, mine] = await Promise.all([
        fetchOffersByType({
          entityId,
          userId: filterUserId,
          offerType: "received_offers",
        }),
        fetchOffersByType({
          entityId,
          userId: filterUserId,
          offerType: "my_offers",
        }),
      ]);

      setReceivedOffers(received);
      setMyOffers(mine);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load offers");
    } finally {
      setLoading(false);
    }
  }, [entityId, type, currentUserId, canViewAll, admin, selectedFilterUserId]);

  // ── Fetch only current user's offers (non-owner path) ────────────────────
  const loadMyOffers = useCallback(async () => {
    if (!entityId || !currentUserId || canViewAll) return;
    setMyOffersLoading(true);
    setError("");
    try {
      const data = await fetchMyOffersForEntity({
        entityId,
        offerType: "my_offers",
        userId: currentUserId,
      });
      setMyOffersDirect(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load your offers",
      );
    } finally {
      setMyOffersLoading(false);
    }
  }, [entityId, type, currentUserId, canViewAll]);

  useEffect(() => {
    loadAllOffers();
  }, [loadAllOffers]);

  useEffect(() => {
    loadMyOffers();
  }, [loadMyOffers]);

  // ── Handle status change ──────────────────────────────────────────────────
  const handleStatusChange = async (
    record: AnyBitRecord,
    newStatus: BitRecordStatus,
  ) => {
    const id = recordId(record);
    if (!id) return;
    setUpdatingId(id);
    setError("");
    try {
      const updated = await updateBitRecordStatus({
        type,
        recordId: id,
        status: newStatus,
      });

      if (type === "load") {
        await getLoaderAll();
      } else if (type === "truck") {
        await getTruckAll();
      } else if (type === "product") {
        await getBuySellAll(); // or your product list API
      }

      if (activeTab === "primary") {
        setReceivedOffers((prev) =>
          prev.map((r) => (recordId(r) === id ? (updated as AnyBitRecord) : r)),
        );
      } else {
        if (canViewAll) {
          setMyOffers((prev) =>
            prev.map((r) =>
              recordId(r) === id ? (updated as AnyBitRecord) : r,
            ),
          );
        }
      }

      onStatusChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Handle new offer created ──────────────────────────────────────────────
  const handleCreated = (record: AnyBitRecord) => {
    if (canViewAll) {
      const recordUserId = (record as any).userId || getUserId(currentUser!);
      const currentUserIdList = getAllUserIds(currentUser!);
      const isCurrentUserOffer = currentUserIdList.some(
        (uid) => uid === recordUserId,
      );
      if (isCurrentUserOffer) {
        setMyOffers((prev) => [record, ...prev]);
      } else {
        setReceivedOffers((prev) => [record, ...prev]);
      }
    } else {
      setMyOffersDirect((prev) => [record, ...prev]);
    }
    onStatusChanged?.();
  };

  // ── Tab configuration ─────────────────────────────────────────────────────
  const tabs: { id: TabId; label: string; count: number; loading: boolean }[] =
    canViewAll
      ? [
          {
            id: "primary",
            label: "Received Offers",
            count: receivedOffers.length,
            loading,
          },
          {
            id: "secondary",
            label: "My Offers",
            count: myOffers.length,
            loading,
          },
        ]
      : [
          {
            id: "secondary",
            label: "My Offers",
            count: myOffersDirect.length,
            loading: myOffersLoading,
          },
        ];

  const visibleRecords =
    activeTab === "primary"
      ? receivedOffers
      : canViewAll
        ? myOffers
        : myOffersDirect;

  const isLoadingCurrent =
    activeTab === "primary" ? loading : canViewAll ? loading : myOffersLoading;

  const disableActions = activeTab === "secondary" || (!admin && !isOwner);

  const totalCount = canViewAll
    ? receivedOffers.length + myOffers.length
    : myOffersDirect.length;

  if (!canViewOwn) return null;

  return (
    <div>
      {currentUser && <CurrentUserBanner user={currentUser} />}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: "14px",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#1e293b" }}>
            Offer Records
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 500,
              background: "#f1f5f9",
              color: "#64748b",
              border: "1px solid #e2e8f0",
              borderRadius: 20,
              padding: "2px 9px",
            }}
          >
            {totalCount} offer{totalCount !== 1 ? "s" : ""}
          </span>
          {canViewAll && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                background: admin ? "#f5f3ff" : "#e0f2fe",
                color: admin ? "#7c3aed" : "#0369a1",
                border: `1px solid ${admin ? "#c4b5fd" : "#7dd3fc"}`,
                borderRadius: 10,
                padding: "2px 9px",
              }}
            >
              {admin ? "Admin View" : "Owner View"} · Full Access
            </span>
          )}
        </Box>

        {currentUser &&
          entityId &&
          !showForm &&
          !isOwner &&
          (admin || visibleRecords.length === 0) && (
            <Button
              variant="contained"
              disableElevation
              size="small"
              onClick={() => setShowForm(true)}
              startIcon={
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              }
              sx={{ ...primaryBtnSx, px: "14px", py: "7px" }}
            >
              Send Offer
            </Button>
          )}
      </Box>

      {canViewAll && <StatsRow records={visibleRecords} />}

      <Box
        sx={{
          display: "flex",
          gap: "2px",
          mb: "14px",
          borderBottom: "2px solid #e2e8f0",
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Box
              key={tab.id}
              component="button"
              onClick={() => setActiveTab(tab.id)}
              sx={{
                background: "none",
                border: "none",
                cursor: "pointer",
                px: "14px",
                py: "8px",
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? PRIMARY : "#64748b",
                borderBottom: isActive
                  ? `2px solid ${PRIMARY}`
                  : "2px solid transparent",
                marginBottom: "-2px",
                borderRadius: "4px 4px 0 0",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "color 0.15s, border-color 0.15s",
                "&:hover": { color: PRIMARY, background: `${PRIMARY}08` },
              }}
            >
              {tab.label}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 20,
                  padding: "1px 7px",
                  background: isActive ? `${PRIMARY}18` : "#f1f5f9",
                  color: isActive ? PRIMARY : "#94a3b8",
                  border: `1px solid ${isActive ? PRIMARY + "33" : "#e2e8f0"}`,
                  minWidth: 20,
                  textAlign: "center",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {tab.loading ? (
                  <CircularProgress size={8} sx={{ color: "inherit" }} />
                ) : (
                  tab.count
                )}
              </span>
            </Box>
          );
        })}
      </Box>

      <Collapse in={showForm} unmountOnExit>
        {currentUser && (
          <AddBidForm
            type={type}
            entityId={entityId}
            currentUser={currentUser}
            linkedEntityId={linkedEntityId}
            onCreated={handleCreated}
            onCancel={() => setShowForm(false)}
          />
        )}
      </Collapse>

      {error && (
        <Box
          sx={{
            fontSize: 12,
            color: "#A32D2D",
            background: "#FCEBEB",
            border: "1px solid #F09595",
            borderRadius: "6px",
            p: "6px 10px",
            mb: "10px",
          }}
        >
          {error}
        </Box>
      )}

      {activeTab === "primary" && !canViewAll ? (
        <NoAccessMessage entityType={type === "product" ? "product" : type} />
      ) : isLoadingCurrent ? (
        <Box
          sx={{
            py: "36px",
            textAlign: "center",
            color: "#94a3b8",
            fontSize: 13,
            background: "#f8fafc",
            borderRadius: "10px",
            border: "1px dashed #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <CircularProgress size={14} sx={{ color: PRIMARY }} />
          Loading offers…
        </Box>
      ) : (
        <BidTable
          records={visibleRecords}
          contextType={type}
          updatingId={updatingId}
          onStatusChange={handleStatusChange}
          disableActions={disableActions}
        />
      )}
    </div>
  );
}
