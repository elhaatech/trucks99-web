"use client";

import dynamic from "next/dynamic";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

const IncomeExpenseListPage = dynamic(
  () =>
    import("../_components/incomeExpenseList/IncomeExpenseListPage").then(
      (m) => ({ default: m.IncomeExpenseListPage }),
    ),
  {
    loading: () => (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 320,
        }}
      >
        <CircularProgress />
      </Box>
    ),
  },
);

export default function IncomeExpenseListRoutePage() {
  return <IncomeExpenseListPage />;
}
