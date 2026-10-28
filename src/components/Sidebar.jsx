import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import {
  LayoutDashboard,
  Package,
  Tag,
  MapPin,
  ArrowLeftRight,
  Settings,
  QrCode,
  LogOut,
  X,
  LayoutGrid,
} from "lucide-react";

export default function Sidebar({ isOpen, onClose }) {
  const { user, signOut } = useAuth();

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`app-sidebar ${isOpen ? "sidebar-open" : ""}`}>
        {/* Header Title without Icon */}
        <div className="sidebar-header" style={{ padding: "20px 18px 12px" }}>
          <div className="sidebar-logo-title" style={{ fontSize: "1.05rem", fontWeight: 800, lineHeight: 1.3, letterSpacing: "-0.01em" }}>
            ระบบบริหารจัดการครุภัณฑ์
          </div>
          {isOpen && (
            <button
              className="mobile-menu-btn"
              style={{ marginLeft: "auto", color: "#93c5b5" }}
              onClick={onClose}
              aria-label="ปิดเมนู"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Portal Switcher Button */}
        <div style={{ padding: "0 14px 12px" }}>
          <NavLink
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 12px",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              borderRadius: "8px",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "#a7f3d0",
              textDecoration: "none",
              transition: "all 0.15s ease",
            }}
            onClick={handleLinkClick}
          >
            <LayoutGrid size={15} />
            <span>กลับหน้าเลือกเมนูรวม</span>
          </NavLink>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
            onClick={handleLinkClick}
          >
            <LayoutDashboard className="sidebar-icon" size={18} />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/assets"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
            onClick={handleLinkClick}
          >
            <Package className="sidebar-icon" size={18} />
            <span>รายการครุภัณฑ์</span>
          </NavLink>

          <div className="sidebar-section-label">จัดการข้อมูล</div>

          <NavLink
            to="/transfers"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
            onClick={handleLinkClick}
          >
            <ArrowLeftRight className="sidebar-icon" size={18} />
            <span>ยืม / คืน ครุภัณฑ์</span>
          </NavLink>

          <NavLink
            to="/categories"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
            onClick={handleLinkClick}
          >
            <Tag className="sidebar-icon" size={18} />
            <span>หมวดหมู่ครุภัณฑ์</span>
          </NavLink>

          <NavLink
            to="/locations"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
            onClick={handleLinkClick}
          >
            <MapPin className="sidebar-icon" size={18} />
            <span>สถานที่ / ห้อง</span>
          </NavLink>

          <div className="sidebar-section-label">ระบบ &amp; ตรวจสอบ</div>

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
            onClick={handleLinkClick}
          >
            <Settings className="sidebar-icon" size={18} />
            <span>ตั้งค่าระบบ</span>
          </NavLink>

          <NavLink
            to="/scan"
            className={({ isActive }) =>
              `sidebar-link ${isActive ? "active" : ""}`
            }
            onClick={handleLinkClick}
          >
            <QrCode className="sidebar-icon" size={18} />
            <span>ตรวจนับ QR / Demo</span>
          </NavLink>
        </nav>

        {/* Footer Section (แสดงเฉพาะปุ่มออกจากระบบเมื่อเข้าสู่ระบบอยู่ ไม่มีปุ่มเข้าสู่ระบบ) */}
        {user && (
          <div className="sidebar-footer">
            <button
              className="sidebar-logout-btn"
              onClick={signOut}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                padding: "9px 14px",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#cbd5e1",
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              title="ออกจากระบบ"
              aria-label="ออกจากระบบ"
            >
              <LogOut size={16} />
              <span>ออกจากระบบ</span>
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
