const express = require("express");
const CMSPage = require("../schema/cmspage");
const mongoose = require("mongoose");

const cmsPageRouter = express.Router();

// ── HELPER: Generate slug from title ─────────────────────────────────────────
const generateSlug = (title) => {
  return String(title)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]/g, "")
    .replace(/\-+/g, "-")
    .replace(/^\-|\-$/g, "");
};

// ── GET /api/cms/all ─────────────────────────────────────────────────────────
cmsPageRouter.get("/all", async (req, res) => {
  try {
    const list = await CMSPage.find().sort({ createdAt: -1 }).lean();
    return res.json(list);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error fetching CMS pages",
      error: error.message,
    });
  }
});

// ── GET /api/cms/:id or /:slug ───────────────────────────────────────────────
cmsPageRouter.get("/:identifier", async (req, res) => {
  try {
    const { identifier } = req.params;

    let item = null;

    // Only search by _id if identifier is a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(identifier)) {
      item = await CMSPage.findById(identifier).lean();
    }

    // Otherwise search by slug
    if (!item) {
      item = await CMSPage.findOne({
        slug: identifier.toLowerCase(),
      }).lean();
    }

    if (!item) {
      return res.status(404).json({
        message: "CMS Page not found",
      });
    }

    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching CMS page",
      error: error.message,
    });
  }
});
// ── POST /api/cms/add ────────────────────────────────────────────────────────
cmsPageRouter.post("/add", async (req, res) => {
  try {
    const { page_title, page_description, status } = req.body;

    // Validation
    if (!page_title || String(page_title).trim() === "") {
      return res.status(400).json({ message: "page_title is required" });
    }

    if (!page_description || String(page_description).trim() === "") {
      return res.status(400).json({ message: "page_description is required" });
    }

    // Generate slug
    const slug = generateSlug(page_title);

    // Check if slug already exists
    const existingSlug = await CMSPage.findOne({ slug });
    if (existingSlug) {
      return res.status(400).json({
        message: "A page with this title already exists",
      });
    }

    const item = await CMSPage.create({
      page_title: String(page_title).trim(),
      slug: slug,
      page_description: String(page_description).trim(),
      status:
        status && ["active", "inactive"].includes(String(status).toLowerCase())
          ? String(status).toLowerCase()
          : "active",
    });

    res.status(201).json({
      message: "CMS Page created successfully",
      data: item,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating CMS page",
      error: error.message,
    });
  }
});

// ── PUT /api/cms/edit/:id ────────────────────────────────────────────────────
cmsPageRouter.put("/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { page_title, page_description, status } = req.body;

    if (!id) {
      return res.status(400).json({ message: "ID is required" });
    }

    // Check if page exists
    const existingPage = await CMSPage.findById(id);
    if (!existingPage) {
      return res.status(404).json({ message: "CMS Page not found" });
    }

    const update = {};

    // Update page_title and slug if provided
    if (page_title !== undefined && String(page_title).trim() !== "") {
      const newSlug = generateSlug(page_title);

      // Check if new slug conflicts with other pages
      if (newSlug !== existingPage.slug) {
        const conflictSlug = await CMSPage.findOne({ slug: newSlug });
        if (conflictSlug) {
          return res.status(400).json({
            message: "A page with this title already exists",
          });
        }
        update.slug = newSlug;
      }

      update.page_title = String(page_title).trim();
    }

    if (
      page_description !== undefined &&
      String(page_description).trim() !== ""
    ) {
      update.page_description = String(page_description).trim();
    }

    if (
      status !== undefined &&
      ["active", "inactive"].includes(String(status).toLowerCase())
    ) {
      update.status = String(status).toLowerCase();
    }

    const updated = await CMSPage.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    }).lean();

    res.status(200).json({
      message: "CMS Page updated successfully",
      data: updated,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating CMS page",
      error: error.message,
    });
  }
});

// ── DELETE /api/cms/delete ───────────────────────────────────────────────────
cmsPageRouter.delete("/delete", async (req, res) => {
  try {
    const { ids } = req.body;

    const idList = Array.isArray(ids) ? ids : ids != null ? [ids] : [];
    if (idList.length === 0) {
      return res.status(400).json({
        message: 'ids array is required (e.g. ids: ["id1", "id2"])',
      });
    }

    const result = await CMSPage.deleteMany({
      _id: { $in: idList },
    });
    const deletedCount = result.deletedCount || 0;

    res.status(200).json({
      message:
        deletedCount === 0
          ? "No CMS pages found to delete"
          : `${deletedCount} CMS page(s) deleted successfully`,
      deletedCount,
      ids: idList,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting CMS pages",
      error: error.message,
    });
  }
});

module.exports = cmsPageRouter;
