/**
 * Subscription Response Enhancement Utility
 * 
 * Enriches subscription response with:
 * - Computed fields (isExpired, daysRemaining, expiresIn)
 * - Expired subscription details
 * - Status badges
 * - Easy frontend handling
 */

// ── Enrich a single subscription with computed fields ──────────────────────
function enrichSubscription(sub, allSubscriptions = []) {
  const now = new Date();
  const endDate = new Date(sub.endDate);
  const startDate = new Date(sub.startDate);
  
  // Calculate days remaining
  const msRemaining = endDate - now;
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));
  
  // Check if expired
  const isExpired = endDate < now;
  
  console.log(`[enrichSubscription] DEBUG:`, {
    subscriptionItemId: sub.subscriptionItemId,
    fieldName: sub.fieldName,
    now: now.toISOString(),
    endDate: endDate.toISOString(),
    isExpired,
    status: sub.status,
  });
  
  // Calculate expiration status
  let expirationStatus = "active";
  if (isExpired) {
    expirationStatus = "expired";
  } else if (daysRemaining <= 3) {
    expirationStatus = "expiring_soon";
  } else if (daysRemaining <= 7) {
    expirationStatus = "expiring_this_week";
  }
  
  // Human readable expiration
  let expiresIn = "";
  if (isExpired) {
    const daysPassed = Math.floor(-msRemaining / (1000 * 60 * 60 * 24));
    expiresIn = `Expired ${daysPassed} day${daysPassed > 1 ? 's' : ''} ago`;
  } else if (daysRemaining === 0) {
    expiresIn = "Expires today";
  } else if (daysRemaining === 1) {
    expiresIn = "Expires tomorrow";
  } else {
    expiresIn = `Expires in ${daysRemaining} days`;
  }
  
  // ── Expired Details: ALWAYS populated if subscription is expired ───────────
  let expiredDetails = null;
  
  if (isExpired || sub.status === "expired") {
    // ✅ THIS subscription is expired — ALWAYS populate its expiration details
    const expiredDaysAgo = Math.floor(-msRemaining / (1000 * 60 * 60 * 24));
    
    expiredDetails = {
      subscriptionItemId: sub.subscriptionItemId,
      fieldName: sub.fieldName,
      packageName: sub.packageName,
      packageType: sub.packageType || "",
      status: "expired",
      expiredOn: endDate.toISOString(),
      expiredDaysAgo: Math.max(0, expiredDaysAgo),  // Never negative
      reason: "subscription_duration_completed",
      durationDays: sub.durationDays,
      price: sub.price,
      autoPay: sub.autoPay,
      startDate: sub.startDate,
      endDate: sub.endDate,
    };
    
    console.log(`[enrichSubscription] ✅ EXPIRED - populating expiredDetails:`, expiredDetails);
  } else {
    // Find related older expired subscriptions with same fieldName
    const relatedExpired = allSubscriptions
      .filter(s => 
        s.fieldName === sub.fieldName &&
        (s.status === "expired" || new Date(s.endDate) < now) &&
        new Date(s.endDate) < new Date(sub.startDate)
      )
      .map(s => ({
        subscriptionItemId: s.subscriptionItemId,
        fieldName: s.fieldName,
        packageName: s.packageName,
        packageType: s.packageType || "",
        status: "expired",
        endDate: s.endDate,
        autoPay: s.autoPay,
        expiredAgo: formatDateDifference(new Date(s.endDate), now)
      }));
    
    if (relatedExpired.length > 0) {
      expiredDetails = relatedExpired;
      console.log(`[enrichSubscription] Found ${relatedExpired.length} related expired subscriptions`);
    }
  }
  
  // Return enriched subscription
  return {
    // Original fields
    subscriptionItemId: sub.subscriptionItemId,
    fieldName: sub.fieldName,
    packageName: sub.packageName,
    packageType: sub.packageType,
    durationDays: sub.durationDays,
    price: sub.price,
    startDate: sub.startDate,
    endDate: sub.endDate,
    status: sub.status,
    razorpayOrderId: sub.razorpayOrderId,
    razorpayPaymentId: sub.razorpayPaymentId,
    assignedByAdmin: sub.assignedByAdmin,
    autoPay: sub.autoPay,
    _id: sub._id,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
    
    // ── NEW: Computed Fields ─────────────────────────────────────────
    computed: {
      isExpired,
      daysRemaining,
      expirationStatus,      // "active" | "expiring_soon" | "expiring_this_week" | "expired"
      expiresIn,             // "Expires in 5 days", "Expired 2 days ago", etc.
      willAutoRenew: !isExpired && sub.autoPay,
      renewalDate: !isExpired && sub.autoPay ? new Date(endDate.getTime() + (sub.durationDays * 24 * 60 * 60 * 1000)).toISOString() : null,
    },
    
    // ── NEW: Expired Subscription Details ────────────────────────────
    expiredDetails,
  };
}

// ── Format date difference ───────────────────────────────────────────────────
function formatDateDifference(date1, date2) {
  const diffMs = Math.abs(date2 - date1);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffMonths = Math.floor(diffDays / 30);
  
  if (diffMonths > 0) {
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  }
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

// ── Enhanced subscription list response ───────────────────────────────────────
function enrichSubscriptions(subscriptions) {
  console.log(`[enrichSubscriptions] Processing ${subscriptions.length} subscriptions`);
  return subscriptions.map(sub => enrichSubscription(sub, subscriptions));
}

module.exports = {
  enrichSubscription,
  enrichSubscriptions,
};