"use client";

import React from "react";
import Box from "@mui/material/Box";

interface TruckDetail {
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
}

interface AcceptedTruckDetailsProps {
  acceptedTrucks?: TruckDetail[];
}

const IconTruck = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="3" width="15" height="13" rx="2" />
    <path d="M16 8h4l3 3v5h-7V8z" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const IconPhone = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.62 3.4 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.81a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const IconUser = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const StatCard = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div style={{ padding: "12px 14px", background: "#f8fafc", borderRadius: "8px", border: "0.5px solid #e2e8f0" }}>
    <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", fontWeight: "600", marginBottom: "6px", letterSpacing: "0.04em" }}>
      {label}
    </div>
    <div style={{ fontSize: "15px", fontWeight: "600", color: "#0f172a" }}>{value}</div>
  </div>
);

export default function AcceptedTruckDetails({ acceptedTrucks = [] }: AcceptedTruckDetailsProps) {
  if (!acceptedTrucks || acceptedTrucks.length === 0) {
    return null;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {acceptedTrucks.map((truck, idx) => (
        <div
          key={truck._id || truck.id || idx}
          style={{
            background: "#ffffff",
            border: "0.5px solid #e2e8f0",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
          }}
        >
          {/* ── Header ── */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "10px", background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", color: "#3B82F6", flexShrink: 0 }}>
                <IconTruck />
              </div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a", lineHeight: "1.3" }}>
                  {truck.truckNumber || "Truck"}
                </div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                  {truck.registrationNumber || "—"}
                </div>
              </div>
            </div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 14px", background: "#EAF3DE", borderRadius: "20px", fontSize: "12px", fontWeight: "600", color: "#3B6D11", flexShrink: 0, whiteSpace: "nowrap" }}>
              <IconCheck />
              Accepted
            </span>
          </div>

          {/* ── Stats Grid ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
            <StatCard label="Load Capacity" value={truck.loadCapacity ? `${truck.loadCapacity} T` : "—"} />
            <StatCard label="Wheels" value={truck.total_tire ? `${truck.total_tire} Tires` : "—"} />
            <StatCard label="Status" value={truck.status || "—"} />
            <StatCard label="Container" value={truck.capacity ? `${truck.capacity} ft` : "—"} />
          </div>

          {/* ── Owner Section ── */}
          {truck.owner && (
            <div style={{ borderTop: "0.5px solid #e2e8f0", paddingTop: "16px" }}>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <IconUser />
                Truck owner
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "44px", height: "44px", borderRadius: "8px", background: "#EFF6FF", color: "#2563EB", fontWeight: "600", fontSize: "15px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {(truck.owner.name || "?")[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "13px", fontWeight: "500", color: "#0f172a" }}>
                    {truck.owner.name || "—"}
                  </div>
                  {truck.owner.mobile && (
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                      {/* <IconPhone style={{ opacity: 0.6 }} /> */}
                      {truck.owner.mobile}
                    </div>
                  )}
                </div>
                <button style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 12px", border: "0.5px solid #cbd5e1", borderRadius: "6px", background: "#ffffff", color: "#64748b", cursor: "pointer", fontSize: "12px", fontWeight: "500", fontFamily: "inherit", transition: "all 0.2s" }} onMouseEnter={(e) => { (e.target as HTMLElement).style.background = "#f1f5f9"; (e.target as HTMLElement).style.borderColor = "#94a3b8"; }} onMouseLeave={(e) => { (e.target as HTMLElement).style.background = "#ffffff"; (e.target as HTMLElement).style.borderColor = "#cbd5e1"; }}>
                  <IconPhone />
                  Call
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </Box>
  );
}