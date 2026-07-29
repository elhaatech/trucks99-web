'use strict';

const Notification = require('../schema/notification');
const NotificationLog = require('../schema/notificationLog');
const NotificationTemplate = require('../schema/notificationTemplate');
const User = require('../schema/user');
const FcmToken = require('../schema/firebaseusear');
const sendSMS = require('../helpers/sendSMS');
const sendWhatsApp = require('../helpers/sendWhatsApp');
const sendEmail = require('../helpers/email/sendEmail');
const sendNotification = require('../Firebase/firebase');
const { resolveToObjectId } = require('../helpers/uuidHelper');

/** Canonical business events */
const NOTIFICATION_EVENTS = {
  PREMIUM_PURCHASED: 'premium_purchased',
  PREMIUM_EXPIRY_REMINDER: 'premium_expiry_reminder',
  PRODUCT_PURCHASED: 'product_purchased',
  PRODUCT_SOLD: 'product_sold',
  PRODUCT_BOOKING: 'product_booking',
  BOOKING_REMINDER: 'booking_reminder',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  EMI_APPLICATION: 'emi_application',
  EMI_PAYMENT_SUCCESS: 'emi_payment_success',
  VEHICLE_REMINDER: 'vehicle_reminder',
  FEATURED_LISTING_REMINDER: 'featured_listing_reminder',
  BID_PLACED: 'bid_placed',
  BID_ACCEPTED: 'bid_accepted',
  BID_REJECTED: 'bid_rejected',
  ADMIN_BULK: 'admin_bulk',
};

