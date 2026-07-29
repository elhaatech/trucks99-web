const express = require('express');
const Notification = require('../schema/notification');
const NotificationLog = require('../schema/notificationLog');
const NotificationTemplate = require('../schema/notificationTemplate');
const User = require('../schema/user');
const { resolveToObjectId, toResponse, toResponseList } = require('../helpers/uuidHelper');
const {
  notify,
  notifyMultiple,
  NOTIFICATION_EVENTS,
  DEFAULT_TEMPLATES,
} = require('../services/notificationService');

const notificationRouter = express.Router();

function isAdminActor(actor) {
  if (!actor) return false;
  const email = actor.email && String(actor.email).toLowerCase();
  if (email === 'admin@mail.com') return true;
  const role = actor.roleId || actor.role;
  const roleName =
    typeof role === 'string' ? role : role?.name || role?.status || '';
  const n = String(roleName).toLowerCase();
  return (
    n === 'admin' ||
    n === 'super admin' ||
    n === 'super_admin' ||
    n === 'superadmin'
  );
}

function requireAdmin(req, res, next) {
  const actor = req.user || {};
  if (!isAdminActor(actor)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  return next();
}

// GET /api/notification — list in-app notifications for current user
notificationRouter.get('/', async (req, res) => {
  try {
    const userIdRaw = req.query.userId || (req.isAuthenticated() && req.user?._id);
    if (!userIdRaw) {
      return res.status(401).json({ message: 'User must be logged in or userId required.' });
    }
    const userId = await resolveToObjectId(User, String(userIdRaw));
    if (!userId) return res.status(404).json({ message: 'User not found' });
    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.status(200).json(toResponseList(notifications));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notifications', error: error.message });
  }
});

// GET /api/notification/history — admin delivery history (all channels)
notificationRouter.get('/history', requireAdmin, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.event) filter.event = String(req.query.event);
    if (req.query.channel) filter.channel = String(req.query.channel);
    if (req.query.status) filter.status = String(req.query.status);
    if (req.query.userId) {
      const uid = await resolveToObjectId(User, String(req.query.userId));
      if (uid) filter.userId = uid;
    }

    const [items, total] = await Promise.all([
      NotificationLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name mobile email id')
        .lean(),
      NotificationLog.countDocuments(filter),
    ]);

    res.status(200).json({
      data: toResponseList(items),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching notification history', error: error.message });
  }
});

// GET /api/notification/templates — list all templates (admin)
notificationRouter.get('/templates', requireAdmin, async (req, res) => {
  try {
    const templates = await NotificationTemplate.find({}).sort({ label: 1 }).lean();
    res.status(200).json(toResponseList(templates));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching templates', error: error.message });
  }
});

// GET /api/notification/templates/events — event catalog with placeholders
notificationRouter.get('/templates/events', requireAdmin, async (req, res) => {
  res.status(200).json({
    events: Object.values(NOTIFICATION_EVENTS),
    defaults: DEFAULT_TEMPLATES.map((t) => ({
      event: t.event,
      label: t.label,
      placeholders: t.placeholders || [],
    })),
  });
});

// GET /api/notification/templates/:event
notificationRouter.get('/templates/:event', requireAdmin, async (req, res) => {
  try {
    const tpl = await NotificationTemplate.findOne({ event: req.params.event }).lean();
    if (!tpl) return res.status(404).json({ message: 'Template not found' });
    res.status(200).json(toResponse(tpl));
  } catch (error) {
    res.status(500).json({ message: 'Error fetching template', error: error.message });
  }
});

// PUT /api/notification/templates/:event — update template (admin)
notificationRouter.put('/templates/:event', requireAdmin, async (req, res) => {
  try {
    const { label, description, enabled, channels, templates, placeholders } = req.body || {};
    const update = {};
    if (label != null) update.label = String(label);
    if (description != null) update.description = String(description);
    if (enabled != null) update.enabled = Boolean(enabled);
    if (channels && typeof channels === 'object') update.channels = channels;
    if (templates && typeof templates === 'object') update.templates = templates;
    if (Array.isArray(placeholders)) update.placeholders = placeholders;

    const tpl = await NotificationTemplate.findOneAndUpdate(
      { event: req.params.event },
      { $set: update },
      { new: true, upsert: true },
    ).lean();

    res.status(200).json(toResponse(tpl));
  } catch (error) {
    res.status(500).json({ message: 'Error updating template', error: error.message });
  }
});

// POST /api/notification/bulk — admin bulk campaign
notificationRouter.post('/bulk', requireAdmin, async (req, res) => {
  try {
    const { userIds, message, channels } = req.body || {};
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'userIds array is required' });
    }
    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: 'message is required' });
    }

    const results = await notifyMultiple(userIds, {
      event: NOTIFICATION_EVENTS.ADMIN_BULK,
      data: { message: String(message).trim() },
      channelsOverride: Array.isArray(channels) ? channels : null,
      skipDedupe: true,
    });

    res.status(200).json({ message: 'Bulk notification dispatched', results });
  } catch (error) {
    res.status(500).json({ message: 'Error sending bulk notification', error: error.message });
  }
});

// POST /api/notification/send — admin test send to one user
notificationRouter.post('/send', requireAdmin, async (req, res) => {
  try {
    const { userId, event, data, channels } = req.body || {};
    if (!userId || !event) {
      return res.status(400).json({ message: 'userId and event are required' });
    }
    const result = await notify({
      userId,
      event,
      data: data || {},
      channelsOverride: Array.isArray(channels) ? channels : null,
      skipDedupe: true,
    });
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error sending notification', error: error.message });
  }
});

// PUT /api/notification/read-all
notificationRouter.put('/read-all', async (req, res) => {
  try {
    const userIdRaw = req.body.userId || (req.isAuthenticated() && req.user?._id);
    if (!userIdRaw) {
      return res.status(401).json({ message: 'User must be logged in or userId required.' });
    }
    const userId = await resolveToObjectId(User, String(userIdRaw));
    if (!userId) return res.status(404).json({ message: 'User not found' });
    await Notification.updateMany({ userId }, { read: true });
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating notifications', error: error.message });
  }
});

// PUT /api/notification/:id/read
notificationRouter.put('/:id/read', async (req, res) => {
  try {
    const resolvedId = await resolveToObjectId(Notification, req.params.id);
    if (!resolvedId) return res.status(404).json({ message: 'Notification not found' });
    const updated = await Notification.findByIdAndUpdate(
      resolvedId,
      { read: true },
      { new: true },
    ).lean();
    if (!updated) return res.status(404).json({ message: 'Notification not found' });
    res.status(200).json(toResponse(updated));
  } catch (error) {
    res.status(500).json({ message: 'Error updating notification', error: error.message });
  }
});

module.exports = notificationRouter;
