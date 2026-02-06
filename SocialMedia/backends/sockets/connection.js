import { Server } from "socket.io";
import Conversation from "../models/Conversationmodel.js";
import Message from "../models/Messagemodel.js";
import User from "../models/userModel.js";

// Map to track online users & their multiple tabs
const onlineUsers = new Map();

export const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    },
  });

  // Middleware to set socket.userId from auth
  io.use((socket, next) => {
    const { userId } = socket.handshake.auth;
    if (!userId) return next(new Error("Invalid user"));
    socket.userId = userId;
    next();
  });

  io.on("connection", async (socket) => {
    const userId = socket.userId;
    console.log("⚡ Socket connected:", socket.id, "userId:", userId);

    socket.join(userId.toString()); // personal room

    // ===============================
    // 🟢 ONLINE USER (MULTI TAB SAFE)
    // ===============================
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, { sockets: new Set() });

      io.emit("userOnline", { userId });

      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: null,
      });
    }

    onlineUsers.get(userId).sockets.add(socket.id);

    socket.emit("onlineUsersSnapshot", {
      onlineUsers: Array.from(onlineUsers.keys()),
    });

    // ===============================
    // 🏠 JOIN CONVERSATION
    // ===============================
    socket.on("joinConversation", (conversationId) => {
      if (!conversationId) return;
      socket.join(conversationId.toString());
    });
    socket.on("leaveConversation", (conversationId) => {
  socket.leave(conversationId.toString());
});


 // ===============================
// 📩 SEND MESSAGE (FINAL)
// ===============================
socket.on(
  "sendMessage",
  async ({ senderId, receiverId, text, conversationId }, callback) => {
    try {
      // 0️⃣ Basic validation
      if (!text || !senderId) return;

      // 🔐 Enforce sender from socket (ANTI SPOOF)
      if (senderId.toString() !== socket.userId.toString()) return;

      let conversation;
      let isNew = false;

      // 1️⃣ Get or create conversation
      if (conversationId) {
        conversation = await Conversation.findById(conversationId);
      } else {
        if (!receiverId) return;

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

      if (!conversation) return;

      // 2️⃣ Security: sender must be part of conversation
      const isMember = conversation.members.some(
        (id) => id.toString() === senderId.toString()
      );
      if (!isMember) return;

      // 3️⃣ Resolve receiver (always OTHER member)
      const actualReceiverId = conversation.members.find(
        (id) => id.toString() !== senderId.toString()
      );

      if (!actualReceiverId) return;

      // 4️⃣ Save message
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

      // 5️⃣ Update conversation meta
      await Conversation.findByIdAndUpdate(conversation._id, {
        lastMessage: text,
      });

      // 6️⃣ Populate members for emit
      const populatedConversation = await Conversation.findById(
        conversation._id
      ).populate("members", "name avatar.url");

      // 7️⃣ Safe message object
      const safeMsg = {
        ...message._doc,
        createdAt: message.createdAt.toISOString(),
        updatedAt: message.updatedAt?.toISOString(),
      };

      // 8️⃣ Emit once per user (personal room)
      populatedConversation.members.forEach((member) => {
        io.to(member._id.toString()).emit("newMessage", {
          message: safeMsg,
          conversation: populatedConversation,
        });
      });

      // 9️⃣ New request notification (only once)
      if (isNew && populatedConversation.status === "pending") {
        io.to(actualReceiverId.toString()).emit("newRequest", {
          conversation: populatedConversation,
        });
      }

      // 🔟 Callback success
      if (callback) {
        callback({
          message: safeMsg,
          conversation: populatedConversation,
          isNew,
        });
      }
    } catch (err) {
      console.error("❌ sendMessage error:", err);
      if (callback) callback({ error: "Message send failed" });
    }
  }
);

    // ===============================
    // ✅ ACCEPT CONVERSATION
    // ===============================
    socket.on("acceptConversation", async (conversationId) => {
      try {
        const conversation = await Conversation.findByIdAndUpdate(
          conversationId,
          { status: "accepted" },
          { new: true },
        ).populate("members", "name avatar.url");

        const messages = await Message.find({ conversationId })
          .sort({ createdAt: 1 })
          .populate("senderId", "name avatar.url")
          .populate("receiverId", "name avatar.url");

        await Message.updateMany(
          { conversationId, read: false },
          { $set: { read: true } },
        );

        const safeMessages = messages.map((msg) => ({
          ...msg._doc,
          createdAt: msg.createdAt.toISOString(),
          updatedAt: msg.updatedAt?.toISOString(),
        }));

        conversation.members.forEach((m) => {
          io.to(m._id.toString()).emit("requestAccepted", {
            conversation,
            messages: safeMessages,
          });
        });
      } catch (err) {
        console.error("❌ acceptConversation error:", err);
      }
    });


    socket.on("getUnreadMessages", async ({ conversationIds }) => {
  try {
    const messages = await Message.find({
      conversationId: { $in: conversationIds },
      receiverId: socket.userId,
      read: false,
    })
      .populate("senderId", "name avatar.url")
      .populate("receiverId", "name avatar.url");

    const conversations = await Conversation.find({
      _id: { $in: conversationIds },
    }).populate("members", "name avatar.url");

    socket.emit("unreadMessages", {
      messages,
      conversations,
    });
  } catch (err) {
    console.error("❌ getUnreadMessages error:", err);
  }
});

    // ===============================
// ❌ REJECT CONVERSATION (FINAL)
// ===============================
socket.on("rejectConversation", async (conversationId) => {
  try {
    if (!conversationId) return;

    const conversation = await Conversation.findByIdAndUpdate(
      conversationId,
      { status: "rejected" },
      { new: true },
    ).populate("members", "name avatar.url");

    if (!conversation) return;
conversation.members.forEach((member) => {
  io.to(member._id.toString()).emit("requestRejected", {
    conversationId: conversation._id.toString(),
  });
});

  } catch (err) {
    console.error("❌ rejectConversation error:", err);
  }
});
// ===============================
// ✍️ TYPING INDICATOR (FINAL)
// ===============================
socket.on("typing", async ({ conversationId, senderId, isTyping }) => {
  try {
    if (!conversationId || !senderId) return;

    // 1️⃣ Fetch only members (minimal query)
    const conversation = await Conversation.findById(conversationId)
      .select("members")
      .lean();

    if (!conversation) return;

    // 2️⃣ Security: sender must be part of conversation
    const isMember = conversation.members.some(
      (id) => id.toString() === senderId.toString()
    );
    if (!isMember) return;

    // 3️⃣ Emit typing to OTHER members only
    conversation.members.forEach((memberId) => {
      if (memberId.toString() !== senderId.toString()) {
        io.to(memberId.toString()).emit("typing", {
          conversationId: conversationId.toString(),
          senderId: senderId.toString(),
          isTyping: Boolean(isTyping),
        });
      }
    });
  } catch (err) {
    console.error("❌ typing event error:", err);
  }
});

    socket.on("disconnect", () => {
      if (!onlineUsers.has(userId)) return;

      const data = onlineUsers.get(userId);
      data.sockets.delete(socket.id);

      setTimeout(async () => {
        if (data.sockets.size === 0) {
          const lastSeen = new Date();
          onlineUsers.delete(userId);
          await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
          io.emit("userOffline", { userId, lastSeen });
        }
      }, 2000);
    });
  });

  return io;
};

export default initSocket;