const DEFAULT_TEMPLATES = [
  {
    event: NOTIFICATION_EVENTS.PREMIUM_PURCHASED,
    label: 'Premium Purchase',
    description: 'Sent when a user successfully purchases a premium subscription.',
    placeholders: ['userName', 'planName', 'amount', 'expiryDate', 'transactionId'],
    templates: {
      in_app: {
        title: 'Premium activated',
        body: 'Hi {{userName}}, your {{planName}} plan is now active until {{expiryDate}}. Amount paid: ₹{{amount}}.',
      },
      whatsapp: {
        body: 'Hi {{userName}}, your {{planName}} premium plan is active until {{expiryDate}}. Paid: ₹{{amount}}. Ref: {{transactionId}}',
      },
      sms: {
        body: 'iTruck: {{planName}} activated until {{expiryDate}}. Paid Rs.{{amount}}.',
      },
      email: {
        subject: 'Premium plan activated — {{planName}}',
        body: 'Hi {{userName}},\n\nYour {{planName}} plan is active until {{expiryDate}}.\nAmount: ₹{{amount}}\nTransaction: {{transactionId}}',
      },
      push: {
        title: 'Premium activated',
        body: '{{planName}} is active until {{expiryDate}}',
      },
    },
  },
  {
    event: NOTIFICATION_EVENTS.PREMIUM_EXPIRY_REMINDER,
    label: 'Premium Expiry Reminder',
    description: 'Reminder before premium subscription expires.',
    placeholders: ['userName', 'planName', 'expiryDate'],
    templates: {
      in_app: {
        title: 'Premium expiring soon',
        body: 'Hi {{userName}}, your {{planName}} plan expires on {{expiryDate}}. Renew to keep access.',
      },
      whatsapp: {
        body: 'Hi {{userName}}, your {{planName}} plan on iTruck expires on {{expiryDate}}. Renew now to avoid interruption.',
      },
      push: { title: 'Premium expiring', body: '{{planName}} expires {{expiryDate}}' },
    },
  },
  {
    event: NOTIFICATION_EVENTS.PRODUCT_BOOKING,
    label: 'Product Booking',
    placeholders: ['userName', 'productName', 'amount', 'bookingId', 'vehicleName', 'buyerName', 'transactionId'],
    templates: {
      in_app: {
        title: 'Booking confirmed',
        body: 'Hi {{userName}}, you booked {{productName}} for ₹{{amount}}. Booking ID: {{bookingId}}.',
      },
      whatsapp: {
        body: 'Hi {{userName}}, booking for {{productName}} (₹{{amount}}) is confirmed. Booking ID: {{bookingId}}.',
      },
      push: { title: 'Booking confirmed', body: '{{productName}} — ₹{{amount}}' },
    },
  },
  {
    event: NOTIFICATION_EVENTS.PRODUCT_PURCHASED,
    label: 'Product Purchased',
    placeholders: ['userName', 'productName', 'amount', 'transactionId', 'vehicleName'],
    templates: {
      in_app: {
        title: 'Purchase successful',
        body: 'Hi {{userName}}, you purchased {{productName}} for ₹{{amount}}. Txn: {{transactionId}}.',
      },
      whatsapp: {
        body: 'Hi {{userName}}, purchase confirmed for {{productName}} — ₹{{amount}}. Transaction ID: {{transactionId}}.',
      },
      push: { title: 'Purchase successful', body: '{{productName}} — ₹{{amount}}' },
    },
  },
  {
    event: NOTIFICATION_EVENTS.PRODUCT_SOLD,
    label: 'Product Sold',
    placeholders: ['userName', 'productName', 'amount', 'buyerName'],
    templates: {
      in_app: {
        title: 'Your listing was sold',
        body: 'Hi {{userName}}, {{productName}} was purchased for ₹{{amount}}.',
      },
      whatsapp: {
        body: 'Hi {{userName}}, great news! {{productName}} was sold for ₹{{amount}}. Buyer: {{buyerName}}.',
      },
      push: { title: 'Listing sold', body: '{{productName}} — ₹{{amount}}' },
    },
  },
  {
    event: NOTIFICATION_EVENTS.PAYMENT_SUCCESS,
    label: 'Payment Success',
    placeholders: ['userName', 'amount', 'transactionId', 'productName', 'planName', 'buyerName'],
    templates: {
      in_app: {
        title: 'Payment received',
        body: 'Payment of ₹{{amount}} was successful. Ref: {{transactionId}}.',
      },
      whatsapp: {
        body: 'Hi {{userName}}, payment of ₹{{amount}} for {{productName}} was successful. Ref: {{transactionId}}.',
      },
      push: { title: 'Payment successful', body: '₹{{amount}} — {{transactionId}}' },
    },
  },
  {
    event: NOTIFICATION_EVENTS.PAYMENT_FAILED,
    label: 'Payment Failed',
    placeholders: ['userName', 'amount', 'transactionId'],
    templates: {
      in_app: {
        title: 'Payment failed',
        body: 'Payment of ₹{{amount}} could not be completed. Ref: {{transactionId}}.',
      },
      whatsapp: {
        body: 'iTruck: Payment of ₹{{amount}} failed. Please retry. Ref: {{transactionId}}.',
      },
    },
  },
  {
    event: NOTIFICATION_EVENTS.EMI_APPLICATION,
    label: 'EMI Application',
    placeholders: ['userName', 'productName', 'amount', 'bookingId'],
    templates: {
      in_app: {
        title: 'EMI application submitted',
        body: 'Your EMI application for {{productName}} (₹{{amount}}) has been submitted.',
      },
      whatsapp: {
        body: 'Hi {{userName}}, your EMI application for {{productName}} (₹{{amount}}) is submitted and under review.',
      },
    },
  },
  {
    event: NOTIFICATION_EVENTS.EMI_PAYMENT_SUCCESS,
    label: 'EMI Payment Success',
    placeholders: ['userName', 'amount', 'transactionId', 'productName'],
    templates: {
      in_app: {
        title: 'EMI payment received',
        body: 'EMI payment of ₹{{amount}} received. Ref: {{transactionId}}.',
      },
      whatsapp: {
        body: 'iTruck: EMI payment of ₹{{amount}} received. Ref: {{transactionId}}.',
      },
    },
  },
  {
    event: NOTIFICATION_EVENTS.BID_PLACED,
    label: 'Bid Placed',
    placeholders: ['userName', 'productName', 'amount', 'vehicleName'],
    templates: {
      in_app: {
        title: 'New offer received',
        body: '{{userName}} placed an offer of ₹{{amount}} on {{productName}}.',
      },
      whatsapp: {
        body: 'New offer on {{productName}}: ₹{{amount}} from {{userName}}.',
      },
      push: { title: 'New offer', body: '₹{{amount}} on {{productName}}' },
    },
  },
  {
    event: NOTIFICATION_EVENTS.BID_ACCEPTED,
    label: 'Bid Accepted',
    placeholders: ['productName', 'amount'],
    templates: {
      in_app: {
        title: 'Offer accepted',
        body: 'Your offer of ₹{{amount}} on {{productName}} was accepted.',
      },
      whatsapp: {
        body: 'iTruck: Your offer of ₹{{amount}} on {{productName}} was accepted.',
      },
      push: { title: 'Offer accepted', body: '{{productName}} — ₹{{amount}}' },
    },
  },
  {
    event: NOTIFICATION_EVENTS.BID_REJECTED,
    label: 'Bid Rejected',
    placeholders: ['amount', 'productName'],
    templates: {
      in_app: {
        title: 'Offer declined',
        body: 'Your offer of ₹{{amount}} was not accepted.',
      },
      whatsapp: {
        body: 'iTruck: Your offer of ₹{{amount}} was not accepted at this time.',
      },
    },
  },
  {
    event: NOTIFICATION_EVENTS.BOOKING_REMINDER,
    label: 'Booking Reminder',
    placeholders: ['userName', 'productName', 'bookingId'],
    templates: {
      in_app: {
        title: 'Complete your booking',
        body: 'Reminder: complete payment for {{productName}} (Booking {{bookingId}}).',
      },
      whatsapp: {
        body: 'Reminder: complete your booking for {{productName}}. Booking ID: {{bookingId}}.',
      },
    },
  },
  {
    event: NOTIFICATION_EVENTS.VEHICLE_REMINDER,
    label: 'Vehicle Relist Reminder',
    placeholders: ['userName', 'vehicleName', 'productName'],
    templates: {
      in_app: {
        title: 'Relist your vehicle',
        body: 'Hi {{userName}}, your listing {{productName}} may need attention. Consider updating or relisting.',
      },
      whatsapp: {
        body: 'Hi {{userName}}, reminder to update or relist {{productName}} on iTruck for better visibility.',
      },
    },
  },
  {
    event: NOTIFICATION_EVENTS.FEATURED_LISTING_REMINDER,
    label: 'Featured Listing Reminder',
    placeholders: ['userName', 'productName'],
    templates: {
      in_app: {
        title: 'Boost your listing',
        body: 'Feature {{productName}} to reach more buyers on iTruck.',
      },
      whatsapp: {
        body: 'Boost {{productName}} with a featured listing on iTruck to get more enquiries.',
      },
    },
  },
  {
    event: NOTIFICATION_EVENTS.ADMIN_BULK,
    label: 'Admin Bulk Campaign',
    placeholders: ['userName', 'message'],
    templates: {
      in_app: { title: 'Announcement', body: '{{message}}' },
      whatsapp: { body: 'Hi {{userName}}, {{message}}' },
      sms: { body: 'iTruck: {{message}}' },
    },
  },
];

