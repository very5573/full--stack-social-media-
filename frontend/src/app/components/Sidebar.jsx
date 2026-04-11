"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { usePathname } from "next/navigation";

import SidebarDropdown from "../components/slider/SidebarDropdown";
import PostDropdown from "../components/slider/PostDropdown";
import SidebarItem from "./SidebarItem";

import { sidebarMenu } from "./sidebarMenu";
import { useGlobalUnreadCount } from "../components/message/useGlobalUnreadCount";

function Sidebar() {
  const pathname = usePathname();
  const { user } = useSelector((state) => state.auth);

  const { unreadCount } = useGlobalUnreadCount();

  const [expanded, setExpanded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => {
        setExpanded(false);
        setMoreOpen(false);
      }}
      className={`fixed left-0 top-0 z-50 h-screen flex flex-col transition-all duration-300
        ${expanded ? "w-64" : "w-20"}
        bg-white text-gray-900 shadow-xl border-r border-gray-200`}
    >
      {/* LOGO */}
      <div className="h-20 flex items-center justify-center border-b border-gray-200">
        {expanded && (
          <span
            className="text-2xl font-extrabold tracking-wide bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(90deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)",
            }}
          >
            Tripathi
          </span>
        )}
      </div>

      {/* MENU */}
      <nav className="flex flex-col gap-2 p-3 flex-1">
        {sidebarMenu.map((item) => {
          if (item.type === "create") {
            return <PostDropdown key="create" expanded={expanded} />;
          }

          if (item.type === "dropdown") {
            const Icon = item.icon;
            return (
              <div key="more" className="relative">
                <button
                  onClick={() => setMoreOpen((prev) => !prev)}
                  className="flex w-full items-center gap-4 px-3 py-3 rounded-xl transition hover:bg-gray-100"
                >
                  <Icon className="text-gray-600 w-6 h-6" />
                  {expanded && (
                    <span className="text-sm font-medium">More</span>
                  )}
                </button>

                <SidebarDropdown open={moreOpen} setOpen={setMoreOpen} />
              </div>
            );
          }

          const isActive = pathname === item.path;

          return (
            <SidebarItem
              key={item.label}
              item={item}
              isOpen={expanded}
              unreadCount={item.label === "Messages" ? unreadCount : 0}
              isActive={isActive}
            />
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;