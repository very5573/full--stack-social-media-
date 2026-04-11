"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";

// Components
import UserSearchInput from "../components/message/Searchbar";
import InboxList from "../components/message/InboxList";
import RequestList from "../components/message/RequestList";
import ChatScreen from "../components/message/ChatScreen";

// Redux
import {
  fetchMessageRequests,
  markAllSeen,
} from "../../redux/slices/chatActionSlice";

// Icons
import CloseIcon from "@mui/icons-material/Close";

const InstagramDMModal = () => {
  const router = useRouter();
  const dispatch = useDispatch();

  const user = useSelector((state) => state.auth.user);
  const userId = user?._id || user?.id;

  // 🔴 BADGE (ONLY UNREAD)
  const requestBadge = useSelector((state) =>
    state.chatAction.requests.filter((r) => !r.isSeen).length
  );

  const [activeTab, setActiveTab] = useState("inbox");
  const [showSidebar, setShowSidebar] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // ================= FETCH REQUESTS =================
  useEffect(() => {
    if (!userId || !showSidebar) return;

    dispatch(fetchMessageRequests(userId));
  }, [userId, showSidebar, dispatch]);

  // ================= RESPONSIVE =================
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ================= CLOSE =================
  const handleClose = () => {
    router.push("/");
  };

  // ================= CHAT SELECT =================
  const handleSelectChat = () => {
    if (isMobile) setShowSidebar(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0b141a]">
      <div className="relative flex h-full w-full overflow-hidden">

        {/* SIDEBAR */}
        {showSidebar && (
          <div className="w-full md:w-[360px] bg-[#111b21] flex flex-col">

            {/* HEADER */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-black/30">
              <div className="flex items-center gap-3">
                <img
                  src={user?.avatar || "/default-avatar.png"}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <span className="text-white font-semibold">
                  {user?.name}
                </span>
              </div>

              <button onClick={handleClose}>
                <CloseIcon className="text-gray-300" />
              </button>
            </div>

            {/* SEARCH */}
            <div className="p-2 border-b border-black/20">
              <UserSearchInput onSelectChat={handleSelectChat} />
            </div>

            {/* TABS */}
            <div className="flex border-b border-black/20">

              {/* INBOX */}
              <button
                onClick={() => setActiveTab("inbox")}
                className={`flex-1 py-2 ${
                  activeTab === "inbox"
                    ? "text-green-500 border-b-2 border-green-500"
                    : "text-gray-400"
                }`}
              >
                Inbox
              </button>

              {/* REQUESTS */}
              <button
                onClick={() => setActiveTab("requests")}
                className={`relative flex-1 py-2 ${
                  activeTab === "requests"
                    ? "text-green-500 border-b-2 border-green-500"
                    : "text-gray-400"
                }`}
              >
                Requests

                {/* 🔴 BADGE (ONLY UNREAD) */}
                {requestBadge > 0 && (
                  <span className="absolute top-1 right-5 bg-red-500 text-white text-[10px] px-1.5 rounded-full">
                    {requestBadge}
                  </span>
                )}
              </button>
            </div>

            {/* LIST */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === "inbox" && (
                <InboxList onSelectChat={handleSelectChat} />
              )}

              {activeTab === "requests" && (
                <RequestList onSelectChat={handleSelectChat} />
              )}
            </div>
          </div>
        )}

        {/* CHAT */}
        <div className="flex-1 bg-[#0b141a]">
          <ChatScreen
            onBack={
              isMobile && !showSidebar ? () => setShowSidebar(true) : null
            }
          />
        </div>
      </div>
    </div>
  );
};

export default InstagramDMModal;