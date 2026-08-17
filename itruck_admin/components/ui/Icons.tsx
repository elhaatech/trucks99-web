"use client";

import * as React from "react";

const iconStyle: React.CSSProperties = { display: "block" };

export function ViewIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={iconStyle} aria-hidden>
      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
    </svg>
  );
}

export function EditIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={iconStyle} aria-hidden>
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

export function DeleteIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={iconStyle} aria-hidden>
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  );
}

export function BlockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={iconStyle} aria-hidden>
      {/* Simple "stop" icon */}
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.24 13.83L14.83 17.24 12 14.41l-2.83 2.83-1.41-1.41L10.59 13 7.76 10.17l1.41-1.41L12 11.59l2.83-2.83 1.41 1.41L13.41 13l2.83 2.83z" />
    </svg>
  );
}

export function UnblockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={iconStyle} aria-hidden>
      {/* Simple "unlock/check" icon */}
      <path d="M12 1c-5.52 0-10 4.48-10 10v2c0 5.52 4.48 10 10 10s10-4.48 10-10V11c0-5.52-4.48-10-10-10zm4.12 7.88-4.88 4.88-2.12-2.12 1.41-1.41 0.71 0.71 3.47-3.47 1.41 1.41z" />
    </svg>
  );
}

export function WarningTriangleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
    </svg>
  );
}
