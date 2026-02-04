"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import ChatInput from "./ChatInput";
import { getMessages } from "./getMessagesLogic";
import socket from "../../../utils/socket";
import { deleteMessages } from "../../../redux/slices/conversationSlice";

import { handleMessageRead } from "./messageReadLogic";
import DoneIcon from "@mui/icons-material/Done";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MessageSelectDelete from "./Delete";
// ✅ date-time helpers
import {
  formatLastSeen,
  getDateLabel,
  formatMessageTime,
} from "./chatDateUtils";

export default function ChatScreenn({ onBack }) {
  const bottomRef = useRef(null);
  const dispatch = useDispatch();

  const currentUser = useSelector((state) => state.auth?.user);
  const userId = String(currentUser?._id || currentUser?.id);

  const conversationId = useSelector(
    (state) => state.conversation.selectedConversationId,
  );

  const messages =
    useSelector(
      (state) => state.conversation.messagesByConversation[conversationId],
    ) || [];

  const conversations = useSelector(
    (state) => state.conversation.conversations,
  );

  const onlineUsers = useSelector((state) => state.realtime.onlineUsers);
  const typingUsers = useSelector((state) => state.realtime.typingUsers);
  const readByConversation = useSelector(
    (state) => state.realtime.readByConversation,
  );

  const [loading, setLoading] = useState(false);

  // ================= OTHER USER =================
  const otherUser =
    conversations
      .find((c) => c._id === conversationId)
      ?.members.find((m) => String(m._id) !== userId) || null;

  const otherUserPresence = onlineUsers?.[otherUser?._id];
  const isOtherUserOnline = otherUserPresence?.online || false;
  const lastSeen = otherUserPresence?.lastSeen || otherUser?.lastSeen;
  const isOtherUserTyping =
    typingUsers?.[conversationId]?.[otherUser?._id] || false;

  // ================= AUTO SCROLL =================
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // ================= FETCH =================
  useEffect(() => {
    getMessages({ conversationId, dispatch, userId, setLoading });
  }, [conversationId, dispatch, userId]);
useEffect(() => {
  handleMessageRead({ messages, conversationId, userId, dispatch });
}, [messages, conversationId, userId, dispatch]);

  // ================= SCROLL =================
  useEffect(() => {
    if (messages.length > 0) scrollToBottom();
  }, [messages, scrollToBottom]);
// ================= DELETE FOR EVERYONE (LIVE) =================
useEffect(() => {
  if (!conversationId) return;

  const handleMessageDeleted = ({ conversationId: convId, messageIds }) => {
    console.log("🔥 messageDeleted event:", { convId, messageIds });

    // 🔐 sirf current chat
    if (convId !== conversationId) return;

    dispatch(
      deleteMessages({
        conversationId: convId,
        messageIds,
      })
    );
  };

  socket.on("messageDeleted", handleMessageDeleted);

  return () => {
    socket.off("messageDeleted", handleMessageDeleted);
  };
}, [conversationId, dispatch]);


  
useEffect(() => {
  if (!conversationId) return;

  // 🔥 JOIN ROOM
  socket.emit("joinConversation", conversationId);

  // 🧹 CLEANUP
  return () => {
    socket.emit("leaveConversation", conversationId); // optional
  };
}, [conversationId]);
  
  // ================= EMPTY =================
  if (!conversationId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
        <ChatBubbleOutlineIcon className="text-white text-5xl animate-bounce" />
        <p className="text-lg font-medium">Select a chat to start messaging</p>
      </div>
    );
  }

  // ================= UI =================
  return (
    <div
      className="flex flex-col h-full w-full"
      style={{
        background: "linear-gradient(160deg, #0d1117, #101921, #1b2c38)",
      }}
    >
      {/* HEADER */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#202c33]/80 backdrop-blur-xl border-b border-black/20 shadow-md">
        {/* 🔙 Mobile Back Button */}
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden text-gray-300 hover:text-white transition"
          >
            <ArrowBackIcon />
          </button>
        )}

        {/* AVATAR */}
        <div className="relative">
          <img
            src={otherUser?.avatar?.url || "/default-avatar.png"}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-gradient-to-tr from-[#53bdeb] to-[#0af7a1]"
          />
          {isOtherUserOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-black animate-pulse"></span>
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <p className="text-white font-semibold text-lg truncate">
            {otherUser?.name || "User"}
          </p>
          <p className="text-xs text-gray-300 flex flex-wrap gap-1">
            {isOtherUserTyping ? (
              <span className="animate-pulse text-[#53bdeb] font-medium">
                typing…
              </span>
            ) : isOtherUserOnline ? (
              <span className="text-[#00a884]">online</span>
            ) : lastSeen ? (
              <span>last seen {formatLastSeen(lastSeen)}</span>
            ) : (
              <span>last seen not available</span>
            )}
          </p>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-3 scrollbar-hide">
        {loading && (
          <p className="text-center text-gray-400 text-sm">Loading...</p>
        )}
        <MessageSelectDelete
          conversationId={conversationId}
          messages={messages} // ✅ full message objects
          renderMessages={(msg, { selectMode }) => {
            if (!msg) return null;

            const isMe = String(msg.senderId?._id) === userId;
            const isRead =
              isMe &&
              (msg.read || readByConversation?.[conversationId]?.[msg._id]);
            const index = messages.findIndex((m) => m._id === msg._id);

            const currentDate = new Date(msg.createdAt).toDateString();
            const prevDate =
              index > 0
                ? new Date(messages[index - 1].createdAt).toDateString()
                : null;
            const showDate = index === 0 || currentDate !== prevDate;

            return (
              <div key={msg._id}>
                {/* DATE SEPARATOR */}
                {showDate && (
                  <div className="flex justify-center my-4">
                    <span className="px-5 py-1 text-xs rounded-full bg-[#1f2c33]/70 backdrop-blur-lg text-gray-200 shadow-lg">
                      {getDateLabel(msg.createdAt)}
                    </span>
                  </div>
                )}

                {/* MESSAGE BUBBLE */}
                <div
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`px-4 py-2 text-sm leading-relaxed break-words shadow-md transition duration-200 transform hover:scale-[1.02]
                max-w-[60%] sm:max-w-[60%] md:max-w-[50%] 
                ${
                  isMe
                    ? "bg-gradient-to-br from-[#005c4b] to-[#0a6e5a] text-white rounded-2xl rounded-br-md"
                    : "bg-[#202c33]/70 backdrop-blur-md text-white rounded-2xl rounded-bl-md"
                }`}
                    style={{ wordBreak: "break-word", whiteSpace: "pre-wrap" }}
                  >
                    <p>{msg.text}</p>

                    {/* Timestamp + Read Receipts */}
                    <div className="flex items-center justify-end gap-2 mt-1 text-[10px] text-gray-300 select-none">
                      {formatMessageTime(msg.createdAt)}
                      {isMe &&
                        (isRead ? (
                          <DoneAllIcon className="!text-[#53bdeb] !text-[14px]" />
                        ) : (
                          <DoneIcon className="!text-gray-400 !text-[14px]" />
                        ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          }}
        />

        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <ChatInput conversationId={conversationId} />
    </div>
  );
}
