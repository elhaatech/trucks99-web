'use strict';

require('dotenv').config();

let client = null;

function getTwilioEnv() {
  return {
    accountSid: (process.env.TWILIO_ACCOUNT_SID || '').trim(),
    authToken: (process.env.TWILIO_AUTH_TOKEN || '').trim(),
    phoneNumber: (process.env.TWILIO_PHONE_NUMBER || '').trim(),
    whatsappFrom: (process.env.TWILIO_WHATSAPP_FROM || '').trim(),
  };
}

function isSmsConfigured() {
  const { accountSid, authToken, phoneNumber } = getTwilioEnv();
  return Boolean(accountSid && accountSid.startsWith('AC') && authToken && phoneNumber);
}

function isWhatsAppConfigured() {
  const { accountSid, authToken, whatsappFrom } = getTwilioEnv();
  return Boolean(accountSid && accountSid.startsWith('AC') && authToken && whatsappFrom);
}

function getTwilioClient() {
  if (client) return client;
  const { accountSid, authToken } = getTwilioEnv();
  if (!accountSid || !authToken) return null;
  // eslint-disable-next-line global-require
  client = require('twilio')(accountSid, authToken);
  return client;
}

function toE164(mobile) {
  const raw = String(mobile || '').replace(/\D/g, '');
  if (!raw) return null;
  if (raw.length === 10) return `+91${raw}`;
  return raw.startsWith('+') ? raw : `+${raw}`;
}

function normalizeWhatsAppFrom(from) {
  const f = String(from || '').trim();
  if (!f) return null;
  if (f.startsWith('whatsapp:')) return f;
  if (f.startsWith('+')) return `whatsapp:${f}`;
  if (/^\d{10}$/.test(f)) return `whatsapp:+91${f}`;
  return `whatsapp:${f}`;
}

function toWhatsAppE164(mobile) {
  const e164 = toE164(mobile);
  if (!e164) return null;
  return `whatsapp:${e164}`;
}

module.exports = {
  getTwilioEnv,
  getTwilioClient,
  isSmsConfigured,
  isWhatsAppConfigured,
  toE164,
  toWhatsAppE164,
  normalizeWhatsAppFrom,
};
