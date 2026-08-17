'use strict';

const Notification = require('../schema/notification');
const NotificationLog = require('../schema/notificationLog');
const NotificationTemplate = require('../schema/notificationTemplate');
const User = require('../schema/user');
const sendSMS = require('../helpers/sendSMS');
const sendWhatsApp = require('../helpers/sendWhatsApp');
const sendEmail = require('../helpers/email/sendEmail');
const { sendPushToUser } = require('./fcmPushService');
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
  FEATURED_FREE_PLAN_REQUEST: 'featured_free_plan_request',
  FEATURED_FREE_PLAN_APPROVED: 'featured_free_plan_approved',
  FEATURED_FREE_PLAN_REJECTED: 'featured_free_plan_rejected',
  BID_PLACED: 'bid_placed',
  BID_ACCEPTED: 'bid_accepted',
  BID_REJECTED: 'bid_rejected',
  // Load/Truck request flow (post owner <-> requesting user)
  NEW_REQUEST: 'NEW_REQUEST',
  REQUEST_ACCEPTED: 'REQUEST_ACCEPTED',
  REQUEST_REJECTED: 'REQUEST_REJECTED',
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
        body: 'TRUCKS99: {{planName}} activated until {{expiryDate}}. Paid Rs.{{amount}}.',
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
        body: 'Hi {{userName}}, your {{planName}} plan on TRUCKS99 expires on {{expiryDate}}. Renew now to avoid interruption.',
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
        body: 'TRUCKS99: Payment of ₹{{amount}} failed. Please retry. Ref: {{transactionId}}.',
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
        body: 'TRUCKS99: EMI payment of ₹{{amount}} received. Ref: {{transactionId}}.',
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
      push: { title: 'New offer', body: '{{userName}} bid ₹{{amount}} on {{productName}}' },
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
        body: 'TRUCKS99: Your offer of ₹{{amount}} on {{productName}} was accepted.',
      },
      push: { title: 'Offer accepted', body: 'Your bid of ₹{{amount}} for {{productName}} was accepted.' },
    },
  },
  {
    event: NOTIFICATION_EVENTS.BID_REJECTED,
    label: 'Bid Rejected',
    placeholders: ['amount', 'productName', 'rejectionReason'],
    templates: {
      in_app: {
        title: 'Offer declined',
        body: 'Your offer of ₹{{amount}} on {{productName}} was not accepted. {{rejectionReason}}',
      },
      whatsapp: {
        body: 'TRUCKS99: Your offer of ₹{{amount}} on {{productName}} was not accepted. {{rejectionReason}}',
      },
      push: {
        title: 'Offer declined',
        body: 'Your bid of ₹{{amount}} on {{productName}} was declined. {{rejectionReason}}',
      },
    },
  },
  {
    event: NOTIFICATION_EVENTS.NEW_REQUEST,
    label: 'New Request',
    description: 'Sent to a post owner when a load/truck/product receives a new request or offer.',
    placeholders: ['userName', 'postType', 'amount', 'entityLabel', 'productName', 'relatedLabel'],
    templates: {
      in_app: {
        title: 'New request received',
        body: '{{userName}} requested your {{postType}} ({{entityLabel}}) with a bid of ₹{{amount}}.',
      },
      whatsapp: {
        body: 'TRUCKS99: {{userName}} placed an offer of ₹{{amount}} on your {{postType}} ({{entityLabel}}).',
      },
      push: {
        title: 'New {{postType}} offer',
        body: '{{userName}} offered ₹{{amount}} on {{entityLabel}}',
      },
    },
  },
  {
    event: NOTIFICATION_EVENTS.REQUEST_ACCEPTED,
    label: 'Request Accepted',
    description: 'Sent to the requesting user when the post owner accepts their request.',
    placeholders: ['postType', 'amount', 'entityLabel'],
    templates: {
      in_app: {
        title: 'Request accepted',
        body: 'Your {{postType}} bid of ₹{{amount}} was accepted.',
      },
      whatsapp: {
        body: 'TRUCKS99: Your request for this {{postType}} was accepted.',
      },
      push: {
        title: 'Request accepted',
        body: 'Your {{postType}} bid of ₹{{amount}} was accepted.',
      },
    },
  },
  {
    event: NOTIFICATION_EVENTS.REQUEST_REJECTED,
    label: 'Request Rejected',
    description: 'Sent to the requesting user when the post owner rejects their request.',
    placeholders: ['postType', 'amount', 'entityLabel', 'rejectionReason'],
    templates: {
      in_app: {
        title: 'Request declined',
        body: 'Your {{postType}} bid of ₹{{amount}} was declined. {{rejectionReason}}',
      },
      whatsapp: {
        body: 'TRUCKS99: Your request for this {{postType}} was declined. {{rejectionReason}}',
      },
      push: {
        title: 'Request declined',
        body: 'Your {{postType}} bid of ₹{{amount}} was declined. {{rejectionReason}}',
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
        body: 'Hi {{userName}}, reminder to update or relist {{productName}} on TRUCKS99 for better visibility.',
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
        body: 'Feature {{productName}} to reach more buyers on TRUCKS99.',
      },
      whatsapp: {
        body: 'Boost {{productName}} with a featured listing on TRUCKS99 to get more enquiries.',
      },
    },
  },
  {
    event: NOTIFICATION_EVENTS.FEATURED_FREE_PLAN_REQUEST,
    label: 'Free Plan Featured Request',
    description: 'Sent to admins when a seller requests the Free Plan to feature a vehicle.',
    placeholders: ['userName', 'sellerName', 'sellerMobile', 'productName', 'requestStatus'],
    templates: {
      in_app: {
        title: 'Free Plan featured request',
        body: '{{sellerName}} requested a Free Plan to feature {{productName}}. Status: {{requestStatus}}.',
      },
      push: {
        title: 'Free Plan request',
        body: '{{sellerName}} requested featuring {{productName}}',
      },
    },
  },
  {
    event: NOTIFICATION_EVENTS.FEATURED_FREE_PLAN_APPROVED,
    label: 'Free Plan Featured Approved',
    description: 'Sent to the seller when an admin approves their Free Plan featured request.',
    placeholders: ['userName', 'productName', 'expiryDate'],
    templates: {
      in_app: {
        title: 'Free Plan approved',
        body: '{{productName}} is now featured on TRUCKS99 until {{expiryDate}}.',
      },
      push: {
        title: 'Listing featured',
        body: '{{productName}} is now featured until {{expiryDate}}',
      },
    },
  },
  {
    event: NOTIFICATION_EVENTS.FEATURED_FREE_PLAN_REJECTED,
    label: 'Free Plan Featured Rejected',
    description: 'Sent to the seller when an admin rejects their Free Plan featured request.',
    placeholders: ['userName', 'productName', 'rejectionReason'],
    templates: {
      in_app: {
        title: 'Free Plan request declined',
        body: 'Your Free Plan request for {{productName}} was not approved. {{rejectionReason}}',
      },
      push: {
        title: 'Free Plan declined',
        body: 'Your Free Plan request for {{productName}} was not approved.',
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
      sms: { body: 'TRUCKS99: {{message}}' },
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

/** Maps internal notification events to FCM `data.type` values expected by the mobile app. */
function resolveFcmEventType(event, metadata = {}) {
  if (metadata.fcmType) return String(metadata.fcmType);
  switch (event) {
    case NOTIFICATION_EVENTS.BID_PLACED:
    case NOTIFICATION_EVENTS.NEW_REQUEST:
      return 'NEW_REQUEST';
    case NOTIFICATION_EVENTS.BID_ACCEPTED:
    case NOTIFICATION_EVENTS.REQUEST_ACCEPTED:
      return 'REQUEST_ACCEPTED';
    case NOTIFICATION_EVENTS.BID_REJECTED:
    case NOTIFICATION_EVENTS.REQUEST_REJECTED:
      return 'REQUEST_REJECTED';
    case NOTIFICATION_EVENTS.PRODUCT_BOOKING:
      return 'PRODUCT_BOOKING';
    case NOTIFICATION_EVENTS.PRODUCT_PURCHASED:
      return 'PRODUCT_PURCHASED';
    case NOTIFICATION_EVENTS.PRODUCT_SOLD:
      return 'PRODUCT_SOLD';
    case NOTIFICATION_EVENTS.PAYMENT_SUCCESS:
      return 'PAYMENT_SUCCESS';
    default:
      return String(event || 'GENERAL');
  }
}

function buildProductPushMetadata(product, extra = {}) {
  if (!product) return { ...extra };
  const productId = product.id || product.uuid || (product._id != null ? String(product._id) : '');
  return {
    productId,
    postId: productId,
    entityId: productId,
    postType: 'PRODUCT',
    entityType: 'PRODUCT',
    route: productId ? `/portal/products/${productId}` : '/admin/portal/notifications',
    ...extra,
  };
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

/**
 * Central notification dispatcher.
 * @param {object} params
 * @param {string} params.userId - User id (ObjectId string or uuid)
 * @param {string} params.event - NOTIFICATION_EVENTS value
 * @param {object} [params.data] - Placeholder values
 * @param {object} [params.metadata] - Extra refs (postId, requestId, postType, status, productId, loadId, route, etc.)
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
    console.warn("[FCM][notificationService] SKIP — user not found:", userId, "event:", event);
    return { ok: false, error: 'User not found', results };
  }

  if (!skipDedupe && dedupeKey && userOid) {
    const dup = await wasRecentlySent(userOid, event, dedupeKey);
    if (dup) {
      console.warn("[FCM][notificationService] SKIP duplicate:", { event, userId: String(userOid), dedupeKey });
      return { ok: true, skipped: true, reason: 'duplicate', results };
    }
  }

  const tpl = await getTemplate(event);
  if (!tpl || tpl.enabled === false) {
    console.warn("[FCM][notificationService] SKIP — template missing/disabled:", event);
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
        senderId: metadata.senderId || undefined,
        title,
        message,
        event,
        type: event,
        read: false,
        isRead: false,
        loadId: metadata.loadId || undefined,
        productId: metadata.productId || undefined,
        postId: metadata.postId || metadata.productId || metadata.loadId || metadata.truckId || undefined,
        requestId: metadata.requestId || metadata.bitRecordId || undefined,
        postType: metadata.postType || undefined,
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
    // Structured data payload so the frontend/app can deep-link straight to the post/request.
    const productPublicId =
      metadata.productId != null
        ? String(metadata.productId)
        : metadata.postType === "PRODUCT"
          ? String(metadata.postId || metadata.entityId || "")
          : "";
    const postPublicId = metadata.postId != null ? String(metadata.postId) : "";
    const requestPublicId =
      metadata.requestId != null
        ? String(metadata.requestId)
        : metadata.bitRecordId != null
          ? String(metadata.bitRecordId)
          : "";

    const fcmType = resolveFcmEventType(event, metadata);
    const pushOptions = {
      type: fcmType,
      postId: postPublicId || productPublicId,
      productId: productPublicId,
      requestId: requestPublicId,
      bitRecordId: requestPublicId,
      postType: metadata.postType || metadata.entityType || "",
      entityType: metadata.entityType || metadata.postType || "",
      entityId: metadata.entityId || postPublicId || productPublicId,
      status: metadata.status || "",
      route: metadata.route || "/admin/portal/notifications",
      id: postPublicId || productPublicId || metadata.entityId || "",
      bidAmount:
        metadata.bidAmount != null
          ? String(metadata.bidAmount)
          : data.amount != null
            ? String(data.amount)
            : "",
      bidderId:
        metadata.bidderId || metadata.senderId
          ? String(metadata.bidderId || metadata.senderId)
          : "",
      bidderName: metadata.bidderName || data.userName || "",
      ownerId: metadata.ownerId ? String(metadata.ownerId) : "",
      bitReason: metadata.bitReason ? String(metadata.bitReason) : "",
      rejectionType: metadata.rejectionType ? String(metadata.rejectionType) : "",
    };

    console.log("[FCM][notificationService] sending push →", {
      event,
      fcmType,
      userId: String(userOid),
      title,
      body,
      productId: pushOptions.productId,
      requestId: pushOptions.requestId,
      postType: pushOptions.postType,
      route: pushOptions.route,
    });

    const push = await sendPushToUser(userOid, title, body, pushOptions);

    console.log("[FCM][notificationService] push result →", {
      event,
      userId: String(userOid),
      sent: push?.sent ?? false,
      error: push?.error || null,
      deviceCount: push?.deviceCount ?? 0,
      messageId: push?.messageId || null,
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
  } else if (!activeChannels.includes('push')) {
    console.warn("[FCM][notificationService] SKIP push — channel disabled for event:", event);
  } else if (!userOid) {
    console.warn("[FCM][notificationService] SKIP push — user not found:", userId, "event:", event);
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
    const isPushTemplateEvent = [
      NOTIFICATION_EVENTS.BID_PLACED,
      NOTIFICATION_EVENTS.BID_ACCEPTED,
      NOTIFICATION_EVENTS.BID_REJECTED,
      NOTIFICATION_EVENTS.NEW_REQUEST,
      NOTIFICATION_EVENTS.REQUEST_ACCEPTED,
      NOTIFICATION_EVENTS.REQUEST_REJECTED,
      NOTIFICATION_EVENTS.PRODUCT_BOOKING,
      NOTIFICATION_EVENTS.PRODUCT_PURCHASED,
      NOTIFICATION_EVENTS.PRODUCT_SOLD,
      NOTIFICATION_EVENTS.PAYMENT_SUCCESS,
      NOTIFICATION_EVENTS.FEATURED_FREE_PLAN_REQUEST,
      NOTIFICATION_EVENTS.FEATURED_FREE_PLAN_APPROVED,
      NOTIFICATION_EVENTS.FEATURED_FREE_PLAN_REJECTED,
    ].includes(def.event);

    // eslint-disable-next-line no-await-in-loop
    await NotificationTemplate.findOneAndUpdate(
      { event: def.event },
      isPushTemplateEvent
        ? {
            $set: {
              label: def.label,
              description: def.description || '',
              templates: def.templates,
              placeholders: def.placeholders || [],
              'channels.push': true,
            },
            $setOnInsert: {
              event: def.event,
              enabled: true,
              channels: {
                in_app: true,
                whatsapp: true,
                sms: false,
                email: false,
                push: true,
              },
            },
          }
        : {
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
  resolveFcmEventType,
  buildProductPushMetadata,
};