const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkey_ner_logistics_2026";

// In-memory fallback store when MongoDB is not connected or in standalone demo mode
let memConversations = [
  {
    _id: "conv-demo-1",
    participants: ["demo-admin-001", "demo-ofc-001"],
    fieldOfficerId: "demo-ofc-001",
    fieldOfficerName: "Rajan Sharma (Dima Hasao)",
    relatedIncidentId: null,
    incidentSummary: "NH-2 Corridor Patrol",
    lastMessage: "Road cleared near km 114. Traffic moving slowly.",
    lastMessageAt: new Date(Date.now() - 15 * 60 * 1000),
    unreadCountAdmin: 1,
    unreadCountOfficer: 0,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    _id: "conv-demo-2",
    participants: ["demo-admin-001", "demo-ofc-002"],
    fieldOfficerId: "demo-ofc-002",
    fieldOfficerName: "Vikram Singh (Senapati)",
    relatedIncidentId: null,
    incidentSummary: "Mudslide Alert Assessment",
    lastMessage: "Site inspection underway. Requesting heavy excavator.",
    lastMessageAt: new Date(Date.now() - 45 * 60 * 1000),
    unreadCountAdmin: 0,
    unreadCountOfficer: 0,
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 45 * 60 * 1000),
  },
];

let memMessages = [
  {
    _id: "msg-demo-1",
    conversationId: "conv-demo-1",
    senderId: "demo-admin-001",
    senderName: "Command Control",
    senderRole: "ADMIN",
    text: "Officer Sharma, please confirm status of NH-2 km 114.",
    attachmentUrl: null,
    readBy: ["demo-admin-001", "demo-ofc-001"],
    createdAt: new Date(Date.now() - 25 * 60 * 1000),
  },
  {
    _id: "msg-demo-2",
    conversationId: "conv-demo-1",
    senderId: "demo-ofc-001",
    senderName: "Rajan Sharma",
    senderRole: "FIELD_OFFICER",
    text: "Road cleared near km 114. Traffic moving slowly.",
    attachmentUrl: null,
    readBy: ["demo-ofc-001"],
    createdAt: new Date(Date.now() - 15 * 60 * 1000),
  },
  {
    _id: "msg-demo-3",
    conversationId: "conv-demo-2",
    senderId: "demo-ofc-002",
    senderName: "Vikram Singh",
    senderRole: "FIELD_OFFICER",
    text: "Site inspection underway. Requesting heavy excavator.",
    attachmentUrl: null,
    readBy: ["demo-admin-001", "demo-ofc-002"],
    createdAt: new Date(Date.now() - 45 * 60 * 1000),
  },
];

// Helper to extract authenticated user
const getUserFromReq = (req) => {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      return jwt.verify(header.split(" ")[1], JWT_SECRET);
    } catch {
      // ignore
    }
  }
  // Fallback to query/headers
  const role = req.headers["x-user-role"] || req.query.role || "ADMIN";
  const userId = req.headers["x-user-id"] || req.query.userId || (role === "ADMIN" ? "demo-admin-001" : "demo-ofc-001");
  const name = req.headers["x-user-name"] || req.query.name || (role === "ADMIN" ? "Command Admin" : "Field Officer");
  return { id: userId, _id: userId, userId, role, name, firstName: name };
};

