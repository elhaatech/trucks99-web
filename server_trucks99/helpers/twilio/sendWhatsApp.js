'use strict';

const {
  getTwilioClient,
  isWhatsAppConfigured,
  normalizeWhatsAppFrom,
  toWhatsAppE164,
} = require('./config');

/**
 * Send WhatsApp message via Twilio.
 * @returns {{ sent: boolean, messageId?: string, error?: string }}
 */
async function sendWhatsApp(toMobile, body) {
  const twilioClient = getTwilioClient();
  const from = normalizeWhatsAppFrom(process.env.TWILIO_WHATSAPP_FROM);
  const to = toWhatsAppE164(toMobile);

  if (!isWhatsAppConfigured() || !twilioClient || !from) {
    console.warn(
      '[Twilio WhatsApp] Not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM',
    );
    return { sent: false, error: 'Twilio WhatsApp not configured' };
  }

  if (!to) {
    return { sent: false, error: 'Invalid mobile number' };
  }

  if (!body || !String(body).trim()) {
    return { sent: false, error: 'Empty message body' };
  }

  try {
    const msg = await twilioClient.messages.create({
      body: String(body).trim(),
      from,
      to,
    });
    console.log(`[Twilio WhatsApp] Sent to ${to} sid=${msg.sid}`);
    return { sent: true, messageId: msg.sid };
  } catch (err) {
    console.warn('[Twilio WhatsApp] Failed:', err.message);
    return { sent: false, error: err.message || 'WhatsApp send failed' };
  }
}

module.exports = sendWhatsApp;
