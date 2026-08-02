"use strict";

const path = require("path");
const fs = require("fs");
const express = require("express");
const multer = require("multer");
const ContactEnquiry = require("../schema/contactEnquiry");
const Log = require("../schema/log");

const contactRouter = express.Router();

const uploadRoot = path.join(__dirname, "..", "uploads");
const contactUploadDir = path.join(uploadRoot, "contact_doc");
if (!fs.existsSync(contactUploadDir)) {
  fs.mkdirSync(contactUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, contactUploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const base = path.basename(file.originalname || "file", ext);
    const safeBase = base.replace(/[^a-zA-Z0-9_-]/g, "_");
    cb(null, `${safeBase}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
});

function getSupportContactInfo() {
  const phone = String(process.env.SUPPORT_PHONE || "+919150723962").trim();
  const email = String(process.env.SUPPORT_EMAIL || "thetrucks99@gmail.com")
    .trim()
    .toLowerCase();
  const digits = phone.replace(/\D/g, "");
  const whatsappNumber = digits.startsWith("91") ? digits : `91${digits.slice(-10)}`;

  return {
    phone,
    email,
    whatsappNumber,
    callUrl: `tel:${phone.replace(/\s/g, "")}`,
    whatsappUrl: `https://wa.me/${whatsappNumber}`,
    mailtoUrl: `mailto:${email}`,
  };
}

/** GET /api/contact/info — public support contact channels */
contactRouter.get("/info", (_req, res) => {
  try {
    return res.status(200).json({
      message: "Contact info",
      data: getSupportContactInfo(),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load contact info",
      error: error?.message || String(error),
    });
  }
});

/** POST /api/contact/submit — public contact form (JSON or multipart) */
contactRouter.post("/submit", upload.single("attachment"), async (req, res) => {
  try {
    const body = req.body || {};
    const name = String(body.name || "").trim();
    const mobile = String(body.mobile || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const message = String(body.message || "").trim();

    let attachment = body.attachment ? String(body.attachment).trim() : null;
    if (req.file?.filename) {
      attachment = `/uploads/contact_doc/${req.file.filename}`;
    }

    if (!name) {
      return res.status(400).json({ message: "Name is required." });
    }
    if (!mobile) {
      return res.status(400).json({ message: "Mobile number is required." });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "A valid email is required." });
    }
    if (!message || message.length < 5) {
      return res.status(400).json({ message: "Message must be at least 5 characters long." });
    }

    const actor = req.user || {};
    const enquiry = await ContactEnquiry.create({
      name,
      mobile,
      email,
      message,
      attachment: attachment || null,
      userId: actor._id || actor.id || null,
    });

    try {
      await Log.create({
        name: actor.name || name,
        email: actor.email || email,
        role: actor.role || "guest",
        action: `Contact enquiry submitted (${enquiry.id})`,
      });
    } catch {
      /* non-blocking */
    }

    return res.status(201).json({
      message: "Thanks! We received your message and will get back soon.",
      data: {
        id: enquiry.id,
        _id: enquiry._id,
        createdAt: enquiry.createdAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to submit contact form",
      error: error?.message || String(error),
    });
  }
});

module.exports = contactRouter;
