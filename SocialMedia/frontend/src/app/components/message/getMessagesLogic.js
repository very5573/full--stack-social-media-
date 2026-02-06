import API from "../../../utils/axiosInstance";
import { setConversationMessages } from "../../../redux/slices/conversationSlice";

export const getMessages = async ({
  conversationId,
  dispatch,
  userId,
  setLoading,
}) => {
  if (!conversationId) return;

  try {
    setLoading(true);

    const res = await API.get(`/messages/${conversationId}`);

    // 🔹 Serialize & sort messages by createdAt ascending (oldest → newest)
    const serialized = res.data.messages
      .map((m) => ({
        ...m,
        createdAt: new Date(m.createdAt).toISOString(),
        read: m.read ?? false, // 🔥 IMPORTANT
      }))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    dispatch(
      setConversationMessages({
        conversationId,
        messages: serialized,
      })
    );

  } catch (err) {
    console.error("❌ Fetch messages error:", err);
  } finally {
    setLoading(false);
  }
};
