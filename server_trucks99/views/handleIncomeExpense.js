const express = require("express");
const IncomeExpense = require("../schema/incomeExpense");
const IncomeExpenseCategory = require("../schema/incomeExpenseCategory");
const Log = require("../schema/log");
const User = require("../schema/user"); // ← ADD THIS
const {
  findByIdOrUuid,
  resolveToObjectId,
  resolveIdsToObjectIds,
  toResponse,
  toResponseList,
} = require("../helpers/uuidHelper");

const incomeExpenseRouter = express.Router();
const entityName = "Income/Expense";

// ── GET /api/income-expense/all ──────────────────────────────────────────────
incomeExpenseRouter.get("/all", async (req, res) => {
  try {
    const query = {};

    console.log(req.user.roleId.status);

    if (req.user.roleId.status !== "admin") {
      query.userId = req.user._id;
    }

    const list = await IncomeExpense.find(query)
      .populate("categoryId", "id categoryName type status")
      .sort({ createdAt: -1 })
      .lean();

    const normalized = list.map((doc) => {
      const out = toResponse(doc);

      if (doc.categoryId && typeof doc.categoryId === "object") {
        out.category = toResponse(doc.categoryId);
        out.category_id = doc.categoryId.id || doc.categoryId._id?.toString();
      } else {
        out.category_id = doc.categoryId?.toString?.() || doc.categoryId;
      }

      return out;
    });

    return res.json(normalized);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Error fetching Income/Expense entries",
      error: error.message,
    });
  }
});
// ── GET /api/income-expense/:id ──────────────────────────────────────────────
incomeExpenseRouter.get("/:id", async (req, res) => {
  try {
    const item = await findByIdOrUuid(IncomeExpense, req.params.id);
    if (!item)
      return res.status(404).json({ message: `${entityName} not found` });

    const populated = await IncomeExpense.findById(item._id)
      .populate("categoryId", "id categoryName type status")
      .lean();

    const out = toResponse(populated || item);
    if (populated?.categoryId && typeof populated.categoryId === "object") {
      out.category = toResponse(populated.categoryId);
      out.category_id =
        populated.categoryId.id || populated.categoryId._id?.toString();
    } else {
      out.category_id =
        (populated || item).categoryId?.toString?.() ||
        (populated || item).categoryId;
    }

    res.status(200).json(out);
  } catch (error) {
    res
      .status(500)
      .json({ message: `Error fetching ${entityName}`, error: error.message });
  }
});

// ── POST /api/income-expense/add ─────────────────────────────────────────────
incomeExpenseRouter.post("/add", async (req, res) => {
  try {
    const { type, category_id, remarks, amount, user, requestingUser } =
      req.body;

    // JWT user takes priority, then body fallbacks (same pattern as load router)
    const actor = req.user || user || requestingUser || {};

    if (!type || !["income", "expense"].includes(String(type).toLowerCase())) {
      return res
        .status(400)
        .json({ message: "type is required and must be income or expense" });
    }
    if (!category_id) {
      return res.status(400).json({ message: "category_id is required" });
    }

    const categoryObjectId = await resolveToObjectId(
      IncomeExpenseCategory,
      category_id,
    );
    if (!categoryObjectId)
      return res.status(400).json({ message: "Category not found" });

    const amountNum = amount != null ? Number(amount) : 0;
    if (isNaN(amountNum))
      return res.status(400).json({ message: "amount must be a number" });

    // Resolve actor userId (ObjectId)
    const actorIdRaw = actor._id ?? actor.id ?? null;
    const resolvedActorId = actorIdRaw
      ? await resolveToObjectId(User, String(actorIdRaw).trim())
      : null;

    const item = await IncomeExpense.create({
      type: String(type).toLowerCase(),
      categoryId: categoryObjectId,
      remarks: remarks != null ? String(remarks).trim() : "",
      amount: amountNum,
      userId: resolvedActorId || undefined, // ← who created it
      userName: actor.name || undefined,
    });

    const populated = await IncomeExpense.findById(item._id)
      .populate("categoryId", "id categoryName type status")
      .lean();

    const out = toResponse(populated || item);
    if (populated?.categoryId && typeof populated.categoryId === "object") {
      out.category = toResponse(populated.categoryId);
      out.category_id =
        populated.categoryId.id || populated.categoryId._id?.toString();
    } else {
      out.category_id = item.categoryId?.toString?.();
    }

    await new Log({
      name: actor.name || "unknown",
      email: actor.mobile || "unknown",
      role: actor.role || "unknown",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `added ${entityName}: ${item.type} amount ${item.amount} (${item._id})`,
    }).save();

    res.status(201).json({
      message: `${entityName} created successfully`,
      incomeExpense: out,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: `Error creating ${entityName}`, error: error.message });
  }
});

