"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import InventoryOutlinedIcon from "@mui/icons-material/InventoryOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import ShoppingCartOutlinedIcon from "@mui/icons-material/ShoppingCartOutlined";
import SellOutlinedIcon from "@mui/icons-material/SellOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import AccountBalanceWalletOutlinedIcon from "@mui/icons-material/AccountBalanceWalletOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import TrendingDownOutlinedIcon from "@mui/icons-material/TrendingDownOutlined";
import BusinessOutlinedIcon from "@mui/icons-material/BusinessOutlined";
import {
  getUser,
  getRoles,
  getRowId,
  type User,
  type PermissionAccess,
  type Role,
  isPermissionGroup,
} from "@/model/api";
import { getTruckAllWithPagination, type Truck } from "@/model/services/truck";
import { getLoadAllWithPagination, type Load } from "@/model/services/load";
import {
  getBuySellList,
  type BuySellProduct,
  getBuySellRowId,
} from "@/model/services/buysellapi";
import {
  getIncomeExpenseAll,
  type IncomeExpense,
} from "@/model/services/incomeExpense";
import { api, resolveApiBase } from "@/model/services/common";
import { routes } from "@/lib/routes";
import { useAppNavigate, useInvalidIdRedirect } from "@/lib/navigation";
import {
  BackButton,
  DetailField,
  ViewDetailGrid,
  ViewPageSection,
} from "@/components/common";
import { PageContainer, PageHeader, Spinner } from "@/components/ui";
import { alpha, useTheme } from "@mui/material/styles";
import ViewAllFooter from "@/components/common/table/Viewallfooter";

// ── Constants ─────────────────────────────────────────────────────────────────

const PREVIEW_LIMIT = 10;

// ── Types ─────────────────────────────────────────────────────────────────────

