"use client";

import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter, usePathname } from "next/navigation";
import { fetchUser } from "../redux/slices/authslice";
import { ToastContainer } from "react-toastify";
import SidebarWrapper from "./components/SidebarWrapper";
import GlobalSocketListener from "./components/SocketListener";

const ClientLayout = ({ children }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();

  const { authChecked, isAuthenticated } = useSelector(
    (state) => state.auth
  );

  const hasFetchedRef = useRef(false);

  /* 🔥 SIDEBAR CONTROL CENTER */
  const hideSidebarRoutes = [
    "/auth/login",
    "/auth/register",
    // future pages where sidebar isn't needed
  ];

  const hideSidebar = hideSidebarRoutes.includes(pathname);
  const isAuthPage = pathname.startsWith("/auth");

  /* 🔄 Fetch user once */
  useEffect(() => {
    if (!hasFetchedRef.current && !authChecked) {
      hasFetchedRef.current = true;
      dispatch(fetchUser());
    }
  }, [authChecked, dispatch]);

  /* 🔐 Redirect unauthenticated users */
  useEffect(() => {
    if (authChecked && !isAuthenticated && !hideSidebar) {
      router.replace("/auth/login");
    }
  }, [authChecked, isAuthenticated, hideSidebar, router]);

  /* ⏳ Prevent UI flicker */
  if (!authChecked && !hideSidebar) return null;

  /* 🔥 PAGES WITHOUT SIDEBAR */
  if (hideSidebar) {
    return (
      <>
        {children}
        <ToastContainer position="top-right" autoClose={3000} theme="colored" />
      </>
    );
  }

  /* 🔥 PAGES WITH SIDEBAR (DEFAULT) */
  return (
    <>
      <div className="flex min-h-[100dvh] bg-gray-50">
        {isAuthenticated && <SidebarWrapper />}
        <main className="flex-1">
          {children}
        </main>
      </div>

      {/* ✅ Render the socket listener only once when authenticated */}
      {isAuthenticated && <GlobalSocketListener />}

      <ToastContainer position="top-right" autoClose={3000} theme="colored" />
    </>
  );
};

export default ClientLayout;
