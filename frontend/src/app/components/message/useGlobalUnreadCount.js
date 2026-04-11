"use client";

import { useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import socket from "../../../utils/socket";
import API from "../../../utils/axiosInstance"; // ✅ axios instance
import { setUnreadCount } from "../../../redux/slices/unreadSlice";

export const useGlobalUnreadCount = () => {
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth);
  const count = useSelector((state) => state.unread.count);

  const userId = user?._id || user?.id;

  // 🔥 1. API CALL (axios)
  const fetchUnreadCount = async () => {
    try {
      const { data } = await API.get("/unread-count");

      if (typeof data.count === "number") {
        dispatch(setUnreadCount(data.count));
      }
    } catch (err) {
      console.error("❌ API unread count error:", err?.response || err);
    }
  };

  // 🔌 SOCKET + API COMBINED
  useEffect(() => {
    if (!userId) return;

    // ✅ STEP 1: API (exact count)
    fetchUnreadCount();

    // ✅ STEP 2: socket sync
    socket.emit("getUnreadCount");

    const handleUnreadCount = ({ count }) => {
      if (typeof count === "number") {
        dispatch(setUnreadCount(count));
      }
    };

    // 🔥 server trigger → re-sync
    const handleRefresh = () => {
      socket.emit("getUnreadCount");
    };

    socket.on("unreadCount", handleUnreadCount);
    socket.on("refreshUnreadCount", handleRefresh);

    return () => {
      socket.off("unreadCount", handleUnreadCount);
      socket.off("refreshUnreadCount", handleRefresh);
    };
  }, [userId, dispatch]);

  // 🔥 RESET BADGE (chat open)
  const resetBadge = useCallback((conversationId, messages = []) => {
    if (!conversationId || !userId || !Array.isArray(messages)) return;

    const unreadMessageIds = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];

      if (
        msg.conversationId?.toString() === conversationId?.toString() &&
        msg.receiverId?.toString() === userId?.toString() &&
        !msg.read
      ) {
        unreadMessageIds.push(msg._id);
      }
    }

    if (unreadMessageIds.length === 0) return;

    socket.emit("markMessageRead", {
      conversationId,
      messageIds: unreadMessageIds,
    });

    // 🔥 optimistic UI update
    dispatch(setUnreadCount(Math.max(0, count - unreadMessageIds.length)));
  }, [userId, count, dispatch]);

  return { unreadCount: count, resetBadge };
};