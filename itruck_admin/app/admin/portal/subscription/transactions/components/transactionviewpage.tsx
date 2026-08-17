"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import CreditCardIcon from "@mui/icons-material/CreditCard";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import PaymentIcon from "@mui/icons-material/Payment";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import {
  getTransaction,
  getTransactions,
  type TransactionRecord,
} from "@/model/services/Payment";
import { routes } from "@/lib/routes";
import { useSmartBack } from "@/lib/navigation";

// ─── Status Helpers ───────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  {
    color: "success" | "error" | "warning" | "default";
    icon: React.ReactNode;
    label: string;
    bgColor: string;
  }
> = {
  success: {
    color: "success",
    icon: <CheckCircleOutlineIcon fontSize="small" />,
    label: "Payment Successful",
    bgColor: "#e8f5e9",
  },
  failed: {
    color: "error",
    icon: <ErrorOutlineIcon fontSize="small" />,
    label: "Payment Failed",
    bgColor: "#ffebee",
  },
  created: {
    color: "warning",
    icon: <HourglassEmptyIcon fontSize="small" />,
    label: "Awaiting Payment",
    bgColor: "#fff8e1",
  },
};

// ─── Date Formatter ───────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 2.5,
        overflow: "hidden",
        mb: 2.5,
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          bgcolor: "grey.50",
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        {icon && (
          <Box sx={{ color: "primary.main", display: "flex" }}>{icon}</Box>
        )}
        <Typography variant="subtitle2" fontWeight={700} letterSpacing={0.3}>
          {title}
        </Typography>
      </Box>
      <Box sx={{ p: 2.5 }}>{children}</Box>
    </Paper>
  );
}

