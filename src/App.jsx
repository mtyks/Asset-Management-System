import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Dashboard from "./pages/Dashboard";
import AssetsList from "./pages/AssetsList";
import AssetForm from "./pages/AssetForm";
import AssetDetail from "./pages/AssetDetail";
import ScanQR from "./pages/ScanQR";
import Locations from "./pages/Locations";
import Categories from "./pages/Categories";
import Login from "./pages/Login";

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="app-main">
        <Routes>
          {/* เข้าถึงได้โดยไม่ต้องล็อกอิน - นี่คือสิ่งที่ทำให้สแกน QR ใช้งานได้ทันที */}
          <Route path="/scan" element={<ScanQR />} />
          <Route path="/asset/:assetCode" element={<AssetDetail />} />
          <Route path="/login" element={<Login />} />

          {/* ต้องล็อกอินก่อนเข้าใช้งาน (แก้ไขข้อมูล) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assets"
            element={
              <ProtectedRoute>
                <AssetsList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assets/new"
            element={
              <ProtectedRoute>
                <AssetForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assets/:assetId/edit"
            element={
              <ProtectedRoute>
                <AssetForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/locations"
            element={
              <ProtectedRoute>
                <Locations />
              </ProtectedRoute>
            }
          />
          <Route
            path="/categories"
            element={
              <ProtectedRoute>
                <Categories />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
