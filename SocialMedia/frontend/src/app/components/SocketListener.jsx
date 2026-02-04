import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import socket from "../../utils/socket";

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
  messageRead,
} from "../../redux/slices/realtimeSlice";

export default function GlobalSocketListener() {
  const dispatch = useDispatch();
  const currentUser = useSelector((state) => state.auth.user);
  const userId = currentUser?._id || currentUser?.id;

  // 🔹 typing debounce refs (NEW – but non-breaking)
  const typingTimeoutRef = useRef({});

  useEffect(() => {
    if (!userId) return;

    if (!socket.connected) {
      socket.auth = { userId };
      socket.connect();
    }

    // ================= HANDLERS =================

    const handleNewMessage = ({ message, conversation }) => {
      if (!message) return;

      dispatch(addIncomingMessage(message));
      if (conversation.status === "accepted") {
        dispatch(addConversationIfNotExists(conversation));
      }
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
        })
      );
    };

    


    const handleRequestRejected = ({ conversationId }) => {
      dispatch(rejectConversationSuccess(conversationId));
    };

    const handleUserOnline = ({ userId }) => dispatch(userOnline(userId));

    const handleUserOffline = ({ userId, lastSeen }) =>
      dispatch(userOffline({ userId, lastSeen }));

   const handleTyping = ({ conversationId, senderId, isTyping }) => {
  if (!conversationId || !senderId) {
    console.warn("Typing event ignored: missing conversationId or senderId", { conversationId, senderId });
    return;
  }

  const key = `${conversationId}_${senderId}`;

  // 🔹 Clear previous timeout if exists
  if (typingTimeoutRef.current[key]) {
    console.log(`Clearing existing typing timeout for ${key}`);
    clearTimeout(typingTimeoutRef.current[key]);
  }

  console.log(`Typing event received:`, { conversationId, senderId, isTyping });

  // 🔹 Update typing state immediately
  dispatch(setTyping({ conversationId, senderId, isTyping }));
  console.log(`Dispatching setTyping for ${key}:`, isTyping);

  dispatch(
    addLocalNotification({
      type: "typing",
      senderId,
      conversationId,
      isTyping,
    })
  );
  console.log(`Dispatching addLocalNotification for typing:`, { conversationId, senderId, isTyping });

  // 🔹 Auto turn OFF typing after 1.5s
  if (isTyping) {
    typingTimeoutRef.current[key] = setTimeout(() => {
      console.log(`Typing timeout expired for ${key}, turning off typing`);
      dispatch(setTyping({ conversationId, senderId, isTyping: false }));
    }, 1500);
  }
};

    const handleMessageRead = ({ messageId, conversationId, readerId }) => {
      dispatch(messageRead({ conversationId, messageId, readerId }));
      dispatch(
        addLocalNotification({
          type: "read",
          conversationId,
          readerId,
        })
      );
    };

    const handleOnlineSnapshot = ({ onlineUsers }) => {
      if (!Array.isArray(onlineUsers)) return;
      dispatch(userOnlineSnapshot({ onlineUsers }));
    };

    const handleConnect = () =>
      console.log("🟢 Socket connected:", socket.id);

    const handleDisconnect = (reason) =>
      console.warn("🔴 Socket disconnected:", reason);
    

    // ================= LISTENERS =================
    socket.on("newMessage", handleNewMessage);
    socket.on("newRequest", handleNewRequest);
    socket.on("requestAccepted", handleRequestAccepted);
    socket.on("requestRejected", handleRequestRejected);
    socket.on("userOnline", handleUserOnline);
    socket.on("userOffline", handleUserOffline);
    socket.on("onlineUsersSnapshot", handleOnlineSnapshot);
    socket.on("typing", handleTyping);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    // ================= CLEANUP =================
    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("newRequest", handleNewRequest);
      socket.off("requestAccepted", handleRequestAccepted);
      socket.off("requestRejected", handleRequestRejected);
      socket.off("userOnline", handleUserOnline);
      socket.off("userOffline", handleUserOffline);
      socket.off("onlineUsersSnapshot", handleOnlineSnapshot);
      socket.off("typing", handleTyping);
      socket.off("messageRead", handleMessageRead);

      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [userId, dispatch]);

  return null;
}
