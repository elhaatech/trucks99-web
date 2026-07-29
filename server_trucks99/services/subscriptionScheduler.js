/**
 * Subscription Auto-Pay & Expiry Scheduler (ULTRA-FIXED)
 * 
 * Uses field-specific MongoDB updates to avoid subdocument conflicts.
 * Works with Mongoose timestamps and nested _id fields.
 */

const cron = require("node-cron");
const User = require("../schema/user");
const UserSubscription = require("../schema/usersubscriptionschema");
const Log = require("../schema/log");
const Transaction = require("../schema/transaction");
const {
  notify,
  NOTIFICATION_EVENTS,
} = require("./notificationService");

async function processExpiredSubscriptions() {
  const now = new Date();
  const results = {
    expiredCount: 0,
    renewedCount: 0,
    processedUsers: [],
    errors: [],
  };

  try {
    const docs = await UserSubscription.find({
      "activeSubscriptions.status": "active",
      "activeSubscriptions.endDate": { $lt: now },
    });

    console.log(`[Scheduler] Found ${docs.length} documents with expired subscriptions`);

    for (const doc of docs) {
      try {
        const userId = String(doc.userId);
        const expiredSubs = doc.activeSubscriptions.filter(
          (sub) => sub.status === "active" && new Date(sub.endDate) < now
        );

        if (expiredSubs.length === 0) continue;

        // Process each expired subscription
        for (const sub of expiredSubs) {
          const subId = sub._id;

          if (sub.autoPay) {
            // ── AUTO-RENEW ────────────────────────────────────────────────
            const nextEnd = new Date();
            nextEnd.setDate(nextEnd.getDate() + (sub.durationDays || 30));

            // Update using field-specific $set
            await UserSubscription.updateOne(
              { _id: doc._id, "activeSubscriptions._id": subId },
              {
                $set: {
                  "activeSubscriptions.$[elem].status": "active",
                  "activeSubscriptions.$[elem].startDate": new Date(),
                  "activeSubscriptions.$[elem].endDate": nextEnd,
                },
              },
              { arrayFilters: [{ "elem._id": subId }] }
            );

            results.renewedCount++;

            // Create transaction record
            try {
              const orderId = `autopay_${sub.subscriptionItemId}_${Date.now()}`;
              await new Transaction({
                orderId,
                userId,
                packageId: sub.subscriptionItemId,
                packageDuration: sub.durationDays,
                price: sub.price,
                status: "success",
                paymentId: orderId,
                orderDetails: { note: "Auto-Pay Renewal" },
              }).save();

              notify({
                userId,
                event: NOTIFICATION_EVENTS.PREMIUM_PURCHASED,
                data: {
                  planName: sub.packageName,
                  amount: sub.price,
                  expiryDate: nextEnd.toISOString().slice(0, 10),
                  transactionId: orderId,
                },
                dedupeKey: `autopay_${orderId}`,
                metadata: { subscriptionItemId: sub.subscriptionItemId },
              }).catch((err) =>
                console.warn(`[Scheduler] renewal notification failed:`, err.message),
              );

              await new Log({
                name: "System",
                email: "",
                role: "system",
                timestamp: new Date()
                  .toISOString()
                  .slice(0, 19)
                  .replace("T", " "),
                action: `Auto-renewed ${sub.packageName} (${sub.fieldName}) for user ${userId}`,
              }).save();
            } catch (txErr) {
              console.warn(`[Scheduler] Transaction log failed:`, txErr.message);
            }
          } else {
            // ── MARK AS EXPIRED ───────────────────────────────────────────
            await UserSubscription.updateOne(
              { _id: doc._id, "activeSubscriptions._id": subId },
              {
                $set: {
                  "activeSubscriptions.$[elem].status": "expired",
                },
              },
              { arrayFilters: [{ "elem._id": subId }] }
            );

            results.expiredCount++;

            notify({
              userId,
              event: NOTIFICATION_EVENTS.PREMIUM_EXPIRY_REMINDER,
              data: {
                planName: sub.packageName,
                expiryDate: new Date(sub.endDate).toISOString().slice(0, 10),
              },
              dedupeKey: `expired_${sub.subscriptionItemId}_${sub.endDate}`,
              metadata: { subscriptionItemId: sub.subscriptionItemId },
            }).catch((err) =>
              console.warn(`[Scheduler] expiry notification failed:`, err.message),
            );

            // Remove from user's purchased subscriptions
            try {
              let user = null;
              try {
                user = await User.findById(userId);
              } catch (_) {}

              if (!user) {
                user = await User.findOne({ id: userId });
              }

              if (user?.purchasedSubscriptions?.length > 0) {
                user.purchasedSubscriptions = user.purchasedSubscriptions.filter(
                  (ps) => ps.subscriptionItemId !== sub.subscriptionItemId
                );
                await user.save();
              }
            } catch (userErr) {
              console.warn(`[Scheduler] Failed to update user:`, userErr.message);
            }

            await new Log({
              name: "System",
              email: "",
              role: "system",
              timestamp: new Date()
                .toISOString()
                .slice(0, 19)
                .replace("T", " "),
              action: `Auto-expired ${sub.packageName} (${sub.fieldName}) for user ${userId}`,
            }).save();
          }
        }

        results.processedUsers.push(userId);
      } catch (userErr) {
        results.errors.push({
          userId: String(doc.userId),
          error: userErr?.message || String(userErr),
        });
        console.error(
          `[Scheduler] Error processing user ${doc.userId}:`,
          userErr.message
        );
      }
    }

    console.log(
      `[Scheduler] ✅ Expired: ${results.expiredCount}, Renewed: ${results.renewedCount}, Processed: ${results.processedUsers.length}`
    );
  } catch (error) {
    console.error("[Scheduler] Fatal error:", error.message);
    results.errors.push({ error: error?.message || String(error) });
  }

  return results;
}

function startScheduler() {
  const cronTime = process.env.CRON_SCHEDULE || "0 0 * * *";

  cron.schedule(cronTime, async () => {
    console.log(
      `[Scheduler] Running expiry check at ${new Date().toISOString()}`
    );
    await processExpiredSubscriptions();
  });

  console.log(`[Scheduler] ✅ Scheduled with cron: "${cronTime}"`);
}

module.exports = { processExpiredSubscriptions, startScheduler };