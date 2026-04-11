"use client";

import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import socket from "../../../utils/socket";

import {
  acceptRequest,
  rejectRequest,
  fetchMessageRequests,
  markAllSeen,
} from "../../../redux/slices/chatActionSlice";

import {
  acceptConversationSuccess,
  rejectConversationSuccess,
} from "../../../redux/slices/conversationSlice";

import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";

export default function RequestList() {
  const dispatch = useDispatch();

  const currentUser = useSelector((state) => state.auth?.user);
  const userId = currentUser?._id || currentUser?.id;

  const requests = useSelector((state) => state.chatAction?.requests ?? []);
  const loading = useSelector(
    (state) => state.chatAction?.loadingRequests ?? false
  );

  // ================= FETCH =================
  useEffect(() => {
    if (!userId) return;
    dispatch(fetchMessageRequests(userId));
  }, [userId, dispatch]);

  // ================= SOCKET =================
  useEffect(() => {
    if (!socket || !userId) return;

    const refetch = () => {
      dispatch(fetchMessageRequests(userId));
    };

    socket.on("request:updated", refetch);

    return () => {
      socket.off("request:updated", refetch);
    };
  }, [dispatch, userId]);

  // ================= ACTIONS =================
  const handleAccept = (req) => {
    dispatch(acceptRequest(req._id));
    dispatch(acceptConversationSuccess(req));

    // 🔥 RESET BADGE ONLY HERE
    dispatch(markAllSeen());
  };

  const handleReject = (reqId) => {
    dispatch(rejectRequest(reqId));
    dispatch(rejectConversationSuccess(reqId));

    // 🔥 RESET BADGE ONLY HERE
    dispatch(markAllSeen());
  };

  // ================= UI =================
  if (loading) {
    return (
      <p className="p-4 text-sm text-gray-400">
        Loading...
      </p>
    );
  }

  if (!requests.length) {
    return (
      <div className="p-4 text-sm text-gray-500">
        No message requests
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {requests.map((req) => {
        const otherUser = req.members?.find(
          (m) => m._id !== userId
        );

        if (!otherUser) return null;

        return (
          <div
            key={req._id}
            className="flex items-center justify-between p-3 rounded-lg bg-[#202c33]"
          >
            {/* USER INFO */}
            <div className="flex items-center gap-3">
              <img
                src={otherUser.avatar || "/default-avatar.png"}
                alt={otherUser.name}
                className="w-11 h-11 rounded-full object-cover"
              />

              <div>
                <p className="text-sm text-white">
                  {otherUser.name}
                </p>
                <p className="text-xs text-gray-400">
                  Sent you a request
                </p>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex gap-2">
              <button
                onClick={() => handleAccept(req)}
                className="text-green-400 hover:text-green-300"
              >
                <CheckIcon />
              </button>

              <button
                onClick={() => handleReject(req._id)}
                className="text-red-400 hover:text-red-300"
              >
                <CloseIcon />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}