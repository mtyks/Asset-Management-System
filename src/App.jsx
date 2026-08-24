import React, { useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import TopHeader from "./components/TopHeader";

import Dashboard from "./pages/Dashboard";
import AssetsList from "./pages/AssetsList";
import AssetForm from "./pages/AssetForm";
import AssetDetail from "./pages/AssetDetail";
import ScanQR from "./pages/ScanQR";
import Locations from "./pages/Locations";
import Categories from "./pages/Categories";
import Transfers from "./pages/Transfers";
import Settings from "./pages/Settings";
import Login from "./pages/Login";

export default function App() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isLoginPage = location.pathname === "/login";

  if (isLoginPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  return (
    <div className="app-layout">
      {/* Dark Navy Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="app-main-wrapper">
        <TopHeader onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <main>
          <Routes>
            {/* สาธารณะ: สแกน QR & ดูรายละเอียดครุภัณฑ์ */}
            <Route path="/scan" element={<ScanQR />} />
            <Route path="/asset/:assetCode" element={<AssetDetail />} />

            {/* หน้าจัดการระบบ */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/assets" element={<AssetsList />} />
            <Route path="/assets/new" element={<AssetForm />} />
            <Route path="/assets/:assetId/edit" element={<AssetForm />} />
            <Route path="/transfers" element={<Transfers />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/locations" element={<Locations />} />
            <Route path="/settings" element={<Settings />} />

            {/* Catch-all redirect to Dashboard */}
            <Route path="*" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
