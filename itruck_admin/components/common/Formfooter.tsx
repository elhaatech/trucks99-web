import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { alpha } from "@mui/material/styles";

export interface FormFooterProps {
  formId: string;
  submitting: boolean;
  submitLabel: string;
  submittingLabel: string;
  onCancel: () => void;
}

/**
 * Sticky footer row with Submit and Cancel buttons.
 */
export default function FormFooter({
  formId,
  submitting,
  submitLabel,
  submittingLabel,
  onCancel,
}: FormFooterProps) {
  return (
    <Box
      className="fullWidth"
      component="footer"
      sx={{
        borderTop: 1,
        borderColor: "divider",
        pt: 3,
        mt: 3,
        display: "flex",
        justifyContent: "flex-end",
        gap: 1.5,
        bgcolor: (t) => alpha(t.palette.background.default, 0.5),
        mx: -3,
        px: 3,
        pb: 1,
        borderRadius: "0 0 12px 12px",
      }}
    >
      <Button type="button" variant="outlined" onClick={onCancel} disabled={submitting}>
        Cancel
      </Button>
      <Button
        type="submit"
        form={formId}
        variant="contained"
        disabled={submitting}
        sx={{
          minWidth: 120,
          "&:hover": {
            boxShadow: (t) => `0 6px 18px ${alpha(t.palette.primary.main, 0.28)}`,
          },
        }}
      >
        {submitting ? submittingLabel : submitLabel}
      </Button>
    </Box>
  );
}
