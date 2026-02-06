import API from "../../../utils/axiosInstance";

export const handleMessageRead = async ({
  messages,
  conversationId,
  userId,
}) => {
  if (!conversationId || !messages?.length) return;

  // ✅ Sirf receiver ke unread messages
  const unreadMessageIds = messages
    .filter(
      (msg) =>
        String(msg.receiverId?._id) === userId && !msg.read
    )
    .map((msg) => msg._id);

  if (!unreadMessageIds.length) return;

  // ✅ messageIds bhejo
  await API.post(`/messages/read`, {
    conversationId,
    messageIds: unreadMessageIds,
  });
};
