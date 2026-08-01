"use strict";

const express = require("express");
const LegalDocument = require("../schema/legalDocument");
const {
  LEGAL_DOCUMENTS,
  normalizeLegalType,
  formatLegalResponse,
} = require("../data/legalDocuments");

const legalRouter = express.Router();

async function ensureLegalDocument(type) {
  let doc = await LegalDocument.findOne({ type, status: "active" }).lean();
  if (doc) return doc;

  const seed = LEGAL_DOCUMENTS.find((item) => item.type === type);
  if (!seed) return null;

  doc = await LegalDocument.findOneAndUpdate(
    { type },
    { ...seed, status: "active" },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean();

  return doc;
}

async function fetchLegalByType(rawType) {
  const type = normalizeLegalType(rawType);
  if (!type) return { error: "Invalid type. Use terms or privacy." };
  const doc = await ensureLegalDocument(type);
  if (!doc) return { error: "Legal document not found" };
  return { data: formatLegalResponse(doc) };
}

/** GET /api/legal/:type — public read (terms | privacy) */
legalRouter.get("/:type", async (req, res) => {
  try {
    const result = await fetchLegalByType(req.params.type);
    if (result.error) {
      return res.status(400).json({ message: result.error });
    }
    return res.status(200).json({
      message: "Legal document fetched successfully",
      data: result.data,
    });
  } catch (error) {
    console.error("[Legal GET]", error);
    return res.status(500).json({
      message: "Failed to fetch legal document",
      error: error?.message || String(error),
    });
  }
});

/**
 * POST /api/legal — public read via JSON body
 * Body: { "type": "terms" | "privacy" | "terms-and-conditions" | "privacy-policy" }
 */
legalRouter.post("/", async (req, res) => {
  try {
    const rawType = req.body?.type;
    if (!rawType) {
      return res.status(400).json({
        message: 'type is required (e.g. "terms", "privacy", "terms-and-conditions", "privacy-policy")',
      });
    }

    const result = await fetchLegalByType(rawType);
    if (result.error) {
      return res.status(400).json({ message: result.error });
    }

    return res.status(200).json({
      message: "Legal document fetched successfully",
      data: result.data,
    });
  } catch (error) {
    console.error("[Legal POST]", error);
    return res.status(500).json({
      message: "Failed to fetch legal document",
      error: error?.message || String(error),
    });
  }
});

/**
 * PUT /api/legal/:type — admin update (requires auth via global middleware)
 * Body: { title?, subtitle?, sections?, contactEmail?, contactLabel?, status? }
 */
legalRouter.put("/:type", async (req, res) => {
  try {
    const type = normalizeLegalType(req.params.type);
    if (!type) {
      return res.status(400).json({ message: "Invalid type. Use terms or privacy." });
    }

    const { title, subtitle, intro, sections, contactEmail, contactLabel, status } = req.body || {};
    const update = {};

    if (title !== undefined && String(title).trim()) {
      update.title = String(title).trim();
    }
    if (subtitle !== undefined) {
      update.subtitle = String(subtitle).trim();
    }
    if (intro !== undefined) {
      update.intro = String(intro).trim();
    }
    if (Array.isArray(sections) && sections.length > 0) {
      update.sections = sections.map((section, index) => ({
        number: Number(section.number) || index + 1,
        title: String(section.title || "").trim(),
        content: String(section.content || "").trim(),
        bullets: Array.isArray(section.bullets)
          ? section.bullets.map((item) => String(item).trim()).filter(Boolean)
          : [],
      }));
    }
    if (contactEmail !== undefined && String(contactEmail).trim()) {
      update.contactEmail = String(contactEmail).trim();
    }
    if (contactLabel !== undefined) {
      update.contactLabel = String(contactLabel).trim();
    }
    if (status !== undefined && ["active", "inactive"].includes(String(status).toLowerCase())) {
      update.status = String(status).toLowerCase();
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    await ensureLegalDocument(type);

    const updated = await LegalDocument.findOneAndUpdate({ type }, update, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      return res.status(404).json({ message: "Legal document not found" });
    }

    return res.status(200).json({
      message: "Legal document updated successfully",
      data: formatLegalResponse(updated),
    });
  } catch (error) {
    console.error("[Legal PUT]", error);
    return res.status(500).json({
      message: "Failed to update legal document",
      error: error?.message || String(error),
    });
  }
});

module.exports = legalRouter;
