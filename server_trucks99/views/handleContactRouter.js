"use strict";

const path = require("path");
const fs = require("fs");
const express = require("express");
const mongoose = require("mongoose");
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

function toEnquiryResponse(doc) {
  const item = doc && typeof doc.toObject === "function" ? doc.toObject() : { ...(doc || {}) };
  return {
    id: item.id,
    _id: item._id,
    name: item.name,
    mobile: item.mobile,
    email: item.email,
    message: item.message,
    attachment: item.attachment || null,
    status: item.status || "new",
    userId: item.userId || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findEnquiry(id) {
  const raw = String(id || "").trim();
  if (!raw) return null;
  let item = await ContactEnquiry.findOne({ id: raw });
  if (!item && mongoose.Types.ObjectId.isValid(raw)) {
    item = await ContactEnquiry.findById(raw);
  }
  return item;
}

function listFilterFromInput(input) {
  const search = String(input.search || "").trim();
  const status = String(input.status || "").trim().toLowerCase();
  const page = Math.max(1, parseInt(input.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(input.limit, 10) || 20));
  const filter = {};
  if (status && ["new", "read", "closed"].includes(status)) {
    filter.status = status;
  }
  if (search) {
    const rx = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: rx }, { email: rx }, { mobile: rx }, { message: rx }];
  }
  return { filter, page, limit };
}

async function listEnquiries(input, res) {
  try {
    const { filter, page, limit } = listFilterFromInput(input);
    const [items, total] = await Promise.all([
      ContactEnquiry.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ContactEnquiry.countDocuments(filter),
    ]);
    return res.status(200).json({
      message: "Contact enquiries",
      data: items.map(toEnquiryResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit) || 1),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load contact enquiries",
      error: error?.message || String(error),
    });
  }
}

/** POST /api/contact/list — admin enquiry list */
contactRouter.post("/list", async (req, res) => {
  return listEnquiries(req.body || {}, res);
});

/** GET /api/contact/list — same list with query params */
contactRouter.get("/list", async (req, res) => {
  return listEnquiries(req.query || {}, res);
});

/** GET /api/contact/all — alias used by some admin list pages */
contactRouter.get("/all", async (req, res) => {
  return listEnquiries({ ...(req.query || {}), page: 1, limit: 100 }, res);
});

/** GET /api/contact — same list at the collection root */
contactRouter.get("/", async (req, res) => {
  return listEnquiries(req.query || {}, res);
});

/** GET /api/contact/:id — admin enquiry detail */
contactRouter.get("/:id", async (req, res) => {
  try {
    const item = await findEnquiry(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Enquiry not found" });
    }
    return res.status(200).json({
      message: "Contact enquiry",
      data: toEnquiryResponse(item),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load enquiry",
      error: error?.message || String(error),
    });
  }
});

/** PUT /api/contact/:id/status — mark new / read / closed */
contactRouter.put("/:id/status", async (req, res) => {
  try {
    const status = String(req.body?.status || "").trim().toLowerCase();
    if (!["new", "read", "closed"].includes(status)) {
      return res.status(400).json({ message: "Status must be new, read, or closed." });
    }
    const item = await findEnquiry(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Enquiry not found" });
    }
    item.status = status;
    await item.save();
    return res.status(200).json({
      message: "Enquiry status updated",
      data: toEnquiryResponse(item),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update enquiry status",
      error: error?.message || String(error),
    });
  }
});

/** DELETE /api/contact/:id */
contactRouter.delete("/:id", async (req, res) => {
  try {
    const item = await findEnquiry(req.params.id);
    if (!item) {
      return res.status(404).json({ message: "Enquiry not found" });
    }
    if (item.attachment) {
      const relative = String(item.attachment).replace(/^\/+/, "");
      const filePath = path.join(__dirname, "..", relative);
      fs.unlink(filePath, () => {});
    }
    await item.deleteOne();
    return res.status(200).json({
      message: "Enquiry deleted",
      id: item.id,
      _id: item._id,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete enquiry",
      error: error?.message || String(error),
    });
  }
});

module.exports = contactRouter;
