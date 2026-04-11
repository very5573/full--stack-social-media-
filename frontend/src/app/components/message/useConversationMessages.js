import { useEffect, useRef, useState, useCallback } from "react";
import socket from "../../../utils/socket";
import { getMessages } from "./getMessagesLogic";

export const useConversationMessages = (conversationId, userId) => {

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [otherUserState, setOtherUserState] = useState(null);

  const messagesMapRef = useRef(new Map());

  const messagesContainerRef = useRef(null);
  const isUserAtBottomRef = useRef(true);

  const rebuildMessages = () => {
    const arr = Array.from(messagesMapRef.current.values());

    arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    setMessages(arr);
  };

  // -------------------- FETCH INITIAL MESSAGES --------------------

  useEffect(() => {
    if (!conversationId) return;

    setLoading(true);

    const fetchMessages = async () => {
      try {

        const data = await getMessages({ conversationId });
        if (!data) return;

        const map = new Map();

        (data.messages || []).forEach((m) => {
          map.set(String(m._id), m);
        });

        messagesMapRef.current = map;

        rebuildMessages();

        const other = data.conversation.members.find(
          (m) => String(m._id) !== String(userId)
        );

        if (other) setOtherUserState(other);

      } catch (err) {
        console.error("Failed to fetch messages:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

  }, [conversationId, userId]);

  // -------------------- SOCKET JOIN --------------------

  useEffect(() => {

    if (!conversationId) return;

    socket.emit("joinConversation", conversationId);

    return () => socket.emit("leaveConversation", conversationId);

  }, [conversationId]);

  // -------------------- SOCKET EVENTS --------------------

  useEffect(() => {

    if (!conversationId || !userId) return;

    // DELIVERED
    const handleDelivered = ({ conversationId: convId, messageIds }) => {

      if (String(convId) !== String(conversationId)) return;

      messageIds.forEach((id) => {

        const msg = messagesMapRef.current.get(String(id));

        if (msg && String(msg.senderId) === String(userId)) {
          messagesMapRef.current.set(String(id), {
            ...msg,
            delivered: true
          });
        }

      });

      rebuildMessages();
    };

    // READ
    const handleRead = ({ conversationId: convId, messageIds, readerId }) => {

      if (
        String(convId) !== String(conversationId) ||
        String(readerId) === String(userId)
      )
        return;

      messageIds.forEach((id) => {

        const msg = messagesMapRef.current.get(String(id));

        if (msg && String(msg.senderId) === String(userId)) {
          messagesMapRef.current.set(String(id), {
            ...msg,
            read: true
          });
        }

      });

      rebuildMessages();
    };

    // NEW M

    const handleNewMessage = ({ message, conversationId: convId }) => {
  // 1️⃣ Check if this message belongs to current conversation
  if (String(convId) !== String(conversationId)) return;

  // 2️⃣ Directly set message in Map (full DB object)
  messagesMapRef.current.set(String(message._id), message);

  // 3️⃣ Rebuild UI/messages list
  rebuildMessages();

  // 4️⃣ Only for messages where current user is the receiver
  if (String(message.receiverId) !== String(userId)) return;

  const messageIds = [message._id];

  // 5️⃣ Emit delivered event to sender
  socket.emit("messageDelivered", {
    conversationId: convId,
    messageIds
  });

  // 6️⃣ If message is unread, mark it as read
  if (!message.read) {
    socket.emit("markMessageRead", {
      conversationId: convId,
      messageIds
    });

    // 7️⃣ Update Map locally to reflect delivered + read
    const msg = messagesMapRef.current.get(String(message._id));
    messagesMapRef.current.set(String(message._id), {
      ...msg,
      delivered: true,
      read: true
    });

    // 8️⃣ Rebuild UI again
    rebuildMessages();
  }
};     
    // 

    const handleUnread = ({ messages: incomingMessages }) => {
  // 1️⃣ Validate input
  if (!Array.isArray(incomingMessages) || !incomingMessages.length) return;

  // 2️⃣ Filter only messages for current user
  const filtered = incomingMessages.filter(
    (m) => String(m.receiverId?._id || m.receiverId) === String(userId)
  );

  if (!filtered.length) return;

  // 3️⃣ Collect message IDs for delivered/read updates
  const messageIds = filtered.map((m) => m._id);

  // 4️⃣ Directly set each message in Map (full DB object)
  filtered.forEach((m) => {
    messagesMapRef.current.set(String(m._id), {
      ...m,           // DB object already complete
      delivered: true,
      read: true
    });
  });

  // 5️⃣ Rebuild UI/messages list
  rebuildMessages();

  // 6️⃣ Emit socket events to mark delivered and read
  socket.emit("messageDelivered", {
    conversationId,
    messageIds
  });

  socket.emit("markMessageRead", {
    conversationId,
    messageIds
  });
};

    // DELETE
    const handleDeleted = ({ conversationId: convId, messageIds }) => {

      if (String(convId) !== String(conversationId)) return;

      messageIds.forEach((id) => {
        messagesMapRef.current.delete(String(id));
      });

      rebuildMessages();
    };

    socket.on("messageDelivered", handleDelivered);
    socket.on("messageRead", handleRead);
    socket.on("newMessage", handleNewMessage);
    socket.on("messageDeleted", handleDeleted);
    socket.on("unreadMessages", handleUnread);

    socket.emit("getUnreadMessages", { conversationIds: [conversationId] });

    return () => {
      socket.off("messageDelivered", handleDelivered);
      socket.off("messageRead", handleRead);
      socket.off("newMessage", handleNewMessage);
      socket.off("messageDeleted", handleDeleted);
      socket.off("unreadMessages", handleUnread);
    };

  }, [conversationId, userId]);

  // -------------------- SCROLL --------------------

  const scrollToBottom = useCallback((smooth = true) => {

    const container = messagesContainerRef.current;

    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: smooth ? "smooth" : "auto"
    });

  }, []);

  useEffect(() => {

    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {

      const threshold = 80;

      const distance =
        container.scrollHeight -
        container.scrollTop -
        container.clientHeight;

      isUserAtBottomRef.current = distance < threshold;

    };

    container.addEventListener("scroll", handleScroll);

    return () => container.removeEventListener("scroll", handleScroll);

  }, []);

  useEffect(() => {
    if (isUserAtBottomRef.current) scrollToBottom(true);
  }, [messages, scrollToBottom]);

  useEffect(() => {
    requestAnimationFrame(() => scrollToBottom(false));
  }, [conversationId, scrollToBottom]);

  return {
    messages,
    setMessages,
    loading,
    otherUserState,
    messagesContainerRef,
    scrollToBottom
  };
};