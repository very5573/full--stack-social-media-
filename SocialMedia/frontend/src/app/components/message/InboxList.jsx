"use client";

import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import API from "../../../utils/axiosInstance";
import socket from "../../../utils/socket";

import {
  setSelectedConversationId,
  addConversationIfNotExists,
  resetConversationState,
} from "../../../redux/slices/conversationSlice";

export default function InboxList({ onSelectChat }) {
  const dispatch = useDispatch();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef(null);

  // ================= AUTH =================
  const currentUser = useSelector((state) => state.auth?.user);
  const userId = String(currentUser?._id || currentUser?.id);

  // ================= REDUX =================
  const selectedConversationId = useSelector(
    (state) => state.conversation.selectedConversationId
  );

  const conversations = useSelector(
    (state) => state.conversation.conversations
  );

  const typingUsers = useSelector(
    (state) => state.realtime.typingUsers
  );

  // ================= HELPERS =================
  const getSenderId = (senderId) =>
    typeof senderId === "object" ? senderId._id : senderId;

  // ================= 🔥 FETCH INBOX =================
  useEffect(() => {
    if (!userId) return;

    dispatch(resetConversationState());

    const fetchInbox = async () => {
      try {
        setLoading(true);

        const { data } = await API.get(`/conversations/${userId}`);

        // 1️⃣ Redux me conversations update
        (data?.conversations || []).forEach((c) =>
          dispatch(addConversationIfNotExists(c))
        );

        // 2️⃣ Local messages state update (lastMessage from each conversation)
        const allMessages = [];
        (data?.conversations || []).forEach((c) => {
          if (c.lastMessage) {
            allMessages.push(c.lastMessage);
          }
        });

        setMessages(allMessages); // 🔥 messages state update
      } catch (err) {
        console.error("❌ Failed to fetch conversations:", err);
      } finally {
        setLoading(false);
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    };

    fetchInbox();
  }, [userId, dispatch]);

  // ================= 🔌 SOCKET JOIN / LEAVE =================
  useEffect(() => {
    if (!selectedConversationId) return;

    socket.emit("joinConversation", selectedConversationId);

    return () => {
      socket.emit("leaveConversation", selectedConversationId);
    };
  }, [selectedConversationId]);

  

useEffect(() => {
  const handleNewMessage = ({ message }) => {
    console.log("📨 New message received:", message);

    // 1️⃣ Add or replace message in local state
    setMessages((prev) => {
      const others = prev.filter((m) => m._id !== message._id);
      return [...others, message];
    });

    // ❌ Removed auto mark as read logic from InboxList
    // Blue tick will now only be handled in ChatScreen

    // 2️⃣ Scroll to bottom
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  socket.on("newMessage", handleNewMessage);
  return () => socket.off("newMessage", handleNewMessage);
}, [userId]);

  // ================= UI =================
  const inboxConversations = conversations.filter((c) => c.status === "accepted");

  if (!inboxConversations.length) {
    return <div className="p-4 text-sm text-gray-400">No conversations yet</div>;
  }

  const formatTime = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      {conversations.map((conv) => {
        const otherUser = conv.members?.find((m) => String(m._id) !== userId);
        if (!otherUser) return null;

        const isActive = conv._id === selectedConversationId;
        const isTyping = typingUsers?.[conv._id]?.[String(otherUser._id)];

        // 🔹 Find the latest message for this conversation from messages state
        const convMessages = messages.filter(
          (m) => m.conversationId === conv._id || (conv.lastMessage && m._id === conv.lastMessage._id)
        );
        const latestMsg = convMessages.length ? convMessages[convMessages.length - 1] : conv.lastMessage;

        const lastMsg = latestMsg?.text || "Start conversation";
        const lastTime = formatTime(latestMsg?.createdAt || conv.lastMessageAt);

        return (
          <div key={conv._id} className="border-b border-black/20">
            <div
              onClick={() => {
                dispatch(setSelectedConversationId(conv._id));
                onSelectChat?.(conv);
              }}
              className={`flex items-center gap-3 px-3 sm:px-4 py-3 cursor-pointer transition ${
                isActive ? "bg-[#202c33]" : "hover:bg-[#1f2c34]"
              }`}
            >
              {/* 🖼️ AVATAR */}
              <img
                src={otherUser.avatar?.url || "/default-avatar.png"}
                alt={otherUser.name}
                className="w-11 h-11 rounded-full object-cover shrink-0"
              />

              {/* 📄 TEXT AREA */}
              <div className="flex-1 min-w-0">
                {/* NAME + TIME */}
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium text-white truncate">{otherUser.name}</p>
                  <span className="text-[11px] text-gray-400 shrink-0">{lastTime}</span>
                </div>

                {/* LAST MESSAGE */}
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {isTyping ? <span className="text-[#00a884]">typing…</span> : lastMsg}
                </p>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
