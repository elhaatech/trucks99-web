'use strict';

const cron = require('node-cron');
const UserSubscription = require('../schema/usersubscriptionschema');
const BuySellProduct = require('../schema/buysellProduct');
const {
  notify,
  NOTIFICATION_EVENTS,
} = require('./notificationService');
const { productLabel } = require('../helpers/productLabel');

const REMINDER_DAYS_BEFORE_EXPIRY = Number(process.env.PREMIUM_REMINDER_DAYS || 3);
const BOOKING_REMINDER_DAYS = Number(process.env.BOOKING_REMINDER_DAYS || 3);
const VEHICLE_REMINDER_DAYS = Number(process.env.VEHICLE_REMINDER_DAYS || 30);
const FEATURED_REMINDER_DAYS = Number(process.env.FEATURED_REMINDER_DAYS || 14);

async function sendPremiumExpiryReminders() {
  const now = new Date();
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + REMINDER_DAYS_BEFORE_EXPIRY);

  const docs = await UserSubscription.find({
    'activeSubscriptions.status': 'active',
    'activeSubscriptions.endDate': { $gte: now, $lte: windowEnd },
  }).lean();

  let sent = 0;
  for (const doc of docs) {
    const userId = doc.userId;
    for (const sub of doc.activeSubscriptions || []) {
      if (sub.status !== 'active') continue;
      const end = new Date(sub.endDate);
      if (end < now || end > windowEnd) continue;

      const expiryDate = end.toISOString().slice(0, 10);
      const dedupeKey = `premium_expiry_${sub.subscriptionItemId}_${expiryDate}`;

      // eslint-disable-next-line no-await-in-loop
      const result = await notify({
        userId,
        event: NOTIFICATION_EVENTS.PREMIUM_EXPIRY_REMINDER,
        data: {
          planName: sub.packageName || 'Premium',
          expiryDate,
        },
        dedupeKey,
        metadata: { subscriptionItemId: sub.subscriptionItemId },
      });
      if (result.ok && !result.skipped) sent += 1;
    }
  }
  return sent;
}

async function sendBookingReminders() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - BOOKING_REMINDER_DAYS);

  const products = await BuySellProduct.find({
    status: 'booking',
    bookedAt: { $lte: cutoff },
  })
    .select('id _id bsNumber description bookedBy bookedAt')
    .lean();

  let sent = 0;
  for (const product of products) {
    if (!product.bookedBy) continue;
    const bookingId = product.id || String(product._id);
    const dedupeKey = `booking_reminder_${bookingId}`;

    // eslint-disable-next-line no-await-in-loop
    const result = await notify({
      userId: product.bookedBy,
      event: NOTIFICATION_EVENTS.BOOKING_REMINDER,
      data: {
        productName: productLabel(product),
        bookingId,
      },
      dedupeKey,
      metadata: { productId: product._id },
    });
    if (result.ok && !result.skipped) sent += 1;
  }
  return sent;
}

async function sendVehicleRelistReminders() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - VEHICLE_REMINDER_DAYS);

  const products = await BuySellProduct.find({
    status: { $in: ['active', 'pending'] },
    updatedAt: { $lte: cutoff },
  })
    .select('id _id bsNumber description userid updatedAt')
    .limit(200)
    .lean();

  let sent = 0;
  for (const product of products) {
    if (!product.userid) continue;
    const dedupeKey = `vehicle_relist_${product.id || product._id}`;

    // eslint-disable-next-line no-await-in-loop
    const result = await notify({
      userId: product.userid,
      event: NOTIFICATION_EVENTS.VEHICLE_REMINDER,
      data: {
        productName: productLabel(product),
        vehicleName: productLabel(product),
      },
      dedupeKey,
      metadata: { productId: product._id },
    });
    if (result.ok && !result.skipped) sent += 1;
  }
  return sent;
}

async function sendFeaturedListingReminders() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - FEATURED_REMINDER_DAYS);

  const products = await BuySellProduct.find({
    status: 'active',
    createdAt: { $lte: cutoff },
  })
    .select('id _id bsNumber description userid createdAt viewCount')
    .sort({ viewCount: 1 })
    .limit(100)
    .lean();

  let sent = 0;
  for (const product of products) {
    if (!product.userid) continue;
    const dedupeKey = `featured_listing_${product.id || product._id}`;

    // eslint-disable-next-line no-await-in-loop
    const result = await notify({
      userId: product.userid,
      event: NOTIFICATION_EVENTS.FEATURED_LISTING_REMINDER,
      data: { productName: productLabel(product) },
      dedupeKey,
      metadata: { productId: product._id },
    });
    if (result.ok && !result.skipped) sent += 1;
  }
  return sent;
}

async function runAllReminders() {
  const results = {
    premiumExpiry: 0,
    booking: 0,
    vehicle: 0,
    featured: 0,
    errors: [],
  };

  try {
    results.premiumExpiry = await sendPremiumExpiryReminders();
  } catch (e) {
    results.errors.push({ task: 'premiumExpiry', error: e.message });
  }
  try {
    results.booking = await sendBookingReminders();
  } catch (e) {
    results.errors.push({ task: 'booking', error: e.message });
  }
  try {
    results.vehicle = await sendVehicleRelistReminders();
  } catch (e) {
    results.errors.push({ task: 'vehicle', error: e.message });
  }
  try {
    results.featured = await sendFeaturedListingReminders();
  } catch (e) {
    results.errors.push({ task: 'featured', error: e.message });
  }

  console.log(
    `[ReminderScheduler] premium=${results.premiumExpiry} booking=${results.booking} vehicle=${results.vehicle} featured=${results.featured}`,
  );
  return results;
}

function startReminderScheduler() {
  const cronTime = process.env.REMINDER_CRON_SCHEDULE || '0 9 * * *';
  cron.schedule(cronTime, async () => {
    console.log(`[ReminderScheduler] Running at ${new Date().toISOString()}`);
    await runAllReminders();
  });
  console.log(`[ReminderScheduler] Scheduled with cron: "${cronTime}"`);
}

module.exports = {
  runAllReminders,
  startReminderScheduler,
  sendPremiumExpiryReminders,
  sendBookingReminders,
  sendVehicleRelistReminders,
  sendFeaturedListingReminders,
};
