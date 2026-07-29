require('dotenv').config();

function isEmailConfigured() {
  return Boolean(
    (process.env.SMTP_HOST || '').trim() &&
      (process.env.SMTP_USER || '').trim() &&
      (process.env.SMTP_PASS || '').trim(),
  );
}

/**
 * Send email via SMTP (nodemailer). Optional — skips if SMTP not configured.
 * @returns {{ sent: boolean, messageId?: string, error?: string }}
 */
async function sendEmail(to, subject, htmlOrText) {
  if (!to || !String(to).includes('@')) {
    return { sent: false, error: 'Invalid email address' };
  }

  if (!isEmailConfigured()) {
    console.warn(
      'Email not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS (optional SMTP_PORT, SMTP_FROM)',
    );
    return { sent: false, error: 'Email not configured' };
  }

  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST.trim(),
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER.trim(),
        pass: process.env.SMTP_PASS.trim(),
      },
    });

    const info = await transporter.sendMail({
      from: (process.env.SMTP_FROM || process.env.SMTP_USER).trim(),
      to: String(to).trim(),
      subject: String(subject || 'iTruck Notification'),
      text: String(htmlOrText || ''),
      html: `<div style="font-family:sans-serif;line-height:1.5">${String(htmlOrText || '').replace(/\n/g, '<br/>')}</div>`,
    });

    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.warn('Email send failed:', err.message);
    return { sent: false, error: err.message || 'Email send failed' };
  }
}

module.exports = sendEmail;