function renderTemplate(template, data) {
  if (!template) return '';
  return String(template).replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const val = data[key];
    return val != null && val !== '' ? String(val) : '—';
  });
}

function resolveWhatsAppBody(event, tpl, payload, metadata) {
  const defaultBody =
    tpl.templates?.whatsapp?.body || tpl.templates?.in_app?.body || '';

  if (metadata?.role === 'seller' && payload.buyerName) {
    if (event === NOTIFICATION_EVENTS.PAYMENT_SUCCESS) {
      return 'Hi {{userName}}, payment of ₹{{amount}} received for {{productName}} from {{buyerName}}. Ref: {{transactionId}}.';
    }
    if (event === NOTIFICATION_EVENTS.PRODUCT_BOOKING) {
      return 'Hi {{userName}}, {{buyerName}} booked {{productName}} for ₹{{amount}}. Booking ID: {{bookingId}}.';
    }
  }

  return defaultBody;
}

async function resolveUser(userId) {
  if (!userId) return null;
  const oid = await resolveToObjectId(User, String(userId));
  if (!oid) return null;
  return User.findById(oid).lean();
}

async function logDelivery({
  userId,
  event,
  channel,
  title,
  message,
  status,
  errorMessage,
  providerMessageId,
  dedupeKey,
  metadata,
}) {
  return NotificationLog.create({
    userId: userId || undefined,
    event,
    channel,
    title: title || '',
    message,
    status,
    errorMessage: errorMessage || null,
    providerMessageId: providerMessageId || null,
    dedupeKey: dedupeKey || null,
    metadata: metadata || {},
    sentAt: status === 'sent' || status === 'delivered' ? new Date() : null,
  });
}

async function wasRecentlySent(userId, event, dedupeKey, withinHours = 24) {
  if (!dedupeKey || !userId) return false;
  const since = new Date(Date.now() - withinHours * 60 * 60 * 1000);
  const existing = await NotificationLog.findOne({
    userId,
    event,
    dedupeKey,
    status: { $in: ['sent', 'delivered'] },
    createdAt: { $gte: since },
  }).lean();
  return Boolean(existing);
}

