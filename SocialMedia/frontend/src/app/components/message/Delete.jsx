"use client";

import { useState, useCallback } from "react";
import API from "../../../utils/axiosInstance";
import { useDispatch } from "react-redux";
import { deleteMessages } from "../../../redux/slices/conversationSlice";
import DeleteIcon from "@mui/icons-material/Delete";
import ClearIcon from "@mui/icons-material/Clear";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import PersonIcon from "@mui/icons-material/Person";
import axios from "axios";

export default function MessageSelectDelete({
  conversationId,
  messages, // ✅ full message objects array
  renderMessages, // function(msg, { selectMode })
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
      console.error("❌ Delete for me failed:", err.response?.data || err.message);
    }

    resetSelect();
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

  
  return (
    <>
      {/* 🔹 Messages */}
      <div className="flex flex-col gap-2 relative">
        {messages.map((msg) => (
          <div
            key={msg._id}
            onClick={() => toggleSelect(msg._id)}
            onContextMenu={(e) => {
              e.preventDefault();
              toggleSelect(msg._id);
            }}
            className="relative group"
          >
            {/* ✅ Checkbox */}
            {selectMode && (
              <input
                type="checkbox"
                checked={selectedMessages.includes(msg._id)}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleSelect(msg._id);
                }}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-5 h-5 accent-green-500"
              />
            )}

            <div
              className={`transition-all duration-150 p-1 rounded ${
                selectedMessages.includes(msg._id)
                  ? "opacity-80 scale-[0.97] bg-gray-700"
                  : ""
              }`}
            >
              {renderMessages(msg, { selectMode })}
            </div>
          </div>
        ))}
      </div>

      {/* 🗑 Bottom bar */}
      {selectMode && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 text-white p-3 flex justify-between items-center z-50 border-t border-gray-700">
          <span className="flex items-center gap-2">
            <PersonIcon fontSize="small" />
            {selectedMessages.length} selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1 bg-red-600 px-3 py-1 rounded"
            >
              <DeleteIcon fontSize="small" /> Delete
            </button>
            <button
              onClick={resetSelect}
              className="flex items-center gap-1 bg-gray-700 px-3 py-1 rounded"
            >
              <ClearIcon fontSize="small" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* 🧾 Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-5 w-80 flex flex-col gap-3">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <DeleteForeverIcon className="text-red-600" />
              Delete Messages?
            </h3>

            <div className="flex flex-col gap-2">
              <button
                onClick={deleteForMe}
                className="bg-gray-200 px-4 py-2 rounded"
              >
                Delete for Me
              </button>
              <button
                onClick={deleteForEveryone}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Delete for Everyone
              </button>
              <button
                onClick={resetSelect}
                className="bg-gray-400 px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
