import API from "../../../utils/axiosInstance";
import socket from "../../../utils/socket";
import {
  addConversationIfNotExists,
  setConversationMessages,
} from "../../../redux/slices/conversationSlice";
import { setTyping } from "../../../redux/slices/realtimeSlice";

export const handleChatInputLogic = {
  // =========================
  // ✍️ TYPING LOGIC (UNCHANGED)
  // =========================
  handleTyping: ({
    value,
    setText,
    dispatch,
    userId,
    selectedConversationId,
    otherUser,
    typingTimeoutRef,
  }) => {
    setText(value);

    if (!selectedConversationId || !otherUser) return;

    dispatch(
      setTyping({
        conversationId: selectedConversationId,
        senderId: userId,
        isTyping: true,
      })
    );

    if (socket.connected) {
      socket.emit("typing", {
        conversationId: selectedConversationId,
        senderId: userId,
        isTyping: true,
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      dispatch(
        setTyping({
          conversationId: selectedConversationId,
          senderId: userId,
          isTyping: false,
        })
      );

      if (socket.connected) {
        socket.emit("typing", {
          conversationId: selectedConversationId,
          senderId: userId,
          isTyping: false,
        });
      }
    }, 2000);
  },

  // =========================
  // 📩 SEND MESSAGE LOGIC (FIXED)
  // =========================
  handleSend: async ({
    text,
    setText,
    dispatch,
    userId,
    selectedConversationId,
    otherUser,
  }) => {
    if (!text.trim()) return;
    if (!otherUser && !selectedConversationId) {
      console.warn("No receiver selected, cannot send message!");
      return;
    }

    const payload = {
      senderId: userId,
      receiverId: otherUser?._id,
      text,
      conversationId: selectedConversationId || undefined,
    };

    try {
      // ✅ PRIMARY → SOCKET ONLY
      if (socket.connected) {
        socket.emit("sendMessage", payload, () => {
          // ❗ Redux update yahan SE REMOVE kar diya
          // Redux update ab sirf "newMessage" socket listener karega

          setText("");

          if (selectedConversationId && otherUser) {
            dispatch(
              setTyping({
                conversationId: selectedConversationId,
                senderId: userId,
                isTyping: false,
              })
            );

            socket.emit("typing", {
              conversationId: selectedConversationId,
              senderId: userId,
              isTyping: false,
            });
          }
        });
      } 
      // =========================
      // 🔄 FALLBACK → API (UNCHANGED)
      // =========================
      else {
        const { data } = await API.post("/message", payload);

        // ❗ API fallback me Redux update REHNE DO
        dispatch(addConversationIfNotExists(data.conversation));
        dispatch(
          setConversationMessages({
            conversationId: data.conversation._id,
            messages: [data.message],
          })
        );

        setText("");

        if (selectedConversationId && otherUser) {
          dispatch(
            setTyping({
              conversationId: selectedConversationId,
              senderId: userId,
              isTyping: false,
            })
          );
        }
      }
    } catch (err) {
      console.error("❌ Send message error:", err.response?.data || err);
    }
  },

  // =========================
  // 🧹 CLEANUP (UNCHANGED)
  // =========================
  cleanup: ({ dispatch, userId, selectedConversationId, otherUser }) => {
    if (selectedConversationId && otherUser) {
      dispatch(
        setTyping({
          conversationId: selectedConversationId,
          senderId: userId,
          isTyping: false,
        })
      );

      if (socket.connected) {
        socket.emit("typing", {
          conversationId: selectedConversationId,
          senderId: userId,
          isTyping: false,
        });
      }
    }
  },
};
