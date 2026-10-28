import React from "react";
import { Link } from "react-router-dom";
import {
  Package,
  Wrench,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export default function Portal() {
  return (
    <div className="portal-container">
      {/* Top Navigation Bar */}
      <header className="portal-topbar">
        <div className="portal-topbar-inner">
          <div className="portal-brand">
            <div className="portal-brand-badge">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="portal-brand-title">ระบบบริการและบริหารจัดการองค์กร</div>
              <div className="portal-brand-sub">Enterprise Management & Service Portal</div>
            </div>
          </div>

          <div className="portal-topbar-right">
            <div className="budget-year-badge">
              <Calendar size={13} style={{ color: "#64748b" }} />
              <span>ปีงบประมาณ 2569</span>
            </div>
            <Link
              to="/login"
              style={{
                fontSize: "0.82rem",
                color: "#064e3b",
                fontWeight: 600,
                textDecoration: "none",
                padding: "6px 12px",
              }}
            >
              เข้าสู่ระบบ
            </Link>
            <Link
              to="/register"
              className="btn btn-primary"
              style={{ fontSize: "0.82rem", padding: "6px 16px" }}
            >
              สมัครสมาชิก
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero & System Selection Content */}
      <main className="portal-main">
        {/* Title Group */}
        <div className="portal-hero-section">
          <div className="portal-tagline">
            <span className="portal-dot-pulse" />
            <span>ระบบศูนย์กลางงานสารสนเทศและบริหารพัสดุ</span>
          </div>
          <h1 className="portal-hero-title">
            เลือกเข้าสู่ระบบงานที่ต้องการใช้งาน
          </h1>
          <p className="portal-hero-subtitle">
            เข้าถึงระบบบริหารจัดการครุภัณฑ์และระบบแจ้งซ่อมบำรุงรักษาแบบครบวงจร สะดวกรวดเร็วและแม่นยำ
          </p>
        </div>

        {/* The 2 Master System Cards Grid */}
        <div className="portal-cards-grid">
          {/* System 1: Asset Management System */}
          <div className="portal-system-card emerald">
            <div className="portal-card-icon-box emerald">
              <Package size={36} />
            </div>

            <div className="portal-card-content">
              <div className="portal-card-category">ระบบหลักงานพัสดุ</div>
              <h2 className="portal-card-title">ระบบบริหารจัดการครุภัณฑ์</h2>
              <div className="portal-card-sub-en">Asset & Inventory Management System</div>

              <p className="portal-card-desc">
                จัดการบัญชีและทะเบียนครุภัณฑ์ ตรวจนับสินทรัพย์ด้วย QR Code ผังสถานที่ประจำตึก-ห้อง บันทึกการยืม-คืน และนำเข้า/ส่งออกรายงาน CSV
              </p>

              <div className="portal-feature-pills">
                <span className="portal-pill">
                  <CheckCircle2 size={13} />
                  <span>ตรวจนับ QR Code</span>
                </span>
                <span className="portal-pill">
                  <CheckCircle2 size={13} />
                  <span>ระบบ ยืม - คืน</span>
                </span>
                <span className="portal-pill">
                  <CheckCircle2 size={13} />
                  <span>นำเข้า / ส่งออก CSV</span>
                </span>
                <span className="portal-pill">
                  <CheckCircle2 size={13} />
                  <span>ผังอาคาร &amp; ห้อง</span>
                </span>
              </div>
            </div>

            <div className="portal-card-action">
              <Link to="/dashboard" className="portal-enter-btn emerald">
                <span>เข้าสู่ระบบครุภัณฑ์</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>

          {/* System 2: Maintenance & Repair System */}
          <div className="portal-system-card teal">
            <div className="portal-card-icon-box teal">
              <Wrench size={36} />
            </div>

            <div className="portal-card-content">
              <div className="portal-card-category">ระบบบริการซ่อมบำรุง</div>
              <h2 className="portal-card-title">ระบบแจ้งซ่อมและบำรุงรักษา</h2>
              <div className="portal-card-sub-en">Maintenance & Repair Service System</div>

              <p className="portal-card-desc">
                ส่งคำขอแจ้งซ่อมครุภัณฑ์และอุปกรณ์ชำรุด ติดตามสถานะงานซ่อมแบบ Real-time บันทึกการดำเนินงานของช่าง และประเมินประวัติการซ่อมบำรุง
              </p>

              <div className="portal-feature-pills">
                <span className="portal-pill">
                  <CheckCircle2 size={13} />
                  <span>แจ้งซ่อมด่วนออนไลน์</span>
                </span>
                <span className="portal-pill">
                  <CheckCircle2 size={13} />
                  <span>ติดตามสถานะงานซ่อม</span>
                </span>
                <span className="portal-pill">
                  <CheckCircle2 size={13} />
                  <span>ประวัติการบำรุงรักษา</span>
                </span>
                <span className="portal-pill">
                  <CheckCircle2 size={13} />
                  <span>มอบหมายงานช่าง</span>
                </span>
              </div>
            </div>

            <div className="portal-card-action">
              <Link to="/maintenance" className="portal-enter-btn teal">
                <span>เข้าสู่ระบบแจ้งซ่อม</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="portal-footer">
        <p>© 2569 ระบบบริหารจัดการครุภัณฑ์และบริการซ่อมบำรุงองค์กร สงวนลิขสิทธิ์</p>
      </footer>
    </div>
  );
}
