'use strict';

const {
  getTwilioClient,
  isSmsConfigured,
  toE164,
} = require('./config');

/**
 * Send SMS via Twilio.
 * @returns {{ sent: boolean, messageId?: string, error?: string }}
 */
async function sendSMS(to, body) {
  if (!to || !String(body).trim()) {
    return { sent: false, error: 'Invalid recipient or empty message body' };
  }

  const twilioClient = getTwilioClient();
  const fromRaw = (process.env.TWILIO_PHONE_NUMBER || '').trim();

  if (!isSmsConfigured() || !twilioClient) {
    console.warn(
      '[Twilio SMS] Not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER',
    );
    return { sent: false, error: 'Twilio SMS not configured' };
  }

  const from = /^\d{10}$/.test(fromRaw) ? `+91${fromRaw}` : fromRaw;
  const recipientE164 = toE164(to);
  if (!recipientE164) {
    return { sent: false, error: 'Invalid mobile number' };
  }

  try {
    const msg = await twilioClient.messages.create({
      body: String(body).trim(),
      to: recipientE164,
      from,
    });
    console.log(`[Twilio SMS] Sent to ${recipientE164} sid=${msg.sid}`);
    return { sent: true, messageId: msg.sid };
  } catch (err) {
    console.warn('[Twilio SMS] Failed:', err.message);
    return { sent: false, error: err.message || 'SMS send failed' };
  }
}

module.exports = sendSMS;
