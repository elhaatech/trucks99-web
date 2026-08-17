import { api } from "./common";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CreateOrderResponse = {
  orderId: string;
  amount: number;   // in paise
  currency: string;
  keyId: string;
};

export type VerifyPaymentBody = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  subscriptionItemId: string;
  fieldName: string;
  packageName: string;
  packageType?: string;
  durationDays: number;
  price: number;
  autoPay?: boolean;
  /** Buy & Sell listing to feature after successful payment. */
  productId?: string;
  buySellProductId?: string;
};

export type VerifyPaymentResponse = {
  message: string;
  paymentId: string;
  orderId: string;
  featuredVehicle?: Record<string, unknown> | null;
  featuredVehicleCreated?: boolean;
  featuredVehicleDuplicate?: boolean;
};

export type ActiveSubscription = {
  _id: string;
  subscriptionItemId: string;
  fieldName: string;
  packageName: string;
  packageType: string;
  durationDays: number;
  price: number;
  startDate: string;
  endDate: string;
  status: "active" | "expired" | "cancelled";
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  assignedByAdmin?: boolean;
  createdAt?: string;
};

export type TransactionRecord = {
  id?: string;
  _id: string;
  orderId: string;
  userId: string;
  packageId: string;
  packageDuration: number;
  price: number;
  status: "created" | "success" | "failed";
  paymentId?: string | null;
  errorDetails?: string | null;
  orderDetails?: any;
  paymentDetails?: any;
  razorpayResponse?: any;
  createdAt: string;
  updatedAt: string;
};

export type UserSubscriptionDoc = {
  userId: string;
  activeSubscriptions: ActiveSubscription[];
};

export type AdminAssignBody = {
  userId: string;
  subscriptionItemId: string;
  fieldName: string;
  packageName: string;
  packageType?: string;
  durationDays: number;
  price: number;
};

export type RazorpaySuccessResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

// ─── API calls ────────────────────────────────────────────────────────────────

// Step 1 — create Razorpay order on server
export async function createPaymentOrder(body: {
  amount: number;
  subscriptionItemId: string;
  fieldName: string;
  packageName: string;
  durationDays: number;
  productId?: string;
  buySellProductId?: string;
}): Promise<CreateOrderResponse> {
  return api<CreateOrderResponse>("/api/payment/create-order", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Step 2 — verify payment signature + activate subscription
export async function verifyPayment(
  body: VerifyPaymentBody
): Promise<VerifyPaymentResponse> {
  return api("/api/payment/verify", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Step 3 — handle payment failure
export async function failPayment(body: {
  orderId: string;
  errorDetails: string;
}): Promise<{ message: string }> {
  return api("/api/payment/fail", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Fetch all transactions
export async function getTransactions(): Promise<TransactionRecord[]> {
  return api<TransactionRecord[]>("/api/payment/transactions");
}

// Fetch single transaction by ID (optimized)
export async function getTransaction(
  txId: string
): Promise<TransactionRecord> {
  return api<TransactionRecord>(`/api/payment/transaction/${txId}`);
}

// User — get own active subscriptions
export async function getMySubscriptions(): Promise<UserSubscriptionDoc> {
  return api<UserSubscriptionDoc>("/api/payment/my-subscriptions");
}

// Admin — get subscriptions for any user by ID
export async function getUserSubscriptions(
  userId: string
): Promise<UserSubscriptionDoc> {
  return api<UserSubscriptionDoc>(`/api/payment/user-subscriptions/${userId}`);
}

// Admin — assign subscription without payment
export async function adminAssignSubscription(
  body: AdminAssignBody
): Promise<{ message: string; subscription: UserSubscriptionDoc }> {
  return api("/api/payment/admin-assign", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Auto-pay confirm — renew subscription after user confirms popup
export type AutoPayConfirmBody = {
  subscriptionItemId: string;
  fieldName: string;
  packageName: string;
  packageType?: string;
  durationDays: number;
  price: number;
  userId?: string;
};

export async function autoPayConfirm(
  body: AutoPayConfirmBody
): Promise<{ message: string; subscription: UserSubscriptionDoc }> {
  return api("/api/payment/auto-pay-confirm", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Manually trigger subscription expiry check
export async function checkExpiredSubscriptions(): Promise<{
  message: string;
  expiredCount: number;
  processedUsers: string[];
}> {
  return api("/api/payment/check-expired");
}

// ─── Razorpay SDK helpers ─────────────────────────────────────────────────────

// Dynamically loads checkout.js (browser only)
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// Opens the Razorpay modal
export function openRazorpayCheckout(options: {
  keyId: string;
  orderId: string;
  amount: number;       // in paise
  currency: string;
  packageName: string;
  description?: string;
  userName?: string;
  userEmail?: string;
  userMobile?: string;
  onSuccess: (response: RazorpaySuccessResponse) => void;
  onFailure?: (error: unknown) => void;
}): void {
  const rzpOptions = {
    key: options.keyId,
    amount: options.amount,
    currency: options.currency,
    name: "iTruck",
    description: options.description || options.packageName,
    order_id: options.orderId,
    prefill: {
      name: options.userName || "",
      email: options.userEmail || "",
      contact: options.userMobile || "",
    },
    theme: { color: "#1976d2" },
    handler: (response: RazorpaySuccessResponse) => {
      options.onSuccess(response);
    },
    modal: {
      ondismiss: () => {
        options.onFailure?.("Payment cancelled by user");
      },
    },
  };

  const rzp = new (window as any).Razorpay(rzpOptions);
  rzp.on("payment.failed", (response: any) => {
    options.onFailure?.(response?.error?.description || "Payment failed");
  });
  rzp.open();
}