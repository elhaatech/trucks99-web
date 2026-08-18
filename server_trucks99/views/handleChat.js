const express = require("express");
const ChatRoom = require("../schema/chatRoom");
const ChatMessage = require("../schema/chatMessage");
const BuySellProduct = require("../schema/buysellProduct");
const User = require("../schema/user"); // ⚠️ adjust path/filename to match your actual User schema
const Log = require("../schema/log");
const { findByIdOrUuid, resolveToObjectId } = require("../helpers/uuidHelper");

const chatRouter = express.Router();
const entityName = "Chat";

function getActor(req) {
  const user = req.user || {};
  return {
    id: user._id || user.id || null,
    name: user.name || "unknown",
    email: user.email || "unknown",
    mobile: user.mobile || "unknown",
    role: extractRoleName(user),
  };
}

/** `role` may be a plain string ("admin") or, depending on your User schema,
 *  a populated Role document ({ name: "Admin" }) / any object with a
 *  name-ish field. Normalise to a lowercase string either way.
 *  ⚠️ ADJUST if your Role schema uses a different field name than
 *  `name` / `role_name` / `slug`. */
function extractRoleName(user) {
  const role = user?.role;
  if (!role) return "unknown";
  if (typeof role === "string") return role;
  if (typeof role === "object") {
    return String(role.name || role.role_name || role.slug || role.title || "unknown");
  }
  return String(role);
}

/** ⚠️ ADJUST this set to match the exact role strings your app uses
 *  (e.g. add "superadmin", "super admin", whatever your DB actually stores). */
const ADMIN_ROLES = new Set(["admin", "superadmin", "super_admin", "super admin", "super-admin"]);

function isAdmin(actor) {
  return ADMIN_ROLES.has(String(actor.role || "").toLowerCase().trim());
}

function isParticipant(room, userId) {
  const uid = String(userId);
  return String(room.sellerId) === uid || String(room.buyerId) === uid;
}

/** Admin can access any room. Everyone else must be the buyer or seller of it. */
function canAccessRoom(room, actor) {
  return isAdmin(actor) || isParticipant(room, actor.id);
}

// ─── UNREAD COUNT ───────────────────────────────────────────────────────────
async function computeUnreadCount(room, viewerId, viewerIsAdmin = false) {
  const uid = String(viewerId);
  const isSeller = String(room.sellerId) === uid;
  const isBuyer = String(room.buyerId) === uid;

  // Admin isn't the buyer or seller, so there's no per-admin read marker on
  // this room — showing the buyer's or seller's unread state to an admin
  // would be misleading. Extend the schema with an adminLastReadAt-style
  // field if a real per-admin unread count is needed later.
  if (!isSeller && !isBuyer) {
    return 0;
  }

  const lastReadAt = isSeller ? room.sellerLastReadAt : room.buyerLastReadAt;

  const query = { roomId: room._id, senderId: { $ne: viewerId } };
  if (lastReadAt) query.createdAt = { $gt: lastReadAt };

  return ChatMessage.countDocuments(query);
}

// ─── ENRICHMENT ─────────────────────────────────────────────────────────────
async function buildRoomResponse(room, viewerId, viewerIsAdmin = false) {
  const [product, seller, buyer, unreadCount] = await Promise.all([
    BuySellProduct.findById(room.productId)
      .select("bsNumber vehicleId description price images status")
      .lean(),
    User.findById(room.sellerId).select("name email mobile").lean(),
    User.findById(room.buyerId).select("name email mobile").lean(),
    computeUnreadCount(room, viewerId, viewerIsAdmin),
  ]);

  return {
    id: room.id,
    _id: room._id,
    roomId: room._id,
    productId: room.productId,
    product: product
      ? {
          _id: product._id,
          bsNumber: product.bsNumber || null,
          vehicleId: product.vehicleId || null,
          title: product.description || "",
          price: product.price,
          image: product.images && product.images.length ? product.images[0] : null,
          images: product.images || [],
          status: product.status,
        }
      : null,
    sellerId: room.sellerId,
    buyerId: room.buyerId,
    seller: seller
      ? { _id: seller._id, name: seller.name, email: seller.email, mobile: seller.mobile }
      : null,
    buyer: buyer
      ? { _id: buyer._id, name: buyer.name, email: buyer.email, mobile: buyer.mobile }
      : null,
    lastMessage: room.lastMessage || "",
    lastMessageAt: room.lastMessageAt || null,
    unreadCount,
    status: room.status,
    createdAt: room.createdAt,
    updatedAt: room.updatedAt,
  };
}