// ─── Detail Row ───────────────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  mono,
  color,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  color?: string;
}) {
  return (
    <TableRow sx={{ "&:last-child td": { borderBottom: 0 } }}>
      <TableCell
        sx={{
          fontWeight: 600,
          color: "text.secondary",
          width: "40%",
          py: 1.2,
          fontSize: "0.84rem",
          border: "none",
          borderBottom: "1px solid",
          borderColor: "grey.100",
        }}
      >
        {label}
      </TableCell>
      <TableCell
        sx={{
          py: 1.2,
          fontSize: "0.84rem",
          fontFamily: mono ? "'Roboto Mono', monospace" : "inherit",
          wordBreak: "break-all",
          color: color || "text.primary",
          fontWeight: mono ? 500 : 400,
          border: "none",
          borderBottom: "1px solid",
          borderColor: "grey.100",
        }}
      >
        {value ?? "—"}
      </TableCell>
    </TableRow>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <Box>
      <Skeleton
        variant="rectangular"
        height={80}
        sx={{ borderRadius: 2, mb: 2.5 }}
      />
      <Skeleton
        variant="rectangular"
        height={200}
        sx={{ borderRadius: 2, mb: 2.5 }}
      />
      <Skeleton
        variant="rectangular"
        height={160}
        sx={{ borderRadius: 2, mb: 2.5 }}
      />
    </Box>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  id: string;
}

export function TransactionViewPage({ id }: Props) {
  const router = useRouter();
  const goBack = useSmartBack(routes.subscription.transactions());

  const [tx, setTx] = useState<TransactionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // Try get-by-id first, fall back to get-all + filter
      let found: TransactionRecord | null = null;
      try {
        found = await getTransaction(id);
      } catch {
        // get-by-id failed (e.g. 404), try get-all
        const all = await getTransactions();
        found = (all ?? []).find((t) => t._id === id) ?? null;
      }
      if (!found) throw new Error("Transaction not found");
      setTx(found);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load transaction"
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleBack = goBack;

  // ── Loading state ──
  if (loading) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          size="small"
          sx={{ mb: 2 }}
        >
          Back to Transactions
        </Button>
        <LoadingSkeleton />
      </Box>
    );
  }

  // ── Error state ──
  if (error || !tx) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error || "Transaction not found."}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={handleBack}>
          Back to Transactions
        </Button>
      </Box>
    );
  }

  // ── Extract data safely ──
  const paymentDetails = tx.paymentDetails as Record<string, any> | undefined;
  const orderDetails = tx.orderDetails as Record<string, any> | undefined;
  const razorpayResponse = tx.razorpayResponse as
    | Record<string, any>
    | undefined;
  const cardData = paymentDetails?.card as Record<string, any> | undefined;
  const orderNotes = orderDetails?.notes as Record<string, any> | undefined;

  const hasCard = cardData && Object.keys(cardData).length > 0;
  const hasPaymentDetails =
    paymentDetails && Object.keys(paymentDetails).length > 0;
  const hasOrderDetails =
    orderDetails && Object.keys(orderDetails).length > 0;
  const hasRazorpayResponse =
    razorpayResponse && Object.keys(razorpayResponse).length > 0;

  const statusCfg = STATUS_CONFIG[tx.status] ?? STATUS_CONFIG.created;

  return (
    <Box>
      {/* ── Back Button ── */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={handleBack}
        size="small"
        sx={{ mb: 2.5 }}
      >
        Back to Transactions
      </Button>

      {/* ── Status Banner ── */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 2.5,
          mb: 2.5,
          overflow: "hidden",
          borderLeftWidth: 4,
          borderLeftColor:
            tx.status === "success"
              ? "success.main"
              : tx.status === "failed"
              ? "error.main"
              : "warning.main",
        }}
      >
        <Box
          sx={{
            p: 2.5,
            bgcolor: statusCfg.bgColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Box>
            <Stack direction="row" alignItems="center" gap={1} mb={0.5}>
              {statusCfg.icon}
              <Typography variant="h6" fontWeight={700}>
                {statusCfg.label}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {formatDate(tx.createdAt)}
            </Typography>
          </Box>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{
              color:
                tx.status === "success"
                  ? "success.dark"
                  : tx.status === "failed"
                  ? "error.dark"
                  : "warning.dark",
            }}
          >
            {formatCurrency(tx.price ?? 0)}
          </Typography>
        </Box>

        {/* Error message for failed payments */}
        {tx.errorDetails && (
          <Alert
            severity="error"
            variant="standard"
            sx={{ borderRadius: 0, borderTop: "1px solid", borderColor: "divider" }}
          >
            <strong>Reason:</strong> {tx.errorDetails}
          </Alert>
        )}
      </Paper>

      <Grid container spacing={2.5}>
        {/* ── LEFT COLUMN ── */}
        <Grid size={{ xs: 12, md: 7 }}>
          {/* Transaction Info */}
          <SectionCard
            title="Transaction Information"
            icon={<ReceiptLongIcon fontSize="small" />}
          >
            <Table size="small">
              <TableBody>
                <DetailRow label="Order ID" value={tx.orderId} mono />
                <DetailRow label="Payment ID" value={tx.paymentId} mono />
                <DetailRow label="Status" value={
                  <Chip
                    label={tx.status}
                    size="small"
                    color={statusCfg.color}
                    variant={tx.status === "success" ? "filled" : "outlined"}
                    sx={{
                      fontWeight: 700,
                      textTransform: "capitalize",
                      borderRadius: 1,
                    }}
                  />
                } />
                <DetailRow
                  label="Amount"
                  value={formatCurrency(tx.price ?? 0)}
                />
                <DetailRow
                  label="Duration"
                  value={`${tx.packageDuration} days`}
                />
                <DetailRow label="Created" value={formatDate(tx.createdAt)} />
                <DetailRow label="Updated" value={formatDate(tx.updatedAt)} />
              </TableBody>
            </Table>
          </SectionCard>

          {/* Payment Method Details (parsed, not raw JSON) */}
          {hasPaymentDetails && (
            <SectionCard
              title="Payment Details"
              icon={<PaymentIcon fontSize="small" />}
            >
              <Table size="small">
                <TableBody>
                  <DetailRow
                    label="Payment Method"
                    value={
                      <Chip
                        label={paymentDetails?.method ?? "—"}
                        size="small"
                        variant="outlined"
                        sx={{ textTransform: "capitalize", borderRadius: 1 }}
                      />
                    }
                  />
                  <DetailRow
                    label="Amount Paid"
                    value={
                      paymentDetails?.amount
                        ? formatCurrency(paymentDetails.amount / 100)
                        : "—"
                    }
                  />
                  <DetailRow label="Currency" value={paymentDetails?.currency} />
                  <DetailRow
                    label="Payment Status"
                    value={paymentDetails?.status}
                  />
                  <DetailRow
                    label="Description"
                    value={paymentDetails?.description}
                  />
                  <DetailRow label="Email" value={paymentDetails?.email} />
                  <DetailRow label="Contact" value={paymentDetails?.contact} />
                  {paymentDetails?.fee != null && (
                    <DetailRow
                      label="Platform Fee"
                      value={formatCurrency(paymentDetails.fee / 100)}
                    />
                  )}
                  {paymentDetails?.tax != null && paymentDetails.tax > 0 && (
                    <DetailRow
                      label="Tax"
                      value={formatCurrency(paymentDetails.tax / 100)}
                    />
                  )}
                  <DetailRow
                    label="Captured"
                    value={
                      paymentDetails?.captured ? (
                        <Chip
                          label="Yes"
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ borderRadius: 1 }}
                        />
                      ) : (
                        <Chip
                          label="No"
                          size="small"
                          color="error"
                          variant="outlined"
                          sx={{ borderRadius: 1 }}
                        />
                      )
                    }
                  />
                  {paymentDetails?.amount_refunded > 0 && (
                    <DetailRow
                      label="Amount Refunded"
                      value={formatCurrency(paymentDetails.amount_refunded / 100)}
                      color="error.main"
                    />
                  )}
                </TableBody>
              </Table>
            </SectionCard>
          )}

          {/* Card Details */}
          {hasCard && cardData && (
            <SectionCard
              title="Card Information"
              icon={<CreditCardIcon fontSize="small" />}
            >
              <Table size="small">
                <TableBody>
                  <DetailRow
                    label="Card Number"
                    value={
                      <Typography fontFamily="monospace" fontWeight={700}>
                        •••• •••• •••• {cardData.last4 ?? "????"}
                      </Typography>
                    }
                  />
                  <DetailRow label="Network" value={cardData.network} />
                  <DetailRow
                    label="Card Type"
                    value={
                      <Chip
                        label={cardData.type ?? "—"}
                        size="small"
                        variant="outlined"
                        sx={{ textTransform: "capitalize", borderRadius: 1 }}
                      />
                    }
                  />
                  <DetailRow label="Issuer" value={cardData.issuer} />
                  <DetailRow label="Sub Type" value={cardData.sub_type} />
                  <DetailRow
                    label="International"
                    value={cardData.international ? "Yes" : "No"}
                  />
                  <DetailRow
                    label="EMI Available"
                    value={cardData.emi ? "Yes" : "No"}
                  />
                </TableBody>
              </Table>
            </SectionCard>
          )}
        </Grid>

        {/* ── RIGHT COLUMN ── */}
        <Grid size={{ xs: 12, md: 5 }}>
          {/* IDs / References */}
          <SectionCard
            title="References"
            icon={<InfoOutlinedIcon fontSize="small" />}
          >
            <Table size="small">
              <TableBody>
                <DetailRow label="Transaction ID" value={tx._id} mono />
                <DetailRow label="User ID" value={tx.userId} mono />
                <DetailRow label="Package ID" value={tx.packageId} mono />
              </TableBody>
            </Table>
          </SectionCard>

          {/* Package / Order Notes */}
          {orderNotes && Object.keys(orderNotes).length > 0 && (
            <SectionCard
              title="Package Info"
              icon={<CalendarMonthIcon fontSize="small" />}
            >
              <Table size="small">
                <TableBody>
                  {orderNotes.packageName && (
                    <DetailRow label="Package Name" value={orderNotes.packageName} />
                  )}
                  {orderNotes.fieldName && (
                    <DetailRow label="Field" value={
                      <Chip
                        label={orderNotes.fieldName}
                        size="small"
                        variant="outlined"
                        sx={{ textTransform: "capitalize", borderRadius: 1 }}
                      />
                    } />
                  )}
                  {orderNotes.durationDays && (
                    <DetailRow
                      label="Duration"
                      value={`${orderNotes.durationDays} days`}
                    />
                  )}
                </TableBody>
              </Table>
            </SectionCard>
          )}

          {/* Customer Info (from payment details) */}
          {hasPaymentDetails &&
            (paymentDetails?.email || paymentDetails?.contact) && (
              <SectionCard
                title="Customer"
                icon={<PersonOutlineIcon fontSize="small" />}
              >
                <Table size="small">
                  <TableBody>
                    {paymentDetails?.contact && (
                      <DetailRow label="Phone" value={paymentDetails.contact} />
                    )}
                    {paymentDetails?.email && (
                      <DetailRow label="Email" value={paymentDetails.email} />
                    )}
                  </TableBody>
                </Table>
              </SectionCard>
            )}

          {/* Razorpay Verification */}
          {hasRazorpayResponse && (
            <SectionCard
              title="Razorpay Verification"
              icon={<CheckCircleOutlineIcon fontSize="small" />}
            >
              <Table size="small">
                <TableBody>
                  <DetailRow
                    label="Razorpay Order ID"
                    value={razorpayResponse?.razorpay_order_id}
                    mono
                  />
                  <DetailRow
                    label="Razorpay Payment ID"
                    value={razorpayResponse?.razorpay_payment_id}
                    mono
                  />
                  <DetailRow
                    label="Signature"
                    value={
                      <Typography
                        fontSize="0.72rem"
                        fontFamily="monospace"
                        sx={{
                          wordBreak: "break-all",
                          bgcolor: "grey.50",
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          border: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        {razorpayResponse?.razorpay_signature}
                      </Typography>
                    }
                  />
                </TableBody>
              </Table>
            </SectionCard>
          )}

          {/* Order Details (receipt, attempts, etc) */}
          {hasOrderDetails && (
            <SectionCard
              title="Order Details"
              icon={<ReceiptLongIcon fontSize="small" />}
            >
              <Table size="small">
                <TableBody>
                  <DetailRow label="Receipt" value={orderDetails?.receipt} mono />
                  <DetailRow
                    label="Order Amount"
                    value={
                      orderDetails?.amount
                        ? formatCurrency(orderDetails.amount / 100)
                        : "—"
                    }
                  />
                  <DetailRow
                    label="Amount Paid"
                    value={
                      orderDetails?.amount_paid != null
                        ? formatCurrency(orderDetails.amount_paid / 100)
                        : "—"
                    }
                  />
                  <DetailRow
                    label="Amount Due"
                    value={
                      orderDetails?.amount_due != null
                        ? formatCurrency(orderDetails.amount_due / 100)
                        : "—"
                    }
                  />
                  <DetailRow
                    label="Attempts"
                    value={orderDetails?.attempts ?? 0}
                  />
                  <DetailRow
                    label="Order Status"
                    value={orderDetails?.status}
                  />
                </TableBody>
              </Table>
            </SectionCard>
          )}
        </Grid>
      </Grid>

      {/* ── No data fallback for created status ── */}
      {!hasPaymentDetails &&
        !hasOrderDetails &&
        !hasRazorpayResponse &&
        tx.status === "created" && (
          <Alert
            severity="info"
            sx={{ mt: 1, borderRadius: 2 }}
            icon={<HourglassEmptyIcon />}
          >
            This transaction is still awaiting payment. Payment details will
            appear here once the user completes the checkout process.
          </Alert>
        )}
    </Box>
  );
}