import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import { PRIMARY } from "@/lib/theme";

const PRIMARY_LIGHT = `${PRIMARY}14`;

type ViewAllFooterProps = {
  /** Total number of records available */
  total: number;
  /** Label shown in "Showing X of Y <label>" and "View all Y" */
  label: string;
  /** How many are currently shown (defaults to 10) */
  shownCount?: number;
  /** Called when the user clicks "View all" */
  onViewAll: () => void;
};

/**
 * Reusable footer shown below any paginated table/list when there are more
 * records than the current preview limit.
 *
 * Usage:
 *   import ViewAllFooter from "@/components/common/ViewAllFooter";
 *
 *   <ViewAllFooter total={trucks.length} label="trucks" onViewAll={goToTrucks} />
 *   <ViewAllFooter total={loads.length}  label="loads"  shownCount={5} onViewAll={goToLoads} />
 */
export default function ViewAllFooter({
  total,
  label,
  shownCount = 10,
  onViewAll,
}: ViewAllFooterProps) {
  if (total <= shownCount) return null;

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        mt: 1.5,
        pt: 1.5,
        borderTop: "0.5px solid",
        borderColor: "divider",
      }}
    >
      <Typography variant="caption" color="text.secondary" fontSize={12}>
        Showing {shownCount} of {total} {label}
      </Typography>

      <Button
        size="small"
        variant="outlined"
        endIcon={<ArrowForwardOutlinedIcon sx={{ fontSize: 13 }} />}
        onClick={onViewAll}
        sx={{
          borderRadius: "7px",
          textTransform: "none",
          fontWeight: 500,
          fontSize: 12,
          borderColor: "divider",
          color: "text.secondary",
          "&:hover": {
            borderColor: PRIMARY,
            color: PRIMARY,
            bgcolor: PRIMARY_LIGHT,
          },
        }}
      >
        View all {total}
      </Button>
    </Box>
  );
}