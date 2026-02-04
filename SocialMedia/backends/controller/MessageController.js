








import mongoose from "mongoose"; 
import User from "../models/userModel.js"; // सही path अपने project structure के अनुसार

import Message from "../models/Messagemodel.js";
import Conversation from "../models/Conversationmodel.js";
export const createOrGetChat = async (req, res) => {
  const { receiverId } = req.body;
  const senderId = req.user._id;

  if (!receiverId) {
    return res.status(400).json({ message: "receiverId required" });
  }

  try {
    let conversation = await Conversation.findOne({
      members: { $all: [senderId, receiverId] },
    })
      .populate("members", "name avatar lastSeen")
      .populate("lastMessage");

    if (!conversation) {
      conversation = await Conversation.create({
        members: [senderId, receiverId],
        status: "pending",
        initiatedBy: senderId,
      });

      conversation = await Conversation.findById(conversation._id)
        .populate("members", "name avatar lastSeen")
        .populate("lastMessage");
    }

    res.status(200).json({
      conversation,
    });
  } catch (err) {
    console.error("🔥 createOrGetChat ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "Invalid conversationId" });
    }

    const conversation = await Conversation.findById(conversationId).populate(
      "members",
      "name avatar.url isOnline lastSeen"
    );

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // 🔹 ONLY FETCH (NO READ UPDATE HERE)
    const messages = await Message.find({ conversationId })
      .populate("senderId", "name avatar.url isOnline lastSeen")
      .populate("receiverId", "name avatar.url isOnline lastSeen")
      .sort({ createdAt: 1 })
      .lean();

    res.status(200).json({ messages });
  } catch (err) {
    console.error("❌ getMessages ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};


export const deleteMessagesForEveryone = async (req, res) => {
  try {
    const { messageIds } = req.body;
    const userId = req.user._id;

    const messages = await Message.find({ _id: { $in: messageIds } });
    if (!messages.length) {
      return res.status(404).json({ message: "No messages found" });
    }

    // 🔐 Only sender can delete
    const unauthorized = messages.filter(
      (msg) => msg.senderId.toString() !== userId.toString()
    );
    if (unauthorized.length) {
      return res
        .status(403)
        .json({ message: "Not allowed to delete some messages" });
    }

    // 🗑 Delete from DB
    await Message.deleteMany({ _id: { $in: messageIds } });

    // 🔥 Emit LIVE update (FIXED)
    const groupedByConversation = messages.reduce((acc, msg) => {
      const convId = msg.conversationId.toString();
      if (!acc[convId]) acc[convId] = [];
      acc[convId].push(msg._id);
      return acc;
    }, {});

    Object.entries(groupedByConversation).forEach(
      ([conversationId, ids]) => {
        global.io.to(conversationId).emit("messageDeleted", {
          conversationId, // ✅ MUST
          messageIds: ids,
        });
      }
    );

    res.status(200).json({
      success: true,
      message: "Selected messages deleted for everyone",
    });
  } catch (err) {
    console.error("❌ deleteMessagesForEveryone:", err);
    res.status(500).json({ error: err.message });
  }
};


export const markMessagesRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "Invalid conversationId" });
    }

    // 1️⃣ Unread messages find karo
    const unreadMessages = await Message.find({
      conversationId,
      receiverId: userId,
      read: false,
    });

    if (unreadMessages.length === 0) {
      return res.status(200).json({ success: true, readCount: 0 });
    }

    const messageIds = unreadMessages.map((m) => m._id);

    // 2️⃣ DB update
    await Message.updateMany(
      { _id: { $in: messageIds } },
      { $set: { read: true } }
    );

    // 3️⃣ 🔥 SOCKET EMIT TO SENDERS
    unreadMessages.forEach((msg) => {
      io.to(msg.senderId.toString()).emit("messageRead", {
        messageId: msg._id.toString(),
        conversationId: msg.conversationId.toString(),
        readerId: userId.toString(),
      });
    });

    res.status(200).json({
      success: true,
      readCount: messageIds.length,
    });
  } catch (err) {
    console.error("❌ markMessagesRead ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, text, conversationId } = req.body;
    if (!senderId || !text) {
      return res.status(400).json({ message: "senderId and text required" });
    }

    let conversation;
    let isNew = false;

    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
      if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    } else {
      conversation = await Conversation.findOne({
        members: { $all: [senderId, receiverId] },
      });

      if (!conversation) {
        conversation = await Conversation.create({
          members: [senderId, receiverId],
          status: "pending",
          initiatedBy: senderId,
        });
        isNew = true;
      }
    }

    const actualReceiverId =
      receiverId || conversation.members.find(id => id.toString() !== senderId);

    let message = await Message.create({
      conversationId: conversation._id,
      senderId,
      receiverId: actualReceiverId,
      text,
      read: false,
    });

    message = await Message.findById(message._id)
      .populate("senderId", "name avatar.url")
      .populate("receiverId", "name avatar.url");

    conversation.lastMessage = text;
    await conversation.save();

    conversation = await Conversation.findById(conversation._id)
      .populate("members", "name avatar.url");

    if (global.io) {
      global.io.to(senderId.toString()).emit("newMessage", { message, conversation });
      global.io.to(actualReceiverId.toString()).emit("newMessage", { message, conversation });
      global.io.to(conversation._id.toString()).emit("newMessage", { message, conversation });

      if (isNew && conversation.status === "pending") {
        global.io.to(actualReceiverId.toString()).emit("newRequest", { conversation });
      }
    }

    res.status(201).json({ message, conversation });
  } catch (err) {
    console.error("❌ SEND MESSAGE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};


export const getUserConversations = async (req, res) => {
  try {
    const { userId } = req.params;

    // 1️⃣ Fetch accepted conversations
    const conversations = await Conversation.find({
      members: userId,
      status: "accepted",
    }).populate({
      path: "members",
      select: "name avatar isOnline lastSeen",
    });

    res.status(200).json({ conversations });
  } catch (err) {
    console.error("❌ getUserConversations error:", err);
    res.status(500).json({ error: err.message });
  }
};

// ---------------------------
// 5️⃣ Get pending requests
// ---------------------------
export const getPendingRequests = async (req, res) => {
  try {
    const { userId } = req.params;
    const requests = await Conversation.find({
      members: userId,
      status: "pending",
      initiatedBy: { $ne: userId },
    }).populate("members", "name avatar");
    res.status(200).json({ requests });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ---------------------------
// ACCEPT CONVERSATION
// ---------------------------
export const acceptConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    conversation.status = "accepted";
    await conversation.save();

    const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });

    res.status(200).json({ conversation, messages });
  } catch (err) {
    console.error("❌ ACCEPT CONVERSATION ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

// ---------------------------
// REJECT CONVERSATION
// ---------------------------
export const rejectConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findByIdAndUpdate(
      conversationId,
      { status: "rejected" },
      { new: true }
    );

    res.status(200).json({ message: "Request rejected", conversation });
  } catch (err) {
    console.error("❌ REJECT CONVERSATION ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};
