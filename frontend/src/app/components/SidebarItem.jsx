"use client";

import Link from "next/link";
import { useSelector } from "react-redux";

function SidebarItem({ item, isOpen, unreadCount, isActive }) {
  const Icon = item.icon;

  const currentUser = useSelector((state) => state.auth?.user);

  // ✅ ONLY Profile ke liye avatar
  const isProfile = item.label === "Profile";

  return (
    <Link
      href={item.path}
      aria-label={item.label}
      className={`relative flex items-center gap-3 px-3 py-2 rounded-lg transition
        ${isActive ? "bg-gray-200 font-semibold" : "hover:bg-gray-100"}
      `}
    >
      {/* ICON / AVATAR */}
      <div className="relative">
        {isProfile && currentUser?.avatar ? (
          <img
            src={currentUser.avatar}
            alt="avatar"
            className="w-7 h-7 rounded-full object-cover border"
          />
        ) : (
          <Icon className="text-gray-700 w-6 h-6" />
        )}

        {/* MESSAGE BADGE */}
        {!isOpen && item.label === "Messages" && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1.5 rounded-full min-w-[16px] text-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>

      {/* LABEL */}
      {isOpen && (
        <span className="flex-1 text-sm font-medium">
          {item.label}
        </span>
      )}

      {/* RIGHT BADGE */}
      {isOpen && item.label === "Messages" && unreadCount > 0 && (
        <span className="text-xs bg-red-500 text-white px-2 rounded-full">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </Link>
  );
}

export default SidebarItem;