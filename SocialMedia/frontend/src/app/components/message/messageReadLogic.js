import socket from "../../../utils/socket";
import { messageRead } from "../../../redux/slices/realtimeSlice";

export const handleMessageRead = ({ messages, conversationId, userId, dispatch }) => {
  if (!conversationId || !messages.length) return;

  messages.forEach((msg) => {
    const isReceiver = String(msg.receiverId?._id) === userId && !msg.read;

    if (isReceiver) {
      // 🔥 Notify backend
      socket.emit("markMessageRead", {
        messageId: msg._id,
      });

      // ✅ Update Redux immediately for UI tick
      dispatch(
        messageRead({
          conversationId,
          messageId: msg._id,
          readerId: userId,
        })
      );
    }
  });
};
