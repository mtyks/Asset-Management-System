import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import {
  Box,
  LayoutDashboard,
  Package,
  Tag,
  MapPin,
  ArrowLeftRight,
  Settings,
  QrCode,
  LogOut,
  X,
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
        {/* Header with Logo */}
        <div className="sidebar-header">
          <div className="sidebar-logo-icon">
            <Box size={22} strokeWidth={2.2} />
          </div>
          <div className="sidebar-logo-title">
            ระบบบริหารจัดการ
            <br />
            ครุภัณฑ์
          </div>
          {isOpen && (
            <button
              className="mobile-menu-btn"
              style={{ marginLeft: "auto", color: "#94a3b8" }}
              onClick={onClose}
              aria-label="ปิดเมนู"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
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

        {/* Footer Profile Section */}
        <div className="sidebar-footer">
          <div className="sidebar-user-info">
            <div className="sidebar-avatar">ผป</div>
            <div className="sidebar-user-meta">
              <div className="sidebar-user-name">ผู้ดูแลระบบพัสดุ</div>
              <div className="sidebar-user-email">
                {user?.email || "admin@organization.go.th"}
              </div>
            </div>
          </div>
          {user ? (
            <button
              className="sidebar-logout-btn"
              onClick={signOut}
              title="ออกจากระบบ"
              aria-label="ออกจากระบบ"
            >
              <LogOut size={17} />
            </button>
          ) : (
            <NavLink
              to="/login"
              className="sidebar-logout-btn"
              title="เข้าสู่ระบบ"
              aria-label="เข้าสู่ระบบ"
            >
              <LogOut size={17} style={{ transform: "rotate(180deg)" }} />
            </NavLink>
          )}
        </div>
      </aside>
    </>
  );
}
