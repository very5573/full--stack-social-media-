import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import socket from "../../utils/socket";
import { store } from "../../redux/store"; // ✅ named import

// Redux slices
import { addLocalNotification } from "../../redux/slices/notificationSlice";
import {
  addIncomingMessage,
  addConversationIfNotExists,
  setConversationMessages,
  addRequest,
  acceptConversationSuccess,
  rejectConversationSuccess,
} from "../../redux/slices/conversationSlice";
import {
  userOnline,
  userOffline,
  userOnlineSnapshot,
  setTyping,
  markMessagesReadUI,
} from "../../redux/slices/realtimeSlice";

export default function GlobalSocketListener() {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth.user);
  const userId = currentUser?._id || currentUser?.id;

  const typingTimeoutRef = useRef({});

  useEffect(() => {
    if (!userId) return;

    if (!socket.connected) {
      socket.auth = { userId };
      socket.connect();
    } else {
      handleConnect();
    }

    // ================= Handlers =================
    const handleNewMessage = ({ message, conversation }) => {
      if (!message) return;

      // 1️⃣ Pehle conversation ko redux me ensure karo
      if (conversation?._id) {
        dispatch(
          addConversationIfNotExists({
            ...conversation,
            force: true, // 🔥 important
          }),
        );
      }

      // 2️⃣ Ab message add karo
      dispatch(addIncomingMessage(message));
    };

    const handleNewRequest = ({ conversation }) => {
      dispatch(addRequest(conversation));
    };

    const handleRequestAccepted = ({ conversation, messages }) => {
      dispatch(acceptConversationSuccess(conversation));
      dispatch(
        setConversationMessages({
          conversationId: conversation._id,
          messages,
        }),
      );
    };

    const handleRequestRejected = ({ conversationId }) => {
      dispatch(rejectConversationSuccess(conversationId));
    };

    const handleUserOnline = ({ userId }) => dispatch(userOnline(userId));
    const handleUserOffline = ({ userId, lastSeen }) =>
      dispatch(userOffline({ userId, lastSeen }));

    const handleTyping = ({ conversationId, senderId, isTyping }) => {
      if (!conversationId || !senderId) return;
      const key = `${conversationId}_${senderId}`;

      // Clear previous timeout
      if (typingTimeoutRef.current[key]) {
        clearTimeout(typingTimeoutRef.current[key]);
      }

      dispatch(setTyping({ conversationId, senderId, isTyping }));
      dispatch(
        addLocalNotification({
          type: "typing",
          senderId,
          conversationId,
          isTyping,
        }),
      );

      // Auto turn off typing after 1.5s
      if (isTyping) {
        typingTimeoutRef.current[key] = setTimeout(() => {
          dispatch(setTyping({ conversationId, senderId, isTyping: false }));
        }, 1500);
      }
    };

    const handleMessageRead = ({ messageIds, conversationId }) => {
      if (!messageIds?.length) return;
      dispatch(
        markMessagesReadUI({
          conversationId,
          messageIds,
          readerId: userId,
        }),
      );
      dispatch(
        addLocalNotification({
          type: "read",
          conversationId,
        }),
      );
    };

    const handleUnreadMessages = ({ messages, conversations }) => {
      if (!Array.isArray(messages)) return;

      if (Array.isArray(conversations)) {
        conversations.forEach((convo) => {
          if (!convo?._id) return;

          dispatch(
            addConversationIfNotExists({
              ...convo,
              force: true,
            }),
          );
        });
      }

      messages.forEach((msg) => {
        if (!msg?._id) return;

        dispatch(
          addIncomingMessage({
            ...msg,
            conversationId: String(
              typeof msg.conversationId === "object"
                ? msg.conversationId._id
                : msg.conversationId,
            ),
          }),
        );
      });
    };

    const handleOnlineSnapshot = ({ onlineUsers }) => {
      if (!Array.isArray(onlineUsers)) return;
      dispatch(userOnlineSnapshot({ onlineUsers }));
    };
    const handleConnect = () => {
      console.log("🟢 Socket connected:", socket.id);

      socket.emit("getUnreadMessages", {
        conversationIds: store
          .getState()
          .conversation.conversations?.map((c) => c._id)
          .filter(Boolean),
      });
    };

    const handleDisconnect = (reason) =>
      console.warn("🔴 Socket disconnected:", reason);

    // ================= Listeners =================
    socket.on("newMessage", handleNewMessage);
    socket.on("newRequest", handleNewRequest);
    socket.on("requestAccepted", handleRequestAccepted);
    socket.on("requestRejected", handleRequestRejected);
    socket.on("userOnline", handleUserOnline);
    socket.on("unreadMessages", handleUnreadMessages);

    socket.on("userOffline", handleUserOffline);
    socket.on("typing", handleTyping);
    socket.on("messageRead", handleMessageRead);
    socket.on("onlineUsersSnapshot", handleOnlineSnapshot);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    // ================= Cleanup =================
    return () => {
      Object.values(typingTimeoutRef.current).forEach(clearTimeout);
      typingTimeoutRef.current = {};

      socket.off("newMessage", handleNewMessage);
      socket.off("unreadMessages", handleUnreadMessages);

      socket.off("newRequest", handleNewRequest);
      socket.off("requestAccepted", handleRequestAccepted);
      socket.off("requestRejected", handleRequestRejected);
      socket.off("userOnline", handleUserOnline);
      socket.off("userOffline", handleUserOffline);
      socket.off("typing", handleTyping);
      socket.off("messageRead", handleMessageRead);
      socket.off("onlineUsersSnapshot", handleOnlineSnapshot);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [userId, dispatch]);

  return null;
}
