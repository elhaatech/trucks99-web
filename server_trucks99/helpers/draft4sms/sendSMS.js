"use strict";

require("dotenv").config();
const https = require("https");

function getDraft4SmsConfig() {
  return {
    apiBase: (
      process.env.DRAFT4SMS_API_URL || "https://text.draft4sms.com/vb/apikey.php"
    )
      .trim()
      .replace(/\?+$/, ""),
    apiKey: (
      process.env.DRAFT4SMS_API_KEY || process.env.SMS_API_KEY || ""
    ).trim(),
    senderId: (
      process.env.DRAFT4SMS_SENDER_ID ||
      process.env.SMS_SENDER_ID ||
      "TRUKXX"
    ).trim(),
    templateId: (
      process.env.DRAFT4SMS_TEMPLATE_ID ||
      process.env.SMS_TEMPLATE_ID ||
      ""
    ).trim(),
    peId: (
      process.env.DRAFT4SMS_PE_ID ||
      process.env.DRAFT4SMS_ENTITY_ID ||
      process.env.SMS_PE_ID ||
      ""
    ).trim(),
    numberFormat: String(process.env.DRAFT4SMS_NUMBER_FORMAT || "10")
      .trim()
      .toLowerCase(),
    timeoutMs: Number(process.env.DRAFT4SMS_TIMEOUT_MS || 15000),
  };
}

function toTenDigitMobile(mobile) {
  const digits = String(mobile || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  if (digits.length === 10) return digits;
  return digits.length >= 10 ? digits.slice(-10) : "";
}

function toSmsGatewayNumber(mobile, numberFormat = "10") {
  const ten = toTenDigitMobile(mobile);
  if (!ten) return "";
  if (numberFormat === "91" || numberFormat === "12") return `91${ten}`;
  return ten;
}

function isDraft4SmsConfigured() {
  const { apiKey, senderId } = getDraft4SmsConfig();
  return Boolean(apiKey && senderId);
}

function httpGet(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve({ statusCode: res.statusCode || 0, body: data });
      });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error(`Draft4SMS request timed out after ${timeoutMs}ms`));
    });

    req.on("error", (err) => {
      reject(err);
    });
  });
}

function isSuccessStatus(status) {
  const value = String(status == null ? "" : status)
    .trim()
    .toLowerCase();
  return (
    status === true ||
    value === "true" ||
    value === "1" ||
    value === "ok" ||
    value === "success" ||
    value === "sent" ||
    value === "accepted" ||
    value === "submitted" ||
    value === "done"
  );
}

function parseDraft4SmsResponse(responseText) {
  const raw = String(responseText || "").trim();
  if (!raw) {
    return { ok: false, error: "Empty response from Draft4SMS" };
  }

  try {
    const parsed = JSON.parse(raw);
    const errorCode = String(
      parsed.ErrorCode ?? parsed.errorCode ?? parsed.code ?? "",
    ).trim();
    if (errorCode === "000" || errorCode === "0") {
      return {
        ok: true,
        messageId:
          parsed.messageId ||
          parsed.msgid ||
          parsed.id ||
          parsed.description ||
          raw,
      };
    }

    const status = parsed.status ?? parsed.Status ?? parsed.success;
    if (isSuccessStatus(status)) {
      return {
        ok: true,
        messageId:
          parsed.messageId ||
          parsed.msgid ||
          parsed.id ||
          parsed.description ||
          raw,
      };
    }

    const error =
      parsed.description ||
      parsed.message ||
      parsed.msg ||
      parsed.error ||
      parsed.ErrorMessage ||
      `Draft4SMS error (code: ${parsed.code || errorCode || "unknown"})`;
    return { ok: false, error, code: parsed.code || errorCode };
  } catch {
    const lower = raw.toLowerCase();
    if (
      lower.includes("invalid api") ||
      lower.includes("invalid key") ||
      lower.includes("insufficient")
    ) {
      return { ok: false, error: raw };
    }
    if (
      lower.includes("success") ||
      lower.includes("sent") ||
      lower.includes("submitted") ||
      lower.includes("accepted") ||
      lower.includes("done") ||
      /^\d{6,}$/.test(raw)
    ) {
      return { ok: true, messageId: raw };
    }
    if (lower.includes("failed") || /\berror\b/.test(lower)) {
      return { ok: false, error: raw };
    }
    return { ok: false, error: raw };
  }
}

