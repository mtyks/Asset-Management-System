import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, ChevronRight, Calendar, LayoutGrid } from "lucide-react";

const ROUTE_NAME_MAP = {
  "": "ภาพรวมระบบ",
  "dashboard": "Dashboard ภาพรวม",
  "assets": "รายการครุภัณฑ์",
  "new": "เพิ่มครุภัณฑ์ใหม่",
  "edit": "แก้ไขข้อมูลครุภัณฑ์",
  "categories": "หมวดหมู่ครุภัณฑ์",
  "locations": "สถานที่ / ห้อง",
  "transfers": "ยืม / คืน ครุภัณฑ์",
  "maintenance": "ระบบแจ้งซ่อมและบำรุงรักษา",
  "settings": "ตั้งค่าระบบ",
  "scan": "ตรวจนับ QR / Demo",
  "login": "เข้าสู่ระบบ",
  "asset": "รายละเอียดครุภัณฑ์",
};

export default function TopHeader({ onToggleSidebar }) {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  // สร้าง breadcrumb items
  const breadcrumbs = [];
  if (pathSegments.length > 0) {
    if (pathSegments[0] === "assets" && pathSegments[1] === "new") {
      breadcrumbs.push({ label: "รายการครุภัณฑ์", path: "/assets" });
      breadcrumbs.push({ label: "เพิ่มครุภัณฑ์ใหม่", path: "/assets/new" });
    } else if (pathSegments[0] === "assets" && pathSegments[2] === "edit") {
      breadcrumbs.push({ label: "รายการครุภัณฑ์", path: "/assets" });
      breadcrumbs.push({ label: "แก้ไขครุภัณฑ์", path: location.pathname });
    } else if (pathSegments[0] === "asset") {
      breadcrumbs.push({ label: "รายการครุภัณฑ์", path: "/assets" });
      breadcrumbs.push({ label: pathSegments[1] || "รายละเอียด", path: location.pathname });
    } else {
      const pageTitle = ROUTE_NAME_MAP[pathSegments[0]] || pathSegments[0];
      breadcrumbs.push({ label: pageTitle, path: `/${pathSegments[0]}` });
    }
  } else {
    breadcrumbs.push({ label: "Dashboard", path: "/dashboard" });
  }

  return (
    <header className="top-header">
      <div className="top-header-left">
        <button
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="เปิดเมนู"
        >
          <Menu size={20} />
        </button>

        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#64748b" }}>
            <LayoutGrid size={13} />
            <span>หน้าหลัก</span>
          </Link>
          <ChevronRight size={14} className="breadcrumb-separator" />

          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.path + idx}>
                {idx > 0 && <ChevronRight size={14} className="breadcrumb-separator" />}
                {isLast ? (
                  <span className="breadcrumb-current">{crumb.label}</span>
                ) : (
                  <Link to={crumb.path}>{crumb.label}</Link>
                )}
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      <div className="top-header-right">
        <Link
          to="/"
          className="btn btn-outline-white"
          style={{
            fontSize: "0.8rem",
            padding: "5px 12px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
          title="สลับไปหน้าเลือกเมนูรวม"
        >
          <LayoutGrid size={14} />
          <span>หน้าเลือกเมนู</span>
        </Link>

        <div className="budget-year-badge">
          <Calendar size={13} style={{ color: "#64748b" }} />
          <span>ปีงบประมาณ 2569</span>
        </div>
      </div>
    </header>
  );
}
