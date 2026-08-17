"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

import type { TruckRoute } from "@/model/api";

export type TruckRoutesTableProps = {
  routes: TruckRoute[];
  loading: boolean;
  onView: (route: TruckRoute) => void;
  onEdit: (route: TruckRoute) => void;
  onDelete: (route: TruckRoute) => void;
};

export default function TruckRoutesTable({ routes, loading, onView, onEdit, onDelete }: TruckRoutesTableProps) {
  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 120 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (!routes || routes.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
        No routes found for this truck.
      </Typography>
    );
  }

  return (
    <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, overflow: "hidden" }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>From</TableCell>
            <TableCell>To</TableCell>
            <TableCell>Price</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {routes.map((r, idx) => {
            const key = String(r._id ?? r.id ?? `${r.from?.address ?? ""}-${r.to?.address ?? ""}-${idx}`);
            return (
              <TableRow key={key}>
                <TableCell sx={{ width: "34%" }}>{r.from?.address ?? "-"}</TableCell>
                <TableCell sx={{ width: "34%" }}>{r.to?.address ?? "-"}</TableCell>
                <TableCell sx={{ width: "16%" }}>{r.price ?? "-"}</TableCell>
                <TableCell align="right" sx={{ width: "16%" }}>
                  <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <Button size="small" variant="outlined" onClick={() => onView(r)}>
                      View
                    </Button>
                    <Button size="small" variant="outlined" onClick={() => onEdit(r)}>
                      Edit
                    </Button>
                    <Button size="small" variant="outlined" color="error" onClick={() => onDelete(r)}>
                      Delete
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );
}

