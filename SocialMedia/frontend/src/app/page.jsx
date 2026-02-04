"use client";

import ProtectedRoute from "./components/ProtectedRoute";

const HomePage = () => {
  return (
    <ProtectedRoute>
      <div className="max-w-4xl ml-120 mx-auto">
        <h1 className="text-3xl font-bold text-gray-800">
          Welcome to the Home Page
        </h1>

        <p className="mt-4 text-gray-600">
          This is your main content area. It will adjust automatically according to the sidebar.
        </p>
      </div>
    </ProtectedRoute>
  );
};

export default HomePage;
