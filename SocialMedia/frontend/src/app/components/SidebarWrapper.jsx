"use client";

import ProtectedRoute from "./ProtectedRoute"; // path adjust करें
import Sidebar from "./Sidebar";

const SidebarWrapper = () => {
  return (
    <ProtectedRoute>
      <Sidebar />
    </ProtectedRoute>
  );
};

export default SidebarWrapper;
