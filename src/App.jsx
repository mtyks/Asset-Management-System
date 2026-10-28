import React, { useState } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "./lib/AuthContext";
import Sidebar from "./components/Sidebar";
import TopHeader from "./components/TopHeader";

import Portal from "./pages/Portal";
import Maintenance from "./pages/Maintenance";
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
import Register from "./pages/Register";

export default function App() {
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isLoginPage = location.pathname === "/login";
  const isRegisterPage = location.pathname === "/register";
  const isPortalPage = location.pathname === "/" || location.pathname === "/portal";
  const isMaintenancePage = location.pathname.startsWith("/maintenance");
  const isScanOrPublicAsset =
    location.pathname.startsWith("/scan") || location.pathname.startsWith("/asset/");

  // 1. หน้าเลือกเมนูระบบงาน (Portal Selection Page)
  if (isPortalPage) {
    return (
      <Routes>
        <Route path="/" element={<Portal />} />
        <Route path="/portal" element={<Portal />} />
      </Routes>
    );
  }

  // 2. หน้าเข้าสู่ระบบ และ สมัครสมาชิก
  if (isLoginPage) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
      </Routes>
    );
  }

  if (isRegisterPage) {
    return (
      <Routes>
        <Route path="/register" element={<Register />} />
      </Routes>
    );
  }

  // 3. สาธารณะ: สแกน QR & ดูรายละเอียดครุภัณฑ์
  if (isScanOrPublicAsset) {
    return (
      <Routes>
        <Route path="/scan" element={<ScanQR />} />
        <Route path="/asset/:assetCode" element={<AssetDetail />} />
      </Routes>
    );
  }

  // 4. บังคับเข้าสู่ระบบเมื่อจะเข้าใช้งานระบบต่างๆ หากยังไม่ได้เข้าสู่ระบบ
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 5. ระบบแจ้งซ่อมและบำรุงรักษา (Standalone Maintenance & Repair Service System)
  if (isMaintenancePage) {
    return (
      <Routes>
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="*" element={<Maintenance />} />
      </Routes>
    );
  }

  // 6. ระบบบริหารจัดการครุภัณฑ์ (Asset Management System with Sidebar & TopHeader)
  return (
    <div className="app-layout">
      {/* Dark Navy/Forest Emerald Sidebar - จัดการเฉพาะงานครุภัณฑ์ 100% */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="app-main-wrapper">
        <TopHeader onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <main>
          <Routes>
            {/* ระบบบริหารจัดการครุภัณฑ์ */}
            <Route path="/dashboard" element={<Dashboard />} />
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
