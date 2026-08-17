"use client";

import { useRef, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import LinearProgress from "@mui/material/LinearProgress";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import UploadFileIcon from "@mui/icons-material/UploadFile";

export type BulkUploadErrorRow = { row: number; message: string };

export type BulkUploadApiResult = {
  message?: string;
  total: number;
  inserted: number;
  skipped: number;
  errors: BulkUploadErrorRow[];
};

type BulkUploadDialogProps = {
  open: boolean;
  onClose: () => void;
  /** Called with the picked file - should POST it to the entity's bulk-upload endpoint. */
  onUpload: (file: File) => Promise<BulkUploadApiResult>;
  /** Called after a successful upload (with at least 1 row inserted) so the parent can refresh its list. */
  onSuccess?: () => void;
  /** e.g. "Buy & Sell Products", "Vehicle Types" */
  entityLabel: string;
  /** Short description of required columns, shown above the file picker. */
  templateHint?: string;
};

const ACCEPTED_EXTENSIONS = [".xlsx", ".xls"];

export function BulkUploadDialog({
  open,
  onClose,
  onUpload,
  onSuccess,
  entityLabel,
  templateHint,
}: BulkUploadDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkUploadApiResult | null>(null);
  const [error, setError] = useState("");

  const reset = () => {
    setFile(null);
    setResult(null);
    setError("");
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (uploading) return; // don't allow closing mid-upload
    reset();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] || null;
    setResult(null);
    setError("");
    if (picked) {
      const ext = picked.name.slice(picked.name.lastIndexOf(".")).toLowerCase();
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        setError("Please select a .xlsx or .xls file.");
        setFile(null);
        return;
      }
    }
    setFile(picked);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError("");
    setResult(null);
    try {
      const res = await onUpload(file);
      setResult(res);
      if (res.inserted > 0) onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Bulk Upload — {entityLabel}</DialogTitle>
      <DialogContent>
        {templateHint && (
          <Alert severity="info" sx={{ mb: 2, whiteSpace: "pre-line" }}>
            {templateHint}
          </Alert>
        )}

        <Box
          sx={{
            border: "1px dashed",
            borderColor: "divider",
            borderRadius: 2,
            p: 3,
            textAlign: "center",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={handleFileChange}
            disabled={uploading}
          />
          <Button
            variant="outlined"
            startIcon={<UploadFileIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {file ? "Change file" : "Choose Excel file"}
          </Button>
          {file && (
            <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
              {file.name}
            </Typography>
          )}
        </Box>

        {uploading && <LinearProgress sx={{ mt: 2 }} />}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {result && (
          <Box sx={{ mt: 2 }}>
            <Alert severity={result.inserted > 0 ? "success" : "warning"}>
              {result.inserted} of {result.total} row(s) inserted
              {result.skipped > 0 ? `, ${result.skipped} skipped` : ""}.
            </Alert>

            {result.errors.length > 0 && (
              <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, maxHeight: 260 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell width={80}>Row</TableCell>
                      <TableCell>Issue</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {result.errors.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell>{e.row}</TableCell>
                        <TableCell>{e.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={uploading}>
          {result ? "Close" : "Cancel"}
        </Button>
        {!result && (
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? "Uploading…" : "Upload"}
          </Button>
        )}
        {result && (
          <Button
            variant="outlined"
            onClick={reset}
          >
            Upload another file
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}