// ─── CREATE OR GET ROOM ─────────────────────────────────────────────────────
// POST /api/chat/create   body: { productId }
// sellerId / buyerId are NEVER trusted from the client — sellerId always comes
// from the product's owner, buyerId always comes from req.user.
//
// Room identity is the triple {productId, sellerId, buyerId}. This means:
//  - Buyer B messaging Seller A about Product X always lands in the same room,
//    no matter how many times "Chat with Seller" is clicked.
//  - Buyer C messaging Seller A about the SAME Product X gets a DIFFERENT room,
//    because buyerId differs. Conversations between different buyers never mix.
chatRouter.post("/create", async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor.id) return res.status(401).json({ message: "Unauthorized user" });

    const { productId } = req.body;
    if (!productId) return res.status(400).json({ message: "productId is required" });

    const productDoc = await findByIdOrUuid(BuySellProduct, productId);
    if (!productDoc) return res.status(404).json({ message: "Product not found" });

    const sellerId = productDoc.userid;
    const buyerId = actor.id;

    if (String(sellerId) === String(buyerId)) {
      return res.status(400).json({ message: "You cannot start a chat on your own listing" });
    }

    let room = await ChatRoom.findOne({
      productId: productDoc._id,
      sellerId,
      buyerId,
    }).lean();

    let isNew = false;
    if (!room) {
      const created = await ChatRoom.create({
        productId: productDoc._id,
        sellerId,
        buyerId,
      });
      room = created.toObject();
      isNew = true;

      await Log.create({
        name: actor.name,
        email: actor.email,
        role: actor.role,
        action: `Started ${entityName} on product ${productDoc._id}`,
      });
    }

    const response = await buildRoomResponse(room, buyerId, isAdmin(actor));
    res.status(isNew ? 201 : 200).json({
      message: isNew ? "Chat room created" : "Chat room already exists",
      room: response,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── SEND MESSAGE ───────────────────────────────────────────────────────────
// POST /api/chat/send   body: { roomId, message }
// senderId always comes from req.user — never trusted from the body.
chatRouter.post("/send", async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor.id) return res.status(401).json({ message: "Unauthorized user" });

    const { roomId, message } = req.body;
    if (!roomId || !String(message || "").trim()) {
      return res.status(400).json({ message: "roomId and message are required" });
    }

    const resolvedRoomId = await resolveToObjectId(ChatRoom, roomId);
    if (!resolvedRoomId) return res.status(404).json({ message: "Chat room not found" });

    const room = await ChatRoom.findById(resolvedRoomId).lean();
    if (!room) return res.status(404).json({ message: "Chat room not found" });

    // Buyer/seller of THIS room may post into it. Admin has full access too —
    // note: if an admin sends a message, they aren't the room's buyer or
    // seller, so the frontend's "mine vs theirs" bubble logic (which compares
    // senderId to currentUserId) will still work for the admin's own view,
    // but the OTHER party's ChatDrawer will render the admin's message as if
    // it came from "the other party" since it only knows buyer/seller
    // identities. If admins are meant to actively chat (not just moderate/
    // view), the frontend also needs an "admin message" bubble style.
    if (!canAccessRoom(room, actor)) {
      return res.status(403).json({ message: "You are not a participant of this chat" });
    }

    const trimmedMessage = String(message).trim();

    const chatMessage = await ChatMessage.create({
      roomId: room._id,
      senderId: actor.id,
      message: trimmedMessage,
    });

    const updatedRoom = await ChatRoom.findByIdAndUpdate(
      room._id,
      { lastMessage: trimmedMessage, lastMessageAt: chatMessage.createdAt },
      { new: true },
    ).lean();

    // ── Socket.IO hook ─────────────────────────────────────────────────────
    // Wire up later with: app.set("io", io) at server startup. No-op until then.
    const io = req.app.get("io");
    if (io) {
      io.to(`chat:${room._id}`).emit("chat:message", {
        roomId: room._id,
        message: {
          id: chatMessage.id,
          _id: chatMessage._id,
          roomId: room._id,
          senderId: chatMessage.senderId,
          message: chatMessage.message,
          createdAt: chatMessage.createdAt,
        },
      });
    }

    res.status(201).json({
      message: "Message sent",
      chatMessage: {
        id: chatMessage.id,
        _id: chatMessage._id,
        roomId: room._id,
        senderId: chatMessage.senderId,
        message: chatMessage.message,
        createdAt: chatMessage.createdAt,
      },
      room: await buildRoomResponse(updatedRoom, actor.id, isAdmin(actor)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── GET MESSAGES ───────────────────────────────────────────────────────────
// GET /api/chat/messages/:roomId
// Returns the FULL message history for the room — both buyer and seller
// see the exact same array, since messages are queried by roomId only,
// never filtered by senderId.
chatRouter.get("/messages/:roomId", async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor.id) return res.status(401).json({ message: "Unauthorized user" });

    const resolvedRoomId = await resolveToObjectId(ChatRoom, req.params.roomId);
    if (!resolvedRoomId) return res.status(404).json({ message: "Chat room not found" });

    const room = await ChatRoom.findById(resolvedRoomId).lean();
    if (!room) return res.status(404).json({ message: "Chat room not found" });

    // Buyer/seller of THIS room may read it. Admin has full access too.
    if (!canAccessRoom(room, actor)) {
      return res.status(403).json({ message: "You are not a participant of this chat" });
    }

    const messages = await ChatMessage.find({ roomId: room._id })
      .select("id roomId senderId senderName message createdAt")
      .sort({ createdAt: 1 })
      .lean();

    // Mark as read ONLY for an actual participant viewing their own side.
    // Previously this always wrote to sellerLastReadAt/buyerLastReadAt based
    // on a simple isSeller check that defaulted to "buyer" for anyone who
    // wasn't the seller — including admins. That meant an admin opening a
    // conversation silently marked it as "read by the buyer", even though
    // the buyer never looked at it. Now we explicitly check both sides and
    // skip the update entirely for non-participants (e.g. admin).
    const isSeller = String(room.sellerId) === String(actor.id);
    const isBuyer = String(room.buyerId) === String(actor.id);
    if (isSeller) {
      await ChatRoom.findByIdAndUpdate(room._id, { sellerLastReadAt: new Date() });
    } else if (isBuyer) {
      await ChatRoom.findByIdAndUpdate(room._id, { buyerLastReadAt: new Date() });
    }
    // else: admin viewing — no read marker to update, room state untouched.

    res.json({
      room: await buildRoomResponse(room, actor.id, isAdmin(actor)),
      messages: messages.map((m) => ({
        id: m.id,
        _id: m._id,
        roomId: m.roomId,
        senderId: m.senderId,
        message: m.message,
        createdAt: m.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ─── LIST ROOMS FOR CURRENT USER ────────────────────────────────────────────
// GET /api/chat/list
// Normal users: seller sees every room where they're the seller (every buyer
// who contacted them); buyer sees every room where they're the buyer (every
// seller they've contacted). The $or covers whichever role they're playing.
//
// Admin/Super Admin: full access, no seller/buyer filter — sees every room
// in the system. Optional query params let an admin narrow results:
//   ?productId=...   rooms for one product
//   ?sellerId=...    rooms for one seller
//   ?buyerId=...     rooms for one buyer
//   ?status=active|closed
// These filters are ignored for non-admin users (their access is already
// scoped to their own rooms regardless).
chatRouter.get("/list", async (req, res) => {
  try {
    const actor = getActor(req);
    if (!actor.id) return res.status(401).json({ message: "Unauthorized user" });

    const admin = isAdmin(actor);

    let query;
    if (admin) {
      query = {};
      const { productId, sellerId, buyerId, status } = req.query;
      if (productId) query.productId = productId;
      if (sellerId) query.sellerId = sellerId;
      if (buyerId) query.buyerId = buyerId;
      if (status) query.status = status;
    } else {
      // Security: normal users can NEVER see rooms outside this filter,
      // regardless of any query params they might pass.
      query = { $or: [{ sellerId: actor.id }, { buyerId: actor.id }] };
    }

    const rooms = await ChatRoom.find(query)
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .lean();

    const response = await Promise.all(
      rooms.map((room) => buildRoomResponse(room, actor.id, admin)),
    );
    res.json(response);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = chatRouter;