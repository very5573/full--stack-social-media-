import sendMessageService from "../services/message.service.js";
import Message from "../models/Messagemodel.js";
import Conversation from "../models/Conversationmodel.js";
const messageSocket = (io, socket) => {
  
  socket.on("sendMessage", async ({ receiverId, text, conversationId }, callback) => {
    try {
      if (!receiverId || !text || !conversationId) {
        return callback?.({ error: "Invalid payload" });
      }

      // Save message securely using socket.userId
      const result = await sendMessageService({
        senderId: socket.userId,
        receiverId,
        text,
        conversationId,
      });

      const {
        message,
        receiverId: actualReceiverId,
        conversationId: convId,
        isNew,
      } = result;

      const payload = { message, conversationId: convId, isNew };

      // 🔹 Emit to RECEIVER (user room)
      io.to(actualReceiverId.toString()).emit("newMessage", payload);

      // 🔹 Emit to SENDER (self live update)
      io.to(socket.userId.toString()).emit("newMessage", payload);

      callback?.(payload);
    } catch (err) {
      console.error("❌ sendMessage socket error:", err);
      callback?.({ error: err.message });
    }
  });

  // ===================== JOIN / LEAVE CONVERSATION =====================
  socket.on("joinConversation", (conversationId) => {
    if (!conversationId) return;
    socket.join(conversationId.toString());
    console.log("👥 Joined conversation room:", conversationId);
  });

  socket.on("leaveConversation", (conversationId) => {
    if (!conversationId) return;
    socket.leave(conversationId.toString());
    console.log("🚪 Left conversation room:", conversationId);
  });

  // ===================== MARK MESSAGE AS READ (BLUE TICK) =====================
  socket.on("markMessageRead", async ({ conversationId, messageIds }) => {
    if (!conversationId || !Array.isArray(messageIds) || !messageIds.length) return;

    try {
      // 1️⃣ Update DB (only receiver can mark read)
      const updateResult = await Message.updateMany(
        {
          _id: { $in: messageIds },
          receiverId: socket.userId,
          read: false,
        },
        { $set: { read: true } }
      );

      const readCount = updateResult.modifiedCount || 0;

      if (!readCount) return;

      // 2️⃣ Emit to CONVERSATION ROOM (sender + receiver)
      io.to(conversationId.toString()).emit("messageRead", {
        conversationId,
        messageIds,
        readerId: socket.userId,
      });

      // 3️⃣ Optional confirmation to reader only
      socket.emit("messageReadConfirmed", {
        conversationId,
        messageIds,
        readCount,
      });
    } catch (err) {
      console.error("❌ markMessageRead error:", err);
    }
  });
};

export default messageSocket;
