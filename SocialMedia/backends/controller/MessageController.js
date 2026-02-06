








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


export const deleteSelectedMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId, messageIds } = req.body;

    if (!conversationId || !messageIds?.length) {
      return res.status(400).json({ message: "Invalid data" });
    }

    await Message.updateMany(
      {
        _id: { $in: messageIds },
        conversationId,
      },
      {
        $addToSet: { deletedFor: userId }, // 🔥 only this user
      }
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("❌ deleteForMe error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const deleteMessagesForEveryone = async (req, res) => {
  try {
    const { messageIds } = req.body;
    const userId = req.user._id;

    if (!messageIds?.length) {
      return res.status(400).json({ message: "No messageIds provided" });
    }

    // 1️⃣ Fetch messages
    const messages = await Message.find({ _id: { $in: messageIds } });
    if (!messages.length) {
      return res.status(404).json({ message: "No messages found" });
    }

    // 2️⃣ Allow ONLY messages sent by current user
    const allowedMessages = messages.filter(
      (msg) => msg.senderId.toString() === userId.toString()
    );

    if (!allowedMessages.length) {
      return res.status(403).json({
        message: "You can only delete your own messages for everyone",
      });
    }

    const allowedIds = allowedMessages.map((m) => m._id);

    // 3️⃣ Delete ONLY allowed messages
    await Message.deleteMany({ _id: { $in: allowedIds } });

    // 4️⃣ Group deleted messages by conversation
    const groupedByConversation = allowedMessages.reduce((acc, msg) => {
      const convId = msg.conversationId.toString();
      if (!acc[convId]) acc[convId] = [];
      acc[convId].push(msg._id.toString());
      return acc;
    }, {});

    // 5️⃣ Emit socket event to all members
    for (const [conversationId, ids] of Object.entries(groupedByConversation)) {
      const conversation = await Conversation.findById(conversationId)
        .select("members")
        .lean();

      if (!conversation) continue;

      conversation.members.forEach((memberId) => {
        global.io.to(memberId.toString()).emit("messageDeleted", {
          conversationId,
          messageIds: ids,
        });
      });
    }

    res.status(200).json({
      success: true,
      deletedCount: allowedIds.length,
      message: "Messages deleted for everyone",
    });
  } catch (err) {
    console.error("❌ deleteMessagesForEveryone:", err);
    res.status(500).json({ error: err.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user._id;

    // 🔐 Validate conversationId
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return res.status(400).json({ message: "Invalid conversationId" });
    }

    // 🔎 Check conversation exists
    const conversation = await Conversation.findById(conversationId).populate(
      "members",
      "name avatar.url isOnline lastSeen"
    );

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // 📩 Fetch messages
    // ❌ hide messages deleted FOR THIS USER
    // ❌ no read update here
    const messages = await Message.find({
      conversationId,
      deletedFor: { $ne: userId }, // 🗑 delete for me logic
    })
      .populate("senderId", "name avatar.url isOnline lastSeen")
      .populate("receiverId", "name avatar.url isOnline lastSeen")
      .sort({ createdAt: 1 })
      .lean();

    return res.status(200).json({
      conversation,
      messages,
    });
  } catch (err) {
    console.error("❌ getMessages ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};


export const markMessagesRead = async (req, res) => {
  try {
    const { conversationId, messageIds } = req.body;
    const userId = req.user._id;

    if (!conversationId || !Array.isArray(messageIds) || !messageIds.length) {
      return res.status(200).json({ success: true });
    }

    // ✅ ONLY specific messages
    await Message.updateMany(
      {
        _id: { $in: messageIds },
        receiverId: userId,
        read: false,
      },
      { $set: { read: true } }
    );

    // 🔔 Emit read receipt
    const conversation = await Conversation.findById(conversationId)
      .select("members")
      .lean();

    if (conversation) {
      conversation.members.forEach((memberId) => {
        if (memberId.toString() !== userId.toString()) {
          global.io.to(memberId.toString()).emit("messageRead", {
            conversationId: conversationId.toString(),
            messageIds,
            readerId: userId.toString(),
          });
        }
      });
    }

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
    const { text, conversationId, receiverId } = req.body;
    const senderId = req.user._id; // 🔐 TRUST SERVER ONLY

    if (!text) {
      return res.status(400).json({ message: "Text is required" });
    }

    let conversation;
    let isNew = false;

    // 1️⃣ Get or create conversation
    if (conversationId) {
      conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
    } else {
      if (!receiverId) {
        return res.status(400).json({ message: "receiverId required" });
      }

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

    // 2️⃣ Security: sender must be member
    const isMember = conversation.members.some(
      (id) => id.toString() === senderId.toString()
    );
    if (!isMember) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // 3️⃣ Resolve receiver
    const actualReceiverId = conversation.members.find(
      (id) => id.toString() !== senderId.toString()
    );

    // 4️⃣ Save message (NO SOCKET HERE)
    let message = await Message.create({
      conversationId: conversation._id,
      senderId,
      receiverId: actualReceiverId,
      text,
      read: false,
      delivered: false,
    });

    message = await Message.findById(message._id)
      .populate("senderId", "name avatar.url")
      .populate("receiverId", "name avatar.url");

    // 5️⃣ Update conversation meta
    conversation.lastMessage = text;
    await conversation.save();

    const populatedConversation = await Conversation.findById(
      conversation._id
    ).populate("members", "name avatar.url");

    // ❌ NO SOCKET EMIT HERE
    // 🔥 Socket sendMessage event already handles realtime

    res.status(201).json({
      success: true,
      message,
      conversation: populatedConversation,
      isNew,
    });
  } catch (err) {
    console.error("❌ SEND MESSAGE API ERROR:", err);
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
