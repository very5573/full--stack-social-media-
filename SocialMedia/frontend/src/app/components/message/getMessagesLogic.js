import API from "../../../utils/axiosInstance";
import { setConversationMessages } from "../../../redux/slices/conversationSlice";
import { messageRead } from "../../../redux/slices/realtimeSlice";

export const getMessages = async ({ conversationId, dispatch, userId, setLoading }) => {
  if (!conversationId) return;

  try {
    setLoading(true);

    const res = await API.get(`/messages/${conversationId}`);
    const serialized = res.data.messages.map((m) => ({
      ...m,
      createdAt: new Date(m.createdAt).toISOString(),
    }));

    dispatch(
      setConversationMessages({
        conversationId,
        messages: serialized,
      })
    );

    // Mark messages as read in backend
    await API.post(`/messages/read/${conversationId}`);

    // Update Redux read state for unread messages
    serialized
      .filter((m) => String(m.receiverId?._id) === userId && !m.read)
      .forEach((m) => {
        dispatch(
          messageRead({
            conversationId,
            messageId: m._id,
            readerId: userId,
          })
        );
      });

    setLoading(false);
  } catch (err) {
    console.error("❌ Fetch messages error:", err);
    setLoading(false);
  }
};