function buildDraft4SmsUrl(number, message) {
  const { apiBase, apiKey, senderId, templateId, peId } = getDraft4SmsConfig();
  const params = [
    `apikey=${encodeURIComponent(apiKey)}`,
    `senderid=${encodeURIComponent(senderId)}`,
    `number=${encodeURIComponent(number)}`,
    `mobile=${encodeURIComponent(number)}`,
    `message=${encodeURIComponent(String(message).trim())}`,
  ];
  if (templateId) {
    params.push(`templateid=${encodeURIComponent(templateId)}`);
    params.push(`tempid=${encodeURIComponent(templateId)}`);
  }
  if (peId) {
    params.push(`pe_id=${encodeURIComponent(peId)}`);
  }
  return `${apiBase}?${params.join("&")}`;
}

/**
 * Send SMS via Draft4SMS HTTP API.
 * Uses encodeURIComponent so DLT template spaces stay as %20 (not +).
 * @returns {{ sent: boolean, messageId?: string, error?: string, code?: string }}
 */
async function sendSMS(to, body) {
  if (!to || !String(body).trim()) {
    return { sent: false, error: "Invalid recipient or empty message body" };
  }

  const { senderId, timeoutMs, numberFormat } = getDraft4SmsConfig();
  if (!isDraft4SmsConfigured()) {
    console.warn(
      "[Draft4SMS] Not configured. Set DRAFT4SMS_API_KEY and DRAFT4SMS_SENDER_ID in .env",
    );
    return { sent: false, error: "Draft4SMS not configured" };
  }

  const number = toSmsGatewayNumber(to, numberFormat);
  if (!/^\d{10,12}$/.test(number)) {
    return { sent: false, error: "Invalid mobile number" };
  }

  const url = buildDraft4SmsUrl(number, body);

  try {
    const { statusCode, body: responseBody } = await httpGet(url, timeoutMs);
    const responseText = String(responseBody || "").trim();
    const parsed = parseDraft4SmsResponse(responseText);

    if (statusCode < 200 || statusCode >= 300) {
      console.warn(
        `[Draft4SMS] HTTP ${statusCode} for ${number} sender=${senderId}:`,
        parsed.error || responseText,
      );
      return {
        sent: false,
        error:
          parsed.error ||
          responseText ||
          `SMS send failed (HTTP ${statusCode})`,
        code: parsed.code,
      };
    }

    if (!parsed.ok) {
      console.warn(
        `[Draft4SMS] Rejected for ${number} sender=${senderId}:`,
        parsed.error || responseText,
      );
      return {
        sent: false,
        error: parsed.error || "Draft4SMS rejected the SMS request",
        code: parsed.code,
      };
    }

    console.log(
      `[Draft4SMS] Accepted for ${number} — response: ${responseText}`,
    );
    return {
      sent: true,
      messageId: parsed.messageId || responseText || "ok",
      providerResponse: responseText,
    };
  } catch (err) {
    console.warn("[Draft4SMS] Failed:", err.message);
    return { sent: false, error: err.message || "SMS send failed" };
  }
}

module.exports = sendSMS;
module.exports.isDraft4SmsConfigured = isDraft4SmsConfigured;
module.exports.toTenDigitMobile = toTenDigitMobile;
module.exports.toSmsGatewayNumber = toSmsGatewayNumber;
module.exports.parseDraft4SmsResponse = parseDraft4SmsResponse;
module.exports.buildDraft4SmsUrl = buildDraft4SmsUrl;
