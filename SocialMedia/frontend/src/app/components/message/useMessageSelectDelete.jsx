"use client";

import { useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import API from "../../../utils/axiosInstance";
import { deleteMessages } from "../../../redux/slices/conversationSlice";

export default function useMessageSelectDelete({
  conversationId,
  messages,
}) {
  const dispatch = useDispatch();

  const [selectMode, setSelectMode] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [showModal, setShowModal] = useState(false);

  // ✅ toggle select mode
  const toggleSelect = useCallback((id) => {
    setSelectMode(true);
    setSelectedMessages((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  }, []);

  // ❌ exit select mode
  const resetSelect = () => {
    setSelectMode(false);
    setSelectedMessages([]);
    setShowModal(false);
  };

  // 🗑 delete for me
  const deleteForMe = async () => {
    if (!selectedMessages.length || !conversationId) return;

    try {
      await API.delete("/messages/delete-selected", {
        data: {
          conversationId,
          messageIds: selectedMessages,
        },
      });

      dispatch(
        deleteMessages({
          conversationId,
          messageIds: selectedMessages,
        })
      );
    } catch (err) {
      console.error(
        "❌ Delete for me failed:",
        err.response?.data || err.message
      );
    }

    resetSelect();
  };

  // ✅ select all
  const selectAllMessages = () => {
    const allIds = messages.map((msg) => msg._id);
    setSelectMode(true);
    setSelectedMessages(allIds);
  };

  // 🌍 delete for everyone
  const deleteForEveryone = async () => {
    if (!selectedMessages.length || !conversationId) return;

    try {
      await API.delete("/messages/delete-for-everyone", {
        data: {
          conversationId,
          messageIds: selectedMessages,
        },
      });

      dispatch(
        deleteMessages({
          conversationId,
          messageIds: selectedMessages,
        })
      );
    } catch (err) {
      console.error(
        "❌ Delete for everyone failed:",
        err.response?.data || err.message
      );
    }

    resetSelect();
  };

  return {
    // state
    selectMode,
    selectedMessages,
    showModal,

    // setters
    setShowModal,

    // actions
    toggleSelect,
    resetSelect,
    deleteForMe,
    deleteForEveryone,
    selectAllMessages,
  };
}