// ===========================================================================
// GET /api/chat/conversations
// ===========================================================================
exports.getConversations = async (req, res) => {
  try {
    const user = getUserFromReq(req);
    const isAdmin = user?.role === "ADMIN";

    if (mongoose.connection.readyState === 1) {
      let filter = {};
      if (!isAdmin) {
        // Field officer only sees conversations where they are participant or fieldOfficerId
        filter = {
          $or: [
            { fieldOfficerId: user._id || user.id },
            { participants: user._id || user.id },
          ],
        };
      }

      let convs = await Conversation.find(filter)
        .sort({ lastMessageAt: -1 })
        .lean();

      // If officer has no conversation yet, create one
      if (!isAdmin && convs.length === 0) {
        const newConv = await Conversation.create({
          participants: [user._id || user.id],
          fieldOfficerId: user._id || user.id,
          fieldOfficerName: user.name || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.userId || "Field Officer",
          lastMessage: "Conversation opened with Command Control Room.",
          lastMessageAt: new Date(),
        });
        convs = [newConv.toObject()];
      }

      return res.status(200).json({ success: true, conversations: convs });
    }

    // In-memory fallback
    let convs = [...memConversations];
    if (!isAdmin) {
      convs = convs.filter(c => c.fieldOfficerId === (user._id || user.id) || c.participants.includes(user._id || user.id));
      if (convs.length === 0) {
        const newConv = {
          _id: `conv-ofc-${Date.now()}`,
          participants: ["demo-admin-001", user._id || user.id],
          fieldOfficerId: user._id || user.id,
          fieldOfficerName: user.name || user.firstName || "Field Officer",
          relatedIncidentId: null,
          incidentSummary: "Live Field Support",
          lastMessage: "Channel established with Command Control.",
          lastMessageAt: new Date(),
          unreadCountAdmin: 0,
          unreadCountOfficer: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        memConversations.unshift(newConv);
        convs = [newConv];
      }
    }

    return res.status(200).json({ success: true, conversations: convs });
  } catch (error) {
    console.error("getConversations error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ===========================================================================
// POST /api/chat/conversations (Find or create conversation)
// ===========================================================================
exports.createOrGetConversation = async (req, res) => {
  try {
    const user = getUserFromReq(req);
    const { fieldOfficerId, fieldOfficerName, relatedIncidentId, incidentSummary } = req.body;

    const targetOfficerId = fieldOfficerId || (user.role === "FIELD_OFFICER" ? (user._id || user.id) : "demo-ofc-001");
    const targetOfficerName = fieldOfficerName || (user.role === "FIELD_OFFICER" ? (user.name || user.firstName) : "Field Officer");

    if (mongoose.connection.readyState === 1) {
      let query = { fieldOfficerId: targetOfficerId };
      if (relatedIncidentId) {
        query.relatedIncidentId = relatedIncidentId;
      }

      let conv = await Conversation.findOne(query);
      if (!conv) {
        conv = await Conversation.create({
          participants: [user._id || user.id, targetOfficerId],
          fieldOfficerId: targetOfficerId,
          fieldOfficerName: targetOfficerName,
          relatedIncidentId: relatedIncidentId || null,
          incidentSummary: incidentSummary || "",
          lastMessage: "Channel opened.",
          lastMessageAt: new Date(),
        });
      }

      return res.status(200).json({ success: true, conversation: conv });
    }

    // In-memory fallback
    let conv = memConversations.find(c => c.fieldOfficerId === targetOfficerId && (!relatedIncidentId || c.relatedIncidentId === relatedIncidentId));
    if (!conv) {
      conv = {
        _id: `conv-${Date.now()}`,
        participants: [user._id || user.id, targetOfficerId],
        fieldOfficerId: targetOfficerId,
        fieldOfficerName: targetOfficerName,
        relatedIncidentId: relatedIncidentId || null,
        incidentSummary: incidentSummary || "",
        lastMessage: "Channel opened.",
        lastMessageAt: new Date(),
        unreadCountAdmin: 0,
        unreadCountOfficer: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      memConversations.unshift(conv);
    }

    return res.status(200).json({ success: true, conversation: conv });
  } catch (error) {
    console.error("createOrGetConversation error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ===========================================================================
// GET /api/chat/conversations/:id/messages
// ===========================================================================
exports.getMessages = async (req, res) => {
  try {
    const user = getUserFromReq(req);
    const { id } = req.params;

    if (mongoose.connection.readyState === 1) {
      const messages = await Message.find({ conversationId: id })
        .sort({ createdAt: 1 })
        .lean();

      // Reset unread counts on the conversation
      const update = user?.role === "ADMIN" ? { unreadCountAdmin: 0 } : { unreadCountOfficer: 0 };
      if (mongoose.Types.ObjectId.isValid(id)) {
        await Conversation.findByIdAndUpdate(id, update);
      }

      return res.status(200).json({ success: true, messages });
    }

    // In-memory fallback
    const messages = memMessages.filter(m => String(m.conversationId) === String(id));
    const conv = memConversations.find(c => String(c._id) === String(id));
    if (conv) {
      if (user?.role === "ADMIN") conv.unreadCountAdmin = 0;
      else conv.unreadCountOfficer = 0;
    }

    return res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error("getMessages error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ===========================================================================
// POST /api/chat/conversations/:id/messages
// ===========================================================================
exports.sendMessage = async (req, res) => {
  try {
    const user = getUserFromReq(req);
    const { id } = req.params;
    const { text, senderName, senderRole } = req.body;

    const attachmentUrl = req.file ? `/uploads/${req.file.filename}` : null;

    if (!text && !attachmentUrl) {
      return res.status(400).json({ success: false, message: "Message must contain text or an image attachment" });
    }

    const role = senderRole || user?.role || "ADMIN";
    const name = senderName || user?.name || (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.firstName || user?.userId || (role === "ADMIN" ? "Command Admin" : "Field Officer"));
    const senderId = user?._id || user?.id || `user-${Date.now()}`;

    let savedMessage;

    if (mongoose.connection.readyState === 1) {
      savedMessage = await Message.create({
        conversationId: id,
        senderId,
        senderName: name,
        senderRole: role,
        text: text || "",
        attachmentUrl,
        readBy: [senderId],
      });

      // Update conversation
      const summary = text || "📷 Photo attached";
      const incField = role === "ADMIN" ? { unreadCountOfficer: 1 } : { unreadCountAdmin: 1 };
      if (mongoose.Types.ObjectId.isValid(id)) {
        await Conversation.findByIdAndUpdate(id, {
          lastMessage: summary,
          lastMessageAt: new Date(),
          $inc: incField,
        });
      }
    } else {
      // In-memory fallback
      savedMessage = {
        _id: `msg-${Date.now()}-${Math.round(Math.random() * 1000)}`,
        conversationId: id,
        senderId,
        senderName: name,
        senderRole: role,
        text: text || "",
        attachmentUrl,
        readBy: [senderId],
        createdAt: new Date(),
      };
      memMessages.push(savedMessage);

      const conv = memConversations.find(c => String(c._id) === String(id));
      if (conv) {
        conv.lastMessage = text || "📷 Photo attached";
        conv.lastMessageAt = new Date();
        if (role === "ADMIN") conv.unreadCountOfficer = (conv.unreadCountOfficer || 0) + 1;
        else conv.unreadCountAdmin = (conv.unreadCountAdmin || 0) + 1;
      }
    }

    // Broadcast via socket.io
    const io = req.app.get("io");
    if (io) {
      io.to(`conversation:${id}`).emit("chat_message", savedMessage);
      io.emit("new_chat_message", { conversationId: id, message: savedMessage });
    }

    return res.status(201).json({ success: true, message: savedMessage });
  } catch (error) {
    console.error("sendMessage error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
