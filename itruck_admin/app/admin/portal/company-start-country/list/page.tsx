"use client";

import dynamic from "next/dynamic";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";

const CompanyStartCountriesPage = dynamic(
  () =>
    import("../_components/companyStartCountryList/CompanyStartCountriesPage").then(
      (m) => ({
        default: m.CompanyStartCountriesPage,
      }),
    ),
  {
    // Keep this page client-only to avoid SSR crashes.
    ssr: false,
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

export default function CompanyStartCountryListRoutePage() {
  return <CompanyStartCountriesPage />;
}