async function getTemplate(event) {
  let tpl = await NotificationTemplate.findOne({ event }).lean();
  if (!tpl) {
    const def = DEFAULT_TEMPLATES.find((t) => t.event === event);
    if (def) {
      tpl = await NotificationTemplate.findOneAndUpdate(
        { event },
        {
          $setOnInsert: {
            event: def.event,
            label: def.label,
            description: def.description || '',
            enabled: true,
            channels: {
              in_app: true,
              whatsapp: true,
              sms: false,
              email: false,
              push: true,
            },
            templates: def.templates,
            placeholders: def.placeholders || [],
          },
        },
        { upsert: true, new: true },
      ).lean();
    }
  }
  return tpl;
}

async function sendPushToUser(userId, title, body, options = {}) {
  const oid = await resolveToObjectId(User, String(userId));
  if (!oid) return { sent: false, error: 'User not found' };

  const tokenDoc = await FcmToken.findOne({ userId: oid, isActive: true })
    .sort({ lastUsed: -1 })
    .lean();

  if (!tokenDoc?.token) {
    return { sent: false, error: 'No FCM token' };
  }

  const result = await sendNotification(tokenDoc.token, title, body, options);
  return result?.success
    ? { sent: true, messageId: result.message }
    : { sent: false, error: result?.message || 'Push failed' };
}

/**
 * Central notification dispatcher.
 * @param {object} params
 * @param {string} params.userId - User id (ObjectId string or uuid)
 * @param {string} params.event - NOTIFICATION_EVENTS value
 * @param {object} [params.data] - Placeholder values
 * @param {object} [params.metadata] - Extra refs (productId, loadId, orderId, etc.)
 * @param {string} [params.dedupeKey] - Prevent duplicate sends within 24h
 * @param {string[]} [params.channelsOverride] - Force specific channels
 * @param {boolean} [params.skipDedupe]
 */
