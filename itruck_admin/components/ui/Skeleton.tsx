"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

export function TableSkeleton({
  rows = 5,
  columns = 5,
  showHeader = true,
}: TableSkeletonProps) {
  return (
    <Table size="medium">
      {showHeader && (
        <TableHead>
          <TableRow>
            {Array.from({ length: columns }).map((_, i) => (
              <TableCell key={i}>
                <Skeleton variant="text" width={i === 0 ? 80 : 100} height={20} />
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
      )}
      <TableBody>
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <TableRow key={rowIdx}>
            {Array.from({ length: columns }).map((_, colIdx) => (
              <TableCell key={colIdx}>
                <Skeleton
                  variant="text"
                  width={colIdx === 0 ? "70%" : colIdx === columns - 1 ? 60 : "85%"}
                  height={18}
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export interface CardSkeletonProps {
  lines?: number;
  showAvatar?: boolean;
}

export function CardSkeleton({ lines = 3, showAvatar = false }: CardSkeletonProps) {
  return (
    <Box sx={{ p: 3 }}>
      {showAvatar && (
        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <Skeleton variant="circular" width={48} height={48} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="40%" height={18} />
          </Box>
        </Box>
      )}
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? "50%" : "100%"}
          height={i === 0 ? 28 : 20}
          sx={{ mb: i < lines - 1 ? 1 : 0 }}
        />
      ))}
    </Box>
  );
}

export interface StatCardSkeletonProps {
  count?: number;
}

export function StatCardSkeleton({ count = 4 }: StatCardSkeletonProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 3,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Box
          key={i}
          sx={{
            p: 3,
            borderRadius: "12px",
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Skeleton variant="rounded" width={48} height={48} />
            <Skeleton variant="rounded" width={56} height={24} sx={{ borderRadius: "99px" }} />
          </Box>
          <Skeleton variant="text" width="50%" height={36} />
          <Skeleton variant="text" width="70%" height={20} sx={{ mt: 1 }} />
          <Skeleton variant="text" width="40%" height={16} sx={{ mt: 0.5 }} />
        </Box>
      ))}
    </Box>
  );
}

export { Skeleton };