// ── PUT /api/income-expense/edit/:id ─────────────────────────────────────────
incomeExpenseRouter.put("/edit/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { type, category_id, remarks, amount, user, requestingUser } =
      req.body;
    const actor = req.user || user || requestingUser || {};

    if (!id) return res.status(400).json({ message: "ID is required" });
    if (!type || !["income", "expense"].includes(String(type).toLowerCase())) {
      return res
        .status(400)
        .json({ message: "type is required and must be income or expense" });
    }
    if (!category_id)
      return res.status(400).json({ message: "category_id is required" });

    const resolvedId = await resolveToObjectId(IncomeExpense, id);
    if (!resolvedId)
      return res.status(404).json({ message: `${entityName} not found` });

    const categoryObjectId = await resolveToObjectId(
      IncomeExpenseCategory,
      category_id,
    );
    if (!categoryObjectId)
      return res.status(400).json({ message: "Category not found" });

    const amountNum = amount != null ? Number(amount) : undefined;
    if (amount !== undefined && amount !== null && isNaN(amountNum)) {
      return res.status(400).json({ message: "amount must be a number" });
    }

    const update = {
      type: String(type).toLowerCase(),
      categoryId: categoryObjectId,
      remarks: remarks != null ? String(remarks).trim() : undefined,
    };
    if (amount !== undefined && amount !== null) update.amount = Number(amount);

    const updated = await IncomeExpense.findByIdAndUpdate(resolvedId, update, {
      new: true,
      runValidators: true,
    })
      .populate("categoryId", "id categoryName type status")
      .lean();

    if (!updated)
      return res.status(404).json({ message: `${entityName} not found` });

    const out = toResponse(updated);
    if (updated.categoryId && typeof updated.categoryId === "object") {
      out.category = toResponse(updated.categoryId);
      out.category_id =
        updated.categoryId.id || updated.categoryId._id?.toString();
    } else {
      out.category_id = updated.categoryId?.toString?.();
    }

    await new Log({
      name: actor.name || "unknown",
      email: actor.mobile || "unknown",
      role: actor.role || "unknown",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `updated ${entityName}: ${updated.type} (${id})`,
    }).save();

    res.status(200).json({
      message: `${entityName} updated successfully`,
      incomeExpense: out,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: `Error updating ${entityName}`, error: error.message });
  }
});

// ── DELETE /api/income-expense/delete ────────────────────────────────────────
incomeExpenseRouter.delete("/delete", async (req, res) => {
  try {
    const { ids, user, requestingUser } = req.body;
    const actor = req.user || user || requestingUser || {};

    const idList = Array.isArray(ids) ? ids : ids != null ? [ids] : [];
    if (idList.length === 0)
      return res
        .status(400)
        .json({ message: 'ids array is required (e.g. ids: ["id1", "id2"])' });

    const resolvedIds = await resolveIdsToObjectIds(IncomeExpense, idList);
    const result = await IncomeExpense.deleteMany({
      _id: { $in: resolvedIds },
    });
    const deletedCount = result.deletedCount || 0;

    await new Log({
      name: actor.name || "unknown",
      email: actor.mobile || "unknown",
      role: actor.role || "unknown",
      timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
      action: `deleted ${deletedCount} ${entityName} entry(ies): ${idList.join(", ")}`,
    }).save();

    res.status(200).json({
      message:
        deletedCount === 0
          ? `No ${entityName} entries found to delete`
          : `${deletedCount} ${entityName} entry(ies) deleted successfully`,
      deletedCount,
      ids: idList,
    });
  } catch (error) {
    res.status(500).json({
      message: `Error deleting ${entityName} entries`,
      error: error.message,
    });
  }
});

module.exports = incomeExpenseRouter;
