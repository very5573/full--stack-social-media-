"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import API from "../../../utils/axiosInstance";
import socket from "../../../utils/socket";

import {
  setSelectedConversationId,
  addConversationIfNotExists,
  resetConversationState,
} from "../../../redux/slices/conversationSlice";

import {
  setTyping,
  messageRead,
  userOnline,
  userOffline,
} from "../../../redux/slices/realtimeSlice";

export default function InboxList({ onSelectChat }) {
  const dispatch = useDispatch();

  const currentUser = useSelector((state) => state.auth?.user);
  const userId = String(currentUser?._id || currentUser?.id);

  const selectedConversationId = useSelector(
    (state) => state.conversation.selectedConversationId
  );

  const conversations = useSelector(
    (state) => state.conversation.conversations
  );

  const pendingRequests = useSelector(
    (state) => state.conversation.pendingRequests
  );

  const onlineUsers = useSelector((state) => state.realtime.onlineUsers);
  const typingUsers = useSelector((state) => state.realtime.typingUsers);
  const readByConversation = useSelector(
    (state) => state.realtime.readByConversation
  );

  // 🔥 RESET + FETCH INBOX WHEN USER CHANGES
  useEffect(() => {
    if (!userId) return;

    dispatch(resetConversationState());

    const fetchInbox = async () => {
      try {
        const { data } = await API.get(`/conversations/${userId}`);
        const convs = data?.conversations || [];
        const requests = data?.pendingRequests || [];

        convs.forEach((c) => dispatch(addConversationIfNotExists(c)));
        requests.forEach((r) => dispatch(addConversationIfNotExists(r)));
      } catch (err) {
        console.error("❌ Failed to fetch conversations:", err);
      }
    };

    fetchInbox();
  }, [userId, dispatch]);

  // 🔌 SOCKET LISTENERS
  useEffect(() => {
    if (!userId) return;

    const handleNewMessage = ({ message, conversation }) => {
      if (!message || !conversation) return;
      dispatch(addConversationIfNotExists(conversation));
    };

    const handleUserOnline = ({ userId }) =>
      dispatch(userOnline(userId));

    const handleUserOffline = ({ userId, lastSeen }) =>
      dispatch(userOffline({ userId, lastSeen }));

    const handleTyping = ({ conversationId, senderId, isTyping }) => {
      if (!conversationId || !senderId) return;
      dispatch(setTyping({ conversationId, senderId, isTyping }));
    };

    const handleMessageRead = ({ conversationId, messageId, readerId }) => {
      dispatch(messageRead({ conversationId, messageId, readerId }));
    };

    socket.on("newMessage", handleNewMessage);
    socket.on("userOnline", handleUserOnline);
    socket.on("userOffline", handleUserOffline);
    socket.on("typing", handleTyping);
    socket.on("messageRead", handleMessageRead);

    return () => {
      socket.off("newMessage", handleNewMessage);
      socket.off("userOnline", handleUserOnline);
      socket.off("userOffline", handleUserOffline);
      socket.off("typing", handleTyping);
      socket.off("messageRead", handleMessageRead);
    };
  }, [userId, dispatch]);

  // 🧠 HELPERS
  const getUserStatus = (otherUser) => {
    const presence = onlineUsers?.[String(otherUser._id)];
    if (presence?.online) return { isOnline: true, lastSeen: null };

    return {
      isOnline: false,
      lastSeen: presence?.lastSeen || otherUser.lastSeen || null,
    };
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const time = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const day = date.toLocaleDateString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${day} ${time}`;
  };

  // 📥 FILTER ACCEPTED CONVERSATIONS
  const inboxConversations = conversations.filter(
    (conv) => !pendingRequests.find((r) => r._id === conv._id)
  );

  if (!inboxConversations.length) {
    return (
      <div className="p-4 text-sm text-gray-400">
        No conversations yet
      </div>
    );
  }

  // 🖼️ RENDER
  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide">
      {inboxConversations.map((conv) => {
        const otherUser = conv.members?.find(
          (m) => String(m._id) !== userId
        );
        if (!otherUser) return null;

        const { isOnline, lastSeen } = getUserStatus(otherUser);
        const isActive = conv._id === selectedConversationId;

        const isTyping =
          typingUsers?.[conv._id]?.[String(otherUser._id)] || false;

        const messages = conv.messages || [];
        const lastMessage = messages[messages.length - 1];

        const hasBeenRead =
          lastMessage &&
          readByConversation?.[conv._id]?.[lastMessage._id]?.includes(userId);

        return (
          <div
            key={conv._id}
            className="flex flex-col border-b border-black/20"
          >
            <div
              onClick={() => {
                dispatch(setSelectedConversationId(conv._id));
                onSelectChat?.();
              }}
              className={`flex items-center gap-3 px-3 sm:px-4 py-3 cursor-pointer transition ${
                isActive ? "bg-[#202c33]" : "hover:bg-[#1f2c34]"
              }`}
            >
              {/* AVATAR */}
              <div className="relative shrink-0">
                <img
                  src={otherUser.avatar?.url || "/default-avatar.png"}
                  alt={otherUser.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                {isOnline && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#00a884] border-2 border-[#111b21]" />
                )}
              </div>

              {/* INFO */}
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                {/* NAME + TYPING */}
                <p className="text-sm font-medium text-white truncate flex items-center gap-1">
                  <span className="truncate">{otherUser.name}</span>
                  {isTyping && (
                    <span className="text-xs text-[#00a884] shrink-0">
                      Typing…
                    </span>
                  )}
                </p>

                {/* ONLINE / LAST SEEN */}
                {isOnline ? (
                  <p className="text-xs text-[#00a884] leading-tight">Online</p>
                ) : lastSeen ? (
                  <p className="text-xs text-gray-400 truncate leading-tight">
                    Last seen {formatDateTime(lastSeen)}
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 leading-tight">Offline</p>
                )}

                {/* LAST MESSAGE */}
                {lastMessage && (
                  <p className="text-xs text-gray-400 truncate leading-snug flex items-center gap-1">
                    <span className="truncate">{lastMessage.text}</span>
                    <span className="shrink-0 text-[10px] text-gray-500">
                      ({formatDateTime(lastMessage.createdAt)})
                    </span>
                    <span className="shrink-0 text-[10px] text-gray-500">
                      {hasBeenRead ? "✓✓ delivered" : "✓"}
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
