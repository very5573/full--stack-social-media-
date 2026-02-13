import sendMessageService from "../services/message.service.js";

const messageSocket = (io, socket) => {
  socket.on(
    "sendMessage",
    async ({ receiverId, text, conversationId }, callback) => {
      try {
        // 🔐 basic validation
        if (!receiverId || !text) {
          return callback?.({ error: "Invalid payload" });
        }

        // ✅ senderId ONLY from socket (secure)
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

        const payload = {
          message,           // raw message (with conversationId inside)
          conversationId: convId,
          isNew,
        };

        // 👉 Receiver ko
        io.to(actualReceiverId.toString()).emit("newMessage", payload);

        // 👉 Sender ko (live update for self)
        io.to(socket.userId.toString()).emit("newMessage", payload);

        // 👉 optional ack
        callback?.(payload);
      } catch (err) {
        console.error("❌ sendMessage socket error:", err);
        callback?.({ error: err.message });
      }
    }
  );
};

export default messageSocket;