type BitRecord = {
  _id: string;
  id?: string;
  bit: number;
  status: "accept" | "reject" | "pending";
  userId: string;
  userName?: string;
  userEmail?: string;
  type?: "product" | "load" | "truck";
  offerType?: string;
  product_owner?: string | null;
  product_id?: string | null;
  load_id?: string | null;
  truck_id?: string | null;
  product_info?: BuySellProduct | null;
  load_info?: Load | null;
  truck_info?: Truck | null;
  product_status?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function getFileUrl(path?: string | null): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${resolveApiBase()}${path}`;
}

function getRoleInfo(user: User): { name: string; id: string } {
  const roleId = (user as any).roleId;
  const role = user.role;
  if (roleId && typeof roleId === "object")
    return { name: roleId.name || "—", id: roleId.id || roleId._id || "" };
  if (role && typeof role === "object") {
    const r = role as { name?: string; id?: string; _id?: string };
    return { name: r.name || "—", id: r.id || r._id || "" };
  }
  return { name: "—", id: "" };
}

const normalizeAccess = (a?: PermissionAccess): PermissionAccess => ({
  create: Boolean(a?.create),
  view: Boolean(a?.view),
  edit: Boolean(a?.edit),
  delete: Boolean(a?.delete),
});

async function getUserBitRecords(userId: string): Promise<BitRecord[]> {
  try {
    const res = await api<{ success: boolean; bitRecords: BitRecord[] }>(
      `/api/bit-records/user/${userId}`,
    );
    return res?.bitRecords ?? [];
  } catch {
    try {
      const res = await api<{ success: boolean; bitRecords: BitRecord[] }>(
        `/api/bit-records?userId=${userId}`,
      );
      return res?.bitRecords ?? [];
    } catch {
      return [];
    }
  }
}

// ── Status chip ───────────────────────────────────────────────────────────────

function StatusChip({ status }: { status?: string }) {
  const s = (status || "").toLowerCase();
  const map: Record<string, { label: string; bg: string; color: string }> = {
    active: { label: "Active", bg: "#DCFCE7", color: "#15803D" },
    available: { label: "Available", bg: "#DCFCE7", color: "#15803D" },
    pending: { label: "Pending", bg: "#FEF9C3", color: "#854D0E" },
    assigned: { label: "Assigned", bg: "#DBEAFE", color: "#1D4ED8" },
    accepted: { label: "Accepted", bg: "#D1FAE5", color: "#065F46" },
    accept: { label: "Accepted", bg: "#D1FAE5", color: "#065F46" },
    delivered: { label: "Delivered", bg: "#F0FDF4", color: "#166534" },
    cancelled: { label: "Cancelled", bg: "#FEE2E2", color: "#B91C1C" },
    rejected: { label: "Rejected", bg: "#FEE2E2", color: "#B91C1C" },
    reject: { label: "Rejected", bg: "#FEE2E2", color: "#B91C1C" },
    inactive: { label: "Inactive", bg: "#F3F4F6", color: "#6B7280" },
  };
  const cfg = map[s] || {
    label: status || "—",
    bg: "#F3F4F6",
    color: "#6B7280",
  };
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{
        height: 20,
        fontSize: 11,
        fontWeight: 600,
        borderRadius: "5px",
        bgcolor: cfg.bg,
        color: cfg.color,
        border: "none",
        "& .MuiChip-label": { px: 1 },
      }}
    />
  );
}

// ── Shared table styles ───────────────────────────────────────────────────────

const TH_SX = {
  fontWeight: 500,
  fontSize: 11,
  textTransform: "uppercase" as const,
  letterSpacing: "0.055em",
  color: "text.secondary",
  py: 1,
  px: 1.5,
  borderBottom: "0.5px solid",
  borderColor: "divider",
  bgcolor: "action.hover",
};

const TD_SX = {
  py: 1,
  px: 1.5,
  fontSize: 13,
  borderBottom: "0.5px solid",
  borderColor: "divider",
};

// ── Small reusable pieces ─────────────────────────────────────────────────────

function ViewBtn({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  const theme = useTheme();
  return (
    <Tooltip title="View" arrow>
      <Button
        size="small"
        variant="outlined"
        startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 12 }} />}
        onClick={onClick}
        sx={{
          borderRadius: "6px",
          textTransform: "none",
          fontWeight: 500,
          fontSize: 11,
          px: 1.25,
          py: 0.35,
          borderColor: "divider",
          color: "text.secondary",
          minWidth: 0,
          "&:hover": {
            borderColor: theme.palette.primary.main,
            color: theme.palette.primary.main,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
          },
        }}
      >
        View
      </Button>
    </Tooltip>
  );
}

function EmptyState({
  icon,
  message,
}: {
  icon: React.ReactNode;
  message: string;
}) {
  return (
    <Box
      sx={{
        py: 5,
        textAlign: "center",
        border: "1px dashed",
        borderColor: "divider",
        borderRadius: "10px",
      }}
    >
      <Box
        sx={{
          color: "text.disabled",
          mb: 1,
          display: "flex",
          justifyContent: "center",
        }}
      >
        {icon}
      </Box>
      <Typography variant="body2" color="text.secondary" fontSize={13}>
        {message}
      </Typography>
    </Box>
  );
}

function LoadingState() {
  return <Spinner label="Loading…" />;
}

function rowHoverSx() {
  return {
    cursor: "pointer",
    "&:last-child td": { border: 0 },
    "&:hover td": { bgcolor: (t: { palette: { primary: { main: string } } }) => alpha(t.palette.primary.main, 0.04) },
    transition: "background 0.1s ease",
  };
}

// ── Stat pill (header strip) ──────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.5,
        py: "5px",
        borderRadius: "8px",
        bgcolor: "action.hover",
        border: "0.5px solid",
        borderColor: "divider",
      }}
    >
      <Typography
        variant="body2"
        sx={{ color: "text.secondary", fontSize: 12 }}
      >
        {label}:
      </Typography>
      <Typography
        variant="body2"
        fontWeight={500}
        sx={{ color: "text.primary", fontSize: 12 }}
      >
        {value}
      </Typography>
    </Box>
  );
}

// ── Table wrapper ─────────────────────────────────────────────────────────────

function DataTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={{
        borderRadius: "10px",
        boxShadow: "none",
        border: "0.5px solid",
        borderColor: "divider",
      }}
    >
      <Table size="small">
        <TableHead>
          <TableRow>
            {headers.map((h, i) => (
              <TableCell
                key={i}
                align={i === headers.length - 1 && h === "" ? "right" : "left"}
                sx={TH_SX}
              >
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>{children}</TableBody>
      </Table>
    </TableContainer>
  );
}

// ── Trucks Tab ────────────────────────────────────────────────────────────────

function TrucksTab({
  trucks,
  loading,
  onViewAll,
  onView,
}: {
  trucks: Truck[];
  loading: boolean;
  onViewAll: () => void;
  onView: (id: string) => void;
}) {
  if (loading) return <LoadingState />;
  if (!trucks.length)
    return (
      <EmptyState
        icon={<LocalShippingOutlinedIcon sx={{ fontSize: 32 }} />}
        message="No trucks found for this user."
      />
    );

  return (
    <>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <ViewAllFooter
          total={trucks.length}
          label="trucks"
          shownCount={PREVIEW_LIMIT}
          onViewAll={onViewAll}
        />

        <DataTable
          headers={[
            "Registration",
            "Type",
            "Capacity",
            "Location",
            "Status",
            "",
          ]}
        >
          {trucks.slice(0, PREVIEW_LIMIT).map((truck) => {
            const tid = truck.id || truck._id;
            const vType =
              typeof truck.vehicleType === "object" && truck.vehicleType
                ? (truck.vehicleType as any).name
                : truck.truckType || String(truck.vehicleType || "—");
            return (
              <TableRow key={tid} hover sx={rowHoverSx()} onClick={() => onView(tid)}>
                <TableCell sx={TD_SX}>
                  <Typography variant="body2" fontWeight={600} fontSize={13}>
                    {truck.registrationNumber || truck.vehicleNumber || "—"}
                  </Typography>
                </TableCell>
                <TableCell sx={TD_SX}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontSize={13}
                  >
                    {vType}
                  </Typography>
                </TableCell>
                <TableCell sx={TD_SX}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontSize={13}
                  >
                    {truck.capacity || truck.vehicleCapacity || "—"}
                  </Typography>
                </TableCell>
                <TableCell sx={TD_SX}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    noWrap
                    sx={{ maxWidth: 160, fontSize: 13 }}
                  >
                    {truck.currentLocation || "—"}
                  </Typography>
                </TableCell>
                <TableCell sx={TD_SX}>
                  <StatusChip status={truck.status} />
                </TableCell>
                <TableCell sx={{ ...TD_SX, textAlign: "right" }}>
                  <ViewBtn
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(tid);
                    }}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </DataTable>
      </Box>
    </>
  );
}

// ── Loads Tab ─────────────────────────────────────────────────────────────────

function LoadsTab({
  loads,
  loading,
  onViewAll,
  onView,
}: {
  loads: Load[];
  loading: boolean;
  onViewAll: () => void;
  onView: (id: string) => void;
}) {
  if (loading) return <LoadingState />;
  if (!loads.length)
    return (
      <EmptyState
        icon={<InventoryOutlinedIcon sx={{ fontSize: 32 }} />}
        message="No loads found for this user."
      />
    );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <ViewAllFooter
        total={loads.length}
        label="loads"
        shownCount={PREVIEW_LIMIT}
        onViewAll={onViewAll}
      />

      <DataTable
        headers={["#", "Route", "Material", "Vehicle", "Bid", "Status", ""]}
      >
        {loads.slice(0, PREVIEW_LIMIT).map((load) => {
          const lid = load.id || load._id;
          return (
            <TableRow key={lid} hover sx={rowHoverSx()} onClick={() => onView(lid)}>
              <TableCell sx={TD_SX}>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{ color: "primary.main", fontSize: 12 }}
                >
                  {load.loadNumber || "—"}
                </Typography>
              </TableCell>
              <TableCell sx={TD_SX}>
                <Typography
                  variant="body2"
                  fontWeight={500}
                  sx={{ fontSize: 12.5, maxWidth: 200 }}
                  noWrap
                >
                  {load.pickupLocation?.address || load.origin || "—"}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  sx={{ display: "block", maxWidth: 200 }}
                >
                  → {load.dropLocation?.address || load.destination || "—"}
                </Typography>
              </TableCell>
              <TableCell sx={TD_SX}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontSize={13}
                >
                  {load.material || "—"}
                </Typography>
              </TableCell>
              <TableCell sx={TD_SX}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontSize={13}
                >
                  {(load as any).vehicle_name || load.vehicleType || "—"}
                </Typography>
              </TableCell>
              <TableCell sx={TD_SX}>
                <Typography variant="body2" fontWeight={600} fontSize={13}>
                  {load.bit ? `₹${load.bit.toLocaleString("en-IN")}` : "—"}
                </Typography>
              </TableCell>
              <TableCell sx={TD_SX}>
                <StatusChip status={load.status} />
              </TableCell>
              <TableCell sx={{ ...TD_SX, textAlign: "right" }}>
                <ViewBtn
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(lid);
                  }}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </DataTable>
    </Box>
  );
}

function SellTab({
  products,
  loading,
  onViewAll,
  onView,
}: {
  products: BuySellProduct[];
  loading: boolean;
  onViewAll: () => void;
  onView: (id: string) => void;
}) {
  const theme = useTheme();
  if (loading) return <LoadingState />;
  if (!products.length)
    return (
      <EmptyState
        icon={<SellOutlinedIcon sx={{ fontSize: 32 }} />}
        message="This user hasn't listed any products for sale."
      />
    );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <ViewAllFooter
        total={products.length}
        label="listings"
        shownCount={PREVIEW_LIMIT}
        onViewAll={onViewAll}
      />

      <DataTable
        headers={[
          "Product",
          "Category",
          "Listed price",
          "Highest bid",
          "Bids",
          "Status",
          "",
        ]}
      >
        {products.slice(0, PREVIEW_LIMIT).map((p) => {
          const pid = getBuySellRowId(p);
          const cat =
            typeof p.category_id === "object" && p.category_id
              ? p.category_id.category_name
              : "—";
          const sub =
            typeof p.subcategory_id === "object" && p.subcategory_id
              ? p.subcategory_id.sub_category_name
              : "—";
          const highestBid = (p as any).highest_bid;
          const bidCount =
            (p as any).bid_count ?? (p as any).bit_records?.length ?? 0;
          const thumb = p.images?.[0] ? getFileUrl(p.images[0]) : null;
          return (
            <TableRow key={pid} hover sx={rowHoverSx()} onClick={() => onView(pid)}>
              <TableCell sx={TD_SX}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                  {thumb ? (
                    <Box
                      component="img"
                      src={thumb}
                      alt=""
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: "6px",
                        objectFit: "cover",
                        flexShrink: 0,
                        border: "0.5px solid",
                        borderColor: "divider",
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: "6px",
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <StorefrontOutlinedIcon
                        sx={{ fontSize: 15, color: "primary.main" }}
                      />
                    </Box>
                  )}
                  <Typography
                    variant="body2"
                    fontWeight={500}
                    noWrap
                    sx={{ maxWidth: 130, fontSize: 13 }}
                  >
                    {sub}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell sx={TD_SX}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontSize={13}
                >
                  {cat}
                </Typography>
              </TableCell>
              <TableCell sx={TD_SX}>
                <Typography variant="body2" fontWeight={600} fontSize={13}>
                  ₹{p.price?.toLocaleString("en-IN") ?? "—"}
                </Typography>
              </TableCell>
              <TableCell sx={TD_SX}>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  fontSize={13}
                  sx={{ color: highestBid ? "#15803D" : "text.disabled" }}
                >
                  {highestBid ? `₹${highestBid.toLocaleString("en-IN")}` : "—"}
                </Typography>
              </TableCell>
              <TableCell sx={TD_SX}>
                <Chip
                  label={bidCount}
                  size="small"
                  sx={{
                    height: 19,
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: "4px",
                    bgcolor: bidCount > 0 ? alpha(theme.palette.primary.main, 0.08) : "action.hover",
                    color: bidCount > 0 ? "primary.main" : "text.secondary",
                    "& .MuiChip-label": { px: 0.75 },
                  }}
                />
              </TableCell>
              <TableCell sx={TD_SX}>
                <StatusChip status={p.status} />
              </TableCell>
              <TableCell sx={{ ...TD_SX, textAlign: "right" }}>
                <ViewBtn
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(pid);
                  }}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </DataTable>
    </Box>
  );
}

// ── Buy Tab ───────────────────────────────────────────────────────────────────

function BuyTab({
  bitRecords,
  loading,
  onViewAll,
  onView,
}: {
  bitRecords: BitRecord[];
  loading: boolean;
  onViewAll: () => void;
  onView: (id: string) => void;
}) {
  if (loading) return <LoadingState />;
  if (!bitRecords.length)
    return (
      <EmptyState
        icon={<ShoppingCartOutlinedIcon sx={{ fontSize: 32 }} />}
        message="No accepted purchases found for this user."
      />
    );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <ViewAllFooter
        total={bitRecords.length}
        label="purchases"
        shownCount={PREVIEW_LIMIT}
        onViewAll={onViewAll}
      />

      <DataTable
        headers={[
          "Product",
          "Seller",
          "Bid amount",
          "Listed price",
          "Status",
          "Date",
          "",
        ]}
      >
        {bitRecords.slice(0, PREVIEW_LIMIT).map((rec) => {
          const product = rec.product_info;
          const pid = rec.product_id || product?.id || product?._id || "";
          const sub = product
            ? typeof product.subcategory_id === "object" &&
              product.subcategory_id
              ? product.subcategory_id.sub_category_name
              : "Product"
            : "Product";
          const thumb = product?.images?.[0]
            ? getFileUrl(product.images[0])
            : null;
          const seller = product?.created_by || "—";
          const bidDate = rec.createdAt
            ? new Date(rec.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "—";
          return (
            <TableRow
              key={rec._id}
              hover
              sx={{ ...rowHoverSx(), cursor: pid ? "pointer" : "default" }}
              onClick={() => pid && onView(pid)}
            >
              <TableCell sx={TD_SX}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                  {thumb ? (
                    <Box
                      component="img"
                      src={thumb}
                      alt=""
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: "6px",
                        objectFit: "cover",
                        flexShrink: 0,
                        border: "0.5px solid",
                        borderColor: "divider",
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 30,
                        height: 30,
                        borderRadius: "6px",
                        bgcolor: "#F0FDF4",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <ShoppingCartOutlinedIcon
                        sx={{ fontSize: 14, color: "#22C55E" }}
                      />
                    </Box>
                  )}
                  <Box>
                    <Typography
                      variant="body2"
                      fontWeight={500}
                      noWrap
                      sx={{ maxWidth: 130, fontSize: 13 }}
                    >
                      {sub}
                    </Typography>
                    {product?.address && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        noWrap
                        sx={{ display: "block", maxWidth: 130 }}
                      >
                        {product.address}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </TableCell>
              <TableCell sx={TD_SX}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontSize={13}
                >
                  {seller}
                </Typography>
              </TableCell>
              <TableCell sx={TD_SX}>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  fontSize={13}
                  sx={{ color: "#15803D" }}
                >
                  ₹{rec.bit?.toLocaleString("en-IN") ?? "—"}
                </Typography>
              </TableCell>
              <TableCell sx={TD_SX}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontSize={13}
                >
                  {product?.price
                    ? `₹${product.price.toLocaleString("en-IN")}`
                    : "—"}
                </Typography>
              </TableCell>
              <TableCell sx={TD_SX}>
                <StatusChip status={rec.status} />
              </TableCell>
              <TableCell sx={TD_SX}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  fontSize={12}
                >
                  {bidDate}
                </Typography>
              </TableCell>
              <TableCell sx={{ ...TD_SX, textAlign: "right" }}>
                {pid && (
                  <ViewBtn
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(pid);
                    }}
                  />
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </DataTable>
    </Box>
  );
}

// ── Income & Expense Tab ──────────────────────────────────────────────────────

function IncomeExpenseTab({
  records,
  loading,
  onViewAll,
}: {
  records: IncomeExpense[];
  loading: boolean;
  onViewAll: () => void;
}) {
  if (loading) return <LoadingState />;
  if (!records.length)
    return (
      <EmptyState
        icon={<AccountBalanceWalletOutlinedIcon sx={{ fontSize: 32 }} />}
        message="No income or expense records found for this user."
      />
    );
  const incomeRecords = records.filter((r) => r.type === "income");
  const expenseRecords = records.filter((r) => r.type === "expense");
  const totalIncome = records
    .filter((r) => r.type === "income")
    .reduce((s, r) => s + (r.amount ?? 0), 0);
  const totalExpense = records
    .filter((r) => r.type === "expense")
    .reduce((s, r) => s + (r.amount ?? 0), 0);
  const net = totalIncome - totalExpense;

  const summaryItems = [
    {},
    // {
    //   label: "Total income",
    //   amount: totalIncome,
    //   color: "#15803D",
    //   bg: "#F0FDF4",
    //   border: "#BBF7D0",
    //   iconColor: "#3B6D11",
    //   icon: <TrendingUpOutlinedIcon sx={{ fontSize: 15 }} />,
    // },
    // {
    //   label: "Total expense",
    //   amount: totalExpense,
    //   color: "#B91C1C",
    //   bg: "#FFF1F2",
    //   border: "#FECDD3",
    //   iconColor: "#A32D2D",
    //   icon: <TrendingDownOutlinedIcon sx={{ fontSize: 15 }} />,
    // },
    // {
    //   label: "Net balance",
    //   amount: net,
    //   color: net >= 0 ? "#1D4ED8" : "#B91C1C",
    //   bg: net >= 0 ? "#EFF6FF" : "#FFF1F2",
    //   border: net >= 0 ? "#BFDBFE" : "#FECDD3",
    //   iconColor: net >= 0 ? "#185FA5" : "#A32D2D",
    //   icon: <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 15 }} />,
    // },
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Summary strip */}
      <ViewAllFooter
        total={records.length}
        label="records"
        shownCount={PREVIEW_LIMIT}
        onViewAll={onViewAll}
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 1.25,
        }}
      >
        {/* {summaryItems.map(
          ({ label, amount, color, bg, border, iconColor, icon }) => (
            <Box
              key={label}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                px: 1.75,
                py: 1.25,
                borderRadius: "10px",
                bgcolor: bg,
                border: "0.5px solid",
                borderColor: border,
              }}
            >
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "7px",
                  bgcolor: `${iconColor}18`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: iconColor,
                  flexShrink: 0,
                }}
              >
                {icon}
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontSize: 10,
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color,
                    display: "block",
                    mb: 0.25,
                  }}
                >
                  {label}
                </Typography>
                <Typography
                  fontWeight={600}
                  sx={{ color, fontSize: 14.5, lineHeight: 1.2 }}
                >
                  {amount < 0 ? "-" : ""}₹
                  {Math.abs(amount).toLocaleString("en-IN")}
                </Typography>
              </Box>
            </Box>
          ),
        )} */}
      </Box>

      {/* Table */}
      <Typography
        variant="h6"
        sx={{ mt: 3, mb: 1, color: "#15803D", fontWeight: 600 }}
      >
        Income
      </Typography>

      <DataTable headers={["Category", "Amount", "Remarks", "Status", "Date"]}>
        {incomeRecords.slice(0, PREVIEW_LIMIT).map((rec) => {
          const rid = rec.id || rec._id;

          const catName =
            rec.category?.categoryName ||
            (rec.category as any)?.category_name ||
            rec.category_id ||
            "—";

          return (
            <TableRow key={rid}>
              <TableCell sx={TD_SX}>{catName}</TableCell>

              <TableCell sx={TD_SX}>
                <Typography color="#15803D" fontWeight={600}>
                  ₹{rec.amount}
                </Typography>
              </TableCell>

              <TableCell sx={TD_SX}>{rec.remarks || "—"}</TableCell>

              <TableCell sx={TD_SX}>
                <StatusChip status={rec.status} />
              </TableCell>

              {/* <TableCell sx={TD_SX}>
          {new Date(rec.createdAt).toLocaleDateString("en-IN")}
        </TableCell> */}
            </TableRow>
          );
        })}
      </DataTable>
      <Typography
        variant="h6"
        sx={{ mt: 4, mb: 1, color: "#B91C1C", fontWeight: 600 }}
      >
        Expense
      </Typography>

      <DataTable headers={["Category", "Amount", "Remarks", "Status", "Date"]}>
        {expenseRecords.slice(0, PREVIEW_LIMIT).map((rec) => {
          const rid = rec.id || rec._id;

          const catName =
            rec.category?.categoryName ||
            (rec.category as any)?.category_name ||
            rec.category_id ||
            "—";

          return (
            <TableRow key={rid}>
              <TableCell sx={TD_SX}>{catName}</TableCell>

              <TableCell sx={TD_SX}>
                <Typography color="#B91C1C" fontWeight={600}>
                  ₹{rec.amount}
                </Typography>
              </TableCell>

              <TableCell sx={TD_SX}>{rec.remarks || "—"}</TableCell>

              <TableCell sx={TD_SX}>
                <StatusChip status={rec.status} />
              </TableCell>

              {/* <TableCell sx={TD_SX}>
          {new Date(rec.createdAt).toLocaleDateString("en-IN")}
        </TableCell> */}
            </TableRow>
          );
        })}
      </DataTable>
    </Box>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UserViewPage() {
  const router = useRouter();
  const theme = useTheme();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const hasValidId = useInvalidIdRedirect(id, routes.user.list());
  const navigate = useAppNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [roleDetail, setRoleDetail] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loads, setLoads] = useState<Load[]>([]);
  const [sellProducts, setSellProducts] = useState<BuySellProduct[]>([]);
  const [buyRecords, setBuyRecords] = useState<BitRecord[]>([]);
  const [incomeExpenseRecords, setIncomeExpenseRecords] = useState<
    IncomeExpense[]
  >([]);

  const [trucksLoading, setTrucksLoading] = useState(false);
  const [loadsLoading, setLoadsLoading] = useState(false);
  const [sellLoading, setSellLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false);
  const [incomeExpenseLoading, setIncomeExpenseLoading] = useState(false);

  const [activeTab, setActiveTab] = useState(0);
  const [mongoId, setMongoId] = useState("");
  const [uuid, setUuid] = useState("");

  useEffect(() => {
    if (!id) return;
    getUser(id)
      .then(async (u) => {
        setUser(u);
        const mId = u._id ?? "";
        const uId = getRowId(u);
        setMongoId(mId);
        setUuid(uId);

        // Role
        const { id: rId } = getRoleInfo(u);
        if (rId) {
          try {
            const roles = await getRoles();
            const matched = roles.find(
              (r) => getRowId(r) === rId || r._id === rId,
            );
            setRoleDetail(matched || null);
          } catch (_) {}
        }

        // Trucks
        setTrucksLoading(true);
        getTruckAllWithPagination({ userId: mId, limit: 100 })
          .then(async (res) => {
            let list = res.trucks ?? [];
            if (!list.length && uId && uId !== mId) {
              const r2 = await getTruckAllWithPagination({
                userId: uId,
                limit: 100,
              });
              list = r2.trucks ?? [];
            }
            setTrucks(list);
          })
          .catch(() => {})
          .finally(() => setTrucksLoading(false));

        // Loads
        setLoadsLoading(true);
        getLoadAllWithPagination({ userId: mId, limit: 100 })
          .then(async (res) => {
            let list = res.loads ?? [];
            if (!list.length && uId && uId !== mId) {
              const r2 = await getLoadAllWithPagination({
                userId: uId,
                limit: 100,
              });
              list = r2.loads ?? [];
            }
            setLoads(list);
          })
          .catch(() => {})
          .finally(() => setLoadsLoading(false));

        // Sell
        setSellLoading(true);
        getBuySellList({})
          .then((all: any) => {
            setSellProducts(
              (all || []).filter(
                (p: { userid: string | undefined }) =>
                  p.userid === mId || p.userid === uId,
              ),
            );
          })
          .catch(() => {})
          .finally(() => setSellLoading(false));

        // Buy
        setBuyLoading(true);
        getUserBitRecords(mId)
          .then(async (records) => {
            if (!records.length && uId && uId !== mId) {
              records = await getUserBitRecords(uId);
            }
            const bought = records.filter(
              (r) =>
                (r.userId === mId || r.userId === uId) &&
                r.status === "accept" &&
                (r.type === "product" || r.product_id) &&
                !r.load_id &&
                !r.truck_id,
            );
            setBuyRecords(bought);
          })
          .catch(() => {})
          .finally(() => setBuyLoading(false));

        // Income & Expense
        // Income & Expense
        setIncomeExpenseLoading(true);
        getIncomeExpenseAll()
          .then((all) => {
            const filtered = all.filter(
              (rec: any) =>
                rec.userId === mId ||
                rec.userId === uId ||
                rec.user_id === mId ||
                rec.user_id === uId ||
                rec.user === mId ||
                rec.user === uId,
            );
            setIncomeExpenseRecords(filtered);
          })
          .catch(() => {})
          .finally(() => setIncomeExpenseLoading(false));
        console.log("Selected User Mongo ID:", mId);
        console.log("Selected User UUID:", uId);
        // console.log("Income Expense:", a);
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load user"),
      )

      .finally(() => setLoading(false));
  }, [id]);

  // View all helpers
  const userId = mongoId || uuid;
  const encodedName = encodeURIComponent(user?.name ?? "");
  const goToTrucks = () =>
    router.push(
      `${routes.truck?.list?.() ?? "/trucks"}?userId=${userId}&userName=${encodedName}`,
    );
  const goToLoads = () =>
    router.push(
      `${routes.load?.list?.() ?? "/loads"}?userId=${userId}&userName=${encodedName}`,
    );
  const goToBuySell = () =>
    router.push(
      `${routes.buysell?.list?.() ?? "/buy-sell"}?userId=${userId}&userName=${encodedName}`,
    );
  const goToIncomeExpense = () =>
    router.push(
      `${routes.incomeExpense?.list?.() ?? "/income-expense"}?userId=${userId}&userName=${encodedName}`,
    );

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (!hasValidId) {
    return null;
  }

  if (loading)
    return (
      <PageContainer>
        <Spinner label="Loading user…" fullHeight />
      </PageContainer>
    );

  if (!user)
    return (
      <PageContainer maxWidth={800}>
        <Alert severity="error" sx={{ mb: 2.5 }}>
          {error || "User not found."}
        </Alert>
        <BackButton fallback={routes.user.list()} label="Back to list" />
      </PageContainer>
    );

  // ── Derived values ──────────────────────────────────────────────────────────

  const status = (user as any).status || "active";
  const isActive = status === "active";
  const avatarSrc = getFileUrl(user.profileImage);
  const { name: roleName, id: roleId } = getRoleInfo(user);
  const permItems = isPermissionGroup(roleDetail?.permissions)
    ? roleDetail!.permissions.permissions // PermissionItem[]
    : [];
  const totalPerms = permItems.length;
  const activePerms = permItems.filter((p) => {
    const a = normalizeAccess(p.access);
    return a.create || a.view || a.edit || a.delete;
  }).length;

  // Spinner dot for loading tab counts
  const SpinDot = () => (
    <Box
      sx={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        border: `1.5px solid ${theme.palette.primary.main}`,
        borderTopColor: "transparent",
        animation: "spin 0.7s linear infinite",
        "@keyframes spin": { to: { transform: "rotate(360deg)" } },
      }}
    />
  );

  const tabItems = [
    {
      label: "Trucks",
      icon: <LocalShippingOutlinedIcon sx={{ fontSize: 15 }} />,
      count: trucks.length,
      loading: trucksLoading,
    },
    {
      label: "Loads",
      icon: <InventoryOutlinedIcon sx={{ fontSize: 15 }} />,
      count: loads.length,
      loading: loadsLoading,
    },
    {
      label: "Sell",
      icon: <SellOutlinedIcon sx={{ fontSize: 15 }} />,
      count: sellProducts.length,
      loading: sellLoading,
    },
    {
      label: "Buy",
      icon: <ShoppingCartOutlinedIcon sx={{ fontSize: 15 }} />,
      count: buyRecords.length,
      loading: buyLoading,
    },
    {
      label: "Transactions",
      icon: <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 15 }} />,
      count: incomeExpenseRecords.length,
      loading: incomeExpenseLoading,
    },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <PageContainer>
      <PageHeader
        title={user.name || "User"}
        subtitle={[user.company_name, user.city, user.state].filter(Boolean).join(" · ") || "User profile and activity"}
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Users", href: routes.user.list() },
          { label: user.name || "View" },
        ]}
        backButton={<BackButton fallback={routes.user.list()} />}
        action={
          <Button
            variant="contained"
            size="small"
            startIcon={<EditOutlinedIcon sx={{ fontSize: 14 }} />}
            onClick={() => router.push(routes.user.edit(getRowId(user)))}
          >
            Edit user
          </Button>
        }
      />

      <ViewPageSection title="Profile Overview" subtitle="Account status and quick stats">
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, flexWrap: "wrap", mb: 2.5 }}>
          <Box sx={{ position: "relative", flexShrink: 0 }}>
            <Avatar
              src={avatarSrc || undefined}
              alt={user.name || "User"}
              sx={{
                width: 56,
                height: 56,
                fontSize: 20,
                fontWeight: 600,
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: "primary.main",
              }}
            >
              {!avatarSrc && (user.name?.[0]?.toUpperCase() || "U")}
            </Avatar>
            <Box
              sx={{
                position: "absolute",
                bottom: 2,
                right: 2,
                width: 11,
                height: 11,
                borderRadius: "50%",
                border: "2px solid",
                borderColor: "background.paper",
                bgcolor: isActive ? "#22C55E" : "#9CA3AF",
              }}
            />
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
            <Chip
              label={isActive ? "Active" : "Inactive"}
              size="small"
              sx={{
                height: 22,
                fontWeight: 600,
                bgcolor: isActive ? "#DCFCE7" : "#F3F4F6",
                color: isActive ? "#15803D" : "#6B7280",
              }}
            />
            {roleName !== "—" && (
              <Chip
                label={roleName}
                size="small"
                sx={{
                  height: 22,
                  fontWeight: 600,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  color: "primary.main",
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                }}
              />
            )}
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {[
            { label: "Company", value: user.company_name || "—" },
            {
              label: "Location",
              value: [user.city, user.state, user.country].filter(Boolean).join(", ") || "—",
            },
            { label: "Trucks", value: trucksLoading ? "…" : String(trucks.length) },
            { label: "Loads", value: loadsLoading ? "…" : String(loads.length) },
            { label: "Selling", value: sellLoading ? "…" : String(sellProducts.length) },
            { label: "Bought", value: buyLoading ? "…" : String(buyRecords.length) },
            {
              label: "Finance",
              value: incomeExpenseLoading ? "…" : String(incomeExpenseRecords.length),
            },
          ].map(({ label, value }) => (
            <StatPill key={label} label={label} value={value} />
          ))}
        </Box>
      </ViewPageSection>

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2.5, borderRadius: "10px" }}>
          {error}
        </Alert>
      )}

      <ViewPageSection title="Contact & Location" subtitle="Profile and address details">
        <ViewDetailGrid columns={{ xs: 1, sm: 2, md: 3 }}>
          <DetailField label="Mobile" value={user.mobile} icon={<PhoneOutlinedIcon fontSize="inherit" />} />
          <DetailField label="Company" value={user.company_name} icon={<BusinessOutlinedIcon fontSize="inherit" />} />
          <DetailField label="City" value={user.city} icon={<LocationOnOutlinedIcon fontSize="inherit" />} />
          <DetailField label="State" value={user.state} />
          <DetailField label="Country" value={user.country} />
        </ViewDetailGrid>
      </ViewPageSection>

      <ViewPageSection title="Role & Access" subtitle="Assigned role and permission summary">
        <ViewDetailGrid columns={{ xs: 1, sm: 2, md: 3 }}>
          <DetailField
            label="Role"
            value={
              roleName !== "—" && roleId ? (
                <Chip
                  label={roleName}
                  size="small"
                  deleteIcon={<OpenInNewOutlinedIcon sx={{ fontSize: "12px !important" }} />}
                  onDelete={() => router.push(routes.role.view(roleId))}
                  onClick={() => router.push(routes.role.view(roleId))}
                  sx={{
                    height: 24,
                    fontWeight: 600,
                    cursor: "pointer",
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: "primary.main",
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    "& .MuiChip-deleteIcon": { color: "primary.main", mr: 0.4 },
                  }}
                />
              ) : (
                roleName
              )
            }
            icon={<ShieldOutlinedIcon fontSize="inherit" />}
          />
          {roleDetail ? (
            <>
              <DetailField label="Total Permissions" value={String(totalPerms)} />
              <DetailField label="Active Scopes" value={String(activePerms)} />
            </>
          ) : null}
        </ViewDetailGrid>
      </ViewPageSection>

      <ViewPageSection title="User Activity" subtitle="Trucks, loads, marketplace, and finance records">
        <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              minHeight: 34,
              mb: 2,
              "& .MuiTabs-indicator": {
                height: 2,
                borderRadius: "2px 2px 0 0",
                bgcolor: "primary.main",
              },
              "& .MuiTab-root": {
                minHeight: 34,
                textTransform: "none",
                fontWeight: 500,
                fontSize: 13,
                px: 1.5,
                py: 0,
                color: "text.secondary",
                "&.Mui-selected": { color: "primary.main" },
              },
            }}
          >
            {tabItems.map((t, i) => (
              <Tab
                key={t.label}
                label={
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
                  >
                    {t.icon}
                    {t.label}
                    {t.loading ? (
                      <SpinDot />
                    ) : (
                      <Chip
                        label={t.count}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: 10,
                          fontWeight: 600,
                          borderRadius: "4px",
                          bgcolor:
                            activeTab === i
                              ? alpha(theme.palette.primary.main, 0.08)
                              : "action.hover",
                          color: activeTab === i ? "primary.main" : "text.secondary",
                          "& .MuiChip-label": { px: 0.6 },
                        }}
                      />
                    )}
                  </Box>
                }
              />
            ))}
          </Tabs>

        {activeTab === 0 && (
          <TrucksTab
            trucks={trucks}
            loading={trucksLoading}
            onViewAll={goToTrucks}
            onView={(tid) =>
              navigate(routes.truck?.view?.(tid) ?? `/trucks/${tid}`)
            }
          />
        )}
        {activeTab === 1 && (
          <LoadsTab
            loads={loads}
            loading={loadsLoading}
            onViewAll={goToLoads}
            onView={(lid) =>
              navigate(routes.load?.view?.(lid) ?? `/loads/${lid}`)
            }
          />
        )}
        {activeTab === 2 && (
          <SellTab
            products={sellProducts}
            loading={sellLoading}
            onViewAll={goToBuySell}
            onView={(pid) =>
              navigate(routes.buysell?.view?.(pid) ?? `/buy-sell/${pid}`)
            }
          />
        )}
        {activeTab === 3 && (
          <BuyTab
            bitRecords={buyRecords}
            loading={buyLoading}
            onViewAll={goToBuySell}
            onView={(pid) =>
              navigate(routes.buysell?.view?.(pid) ?? `/buy-sell/${pid}`)
            }
          />
        )}
        {activeTab === 4 && (
          <IncomeExpenseTab
            records={incomeExpenseRecords}
            loading={incomeExpenseLoading}
            onViewAll={goToIncomeExpense}
          />
        )}
      </ViewPageSection>
    </PageContainer>
  );
}