async function notify({
  userId,
  event,
  data = {},
  metadata = {},
  dedupeKey = null,
  channelsOverride = null,
  skipDedupe = false,
}) {
  const results = { event, channels: {} };

  if (!event) {
    return { ok: false, error: 'event required', results };
  }

  const user = await resolveUser(userId);
  const userOid = user?._id || (await resolveToObjectId(User, String(userId)));

  if (!userOid && event !== NOTIFICATION_EVENTS.ADMIN_BULK) {
    return { ok: false, error: 'User not found', results };
  }

  if (!skipDedupe && dedupeKey && userOid) {
    const dup = await wasRecentlySent(userOid, event, dedupeKey);
    if (dup) {
      return { ok: true, skipped: true, reason: 'duplicate', results };
    }
  }

  const tpl = await getTemplate(event);
  if (!tpl || tpl.enabled === false) {
    return { ok: true, skipped: true, reason: 'template disabled or missing', results };
  }

  const payload = {
    userName: data.userName || user?.name || 'User',
    ...data,
  };

  const channelFlags = tpl.channels || {};
  const activeChannels =
    channelsOverride ||
    ['in_app', 'whatsapp', 'sms', 'email', 'push'].filter((ch) => channelFlags[ch] !== false);

  // ── In-app ──────────────────────────────────────────────────────────────
  if (activeChannels.includes('in_app') && userOid) {
    const title = renderTemplate(tpl.templates?.in_app?.title || tpl.label, payload);
    const message = renderTemplate(tpl.templates?.in_app?.body || '', payload);

    try {
      const doc = await Notification.create({
        userId: userOid,
        title,
        message,
        event,
        read: false,
        loadId: metadata.loadId || undefined,
        productId: metadata.productId || undefined,
        metadata,
      });

      await logDelivery({
        userId: userOid,
        event,
        channel: 'in_app',
        title,
        message,
        status: 'sent',
        dedupeKey,
        metadata,
      });
      results.channels.in_app = { sent: true, id: doc.id };
    } catch (err) {
      await logDelivery({
        userId: userOid,
        event,
        channel: 'in_app',
        title,
        message,
        status: 'failed',
        errorMessage: err.message,
        dedupeKey,
        metadata,
      });
      results.channels.in_app = { sent: false, error: err.message };
    }
  }

  // ── WhatsApp ────────────────────────────────────────────────────────────
  if (activeChannels.includes('whatsapp') && user?.mobile) {
    const waTemplate = resolveWhatsAppBody(event, tpl, payload, metadata);
    const message = renderTemplate(waTemplate, payload);
    const wa = await sendWhatsApp(user.mobile, message);
    await logDelivery({
      userId: userOid,
      event,
      channel: 'whatsapp',
      title: tpl.label,
      message,
      status: wa.sent ? 'sent' : 'failed',
      errorMessage: wa.error || null,
      providerMessageId: wa.messageId || null,
      dedupeKey,
      metadata,
    });
    results.channels.whatsapp = wa;
  } else if (activeChannels.includes('whatsapp')) {
    await logDelivery({
      userId: userOid,
      event,
      channel: 'whatsapp',
      title: tpl.label,
      message: '(skipped — no mobile)',
      status: 'skipped',
      dedupeKey,
      metadata,
    });
    results.channels.whatsapp = { sent: false, error: 'No mobile number' };
  }

  // ── SMS ─────────────────────────────────────────────────────────────────
  if (activeChannels.includes('sms') && user?.mobile) {
    const message = renderTemplate(tpl.templates?.sms?.body || tpl.templates?.in_app?.body || '', payload);
    const sms = await sendSMS(user.mobile, message);
    await logDelivery({
      userId: userOid,
      event,
      channel: 'sms',
      title: tpl.label,
      message,
      status: sms.sent ? 'sent' : 'failed',
      errorMessage: sms.error || null,
      dedupeKey,
      metadata,
    });
    results.channels.sms = sms;
  }

  // ── Email ─────────────────────────────────────────────────────────────
  if (activeChannels.includes('email') && user?.email && String(user.email).includes('@')) {
    const subject = renderTemplate(
      tpl.templates?.email?.subject || tpl.label,
      payload,
    );
    const message = renderTemplate(tpl.templates?.email?.body || tpl.templates?.in_app?.body || '', payload);
    const mail = await sendEmail(user.email, subject, message);
    await logDelivery({
      userId: userOid,
      event,
      channel: 'email',
      title: subject,
      message,
      status: mail.sent ? 'sent' : 'failed',
      errorMessage: mail.error || null,
      providerMessageId: mail.messageId || null,
      dedupeKey,
      metadata,
    });
    results.channels.email = mail;
  }

  // ── Push (FCM) ──────────────────────────────────────────────────────────
  if (activeChannels.includes('push') && userOid) {
    const title = renderTemplate(tpl.templates?.push?.title || tpl.templates?.in_app?.title || tpl.label, payload);
    const body = renderTemplate(tpl.templates?.push?.body || tpl.templates?.in_app?.body || '', payload);
    const push = await sendPushToUser(userOid, title, body, {
      type: event,
      id: metadata.productId || metadata.loadId || '',
      route: metadata.route || '/admin/portal/notifications',
    });
    await logDelivery({
      userId: userOid,
      event,
      channel: 'push',
      title,
      message: body,
      status: push.sent ? 'sent' : 'failed',
      errorMessage: push.error || null,
      providerMessageId: push.messageId || null,
      dedupeKey,
      metadata,
    });
    results.channels.push = push;
  }

  return { ok: true, results };
}

async function notifyMultiple(userIds, params) {
  const ids = [...new Set((userIds || []).map(String))];
  const out = [];
  for (const uid of ids) {
    // eslint-disable-next-line no-await-in-loop
    const r = await notify({ ...params, userId: uid });
    out.push({ userId: uid, ...r });
  }
  return out;
}

async function seedDefaultTemplates() {
  for (const def of DEFAULT_TEMPLATES) {
    // eslint-disable-next-line no-await-in-loop
    await NotificationTemplate.findOneAndUpdate(
      { event: def.event },
      {
        $setOnInsert: {
          event: def.event,
          label: def.label,
          description: def.description || '',
          enabled: true,
          channels: {
            in_app: true,
            whatsapp: true,
            sms: false,
            email: false,
            push: true,
          },
          templates: def.templates,
          placeholders: def.placeholders || [],
        },
      },
      { upsert: true },
    );
  }
  console.log(`[NotificationService] Seeded ${DEFAULT_TEMPLATES.length} default templates`);
}

module.exports = {
  NOTIFICATION_EVENTS,
  DEFAULT_TEMPLATES,
  notify,
  notifyMultiple,
  seedDefaultTemplates,
  renderTemplate,
  wasRecentlySent,
};
