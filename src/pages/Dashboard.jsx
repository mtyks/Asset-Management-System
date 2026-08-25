import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboardCounts, listAssets } from "../lib/queries";
import StatusBadge from "../components/StatusBadge";
import {
  Package,
  CheckCircle2,
  Inbox,
  Wrench,
  Plus,
  QrCode,
  ArrowRight,
  TrendingUp,
  Clock,
  Layers,
  MapPin,
  ArrowLeftRight,
} from "lucide-react";

export default function Dashboard() {
  const [counts, setCounts] = useState({
    total: 0,
    normal: 0,
    borrowed: 0,
    repair: 0,
    damaged: 0,
    disposed: 0,
  });
  const [recentAssets, setRecentAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      getDashboardCounts().then(setCounts).catch(() => {}),
      listAssets().then((data) => setRecentAssets((data || []).slice(0, 5))).catch(() => {}),
    ])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const totalCount = counts.total || 0;
  const normalCount = counts.normal || 0;
  const borrowedCount = counts.borrowed || 0;
  const repairCount = counts.repair || 0;

  const normalPct = totalCount > 0 ? Math.round((normalCount / totalCount) * 100) : 0;
  const borrowedPct = totalCount > 0 ? Math.round((borrowedCount / totalCount) * 100) : 0;
  const repairPct = totalCount > 0 ? Math.round((repairCount / totalCount) * 100) : 0;

  return (
    <div className="page-container">
      {/* 1. Header Row */}
      <div className="page-heading-row">
        <div className="page-title-group">
          <h1>Dashboard ภาพรวมระบบ</h1>
          <p className="page-subtitle">
            สรุปสถานะครุภัณฑ์ สถิติการใช้งาน และรายการเคลื่อนไหวล่าสุด
          </p>
        </div>

        <div className="page-actions-group">
          <Link to="/assets/new" className="btn btn-primary">
            <Plus size={16} strokeWidth={2.5} />
            <span>เพิ่มครุภัณฑ์ใหม่</span>
          </Link>
          <Link to="/scan" className="btn btn-outline-white">
            <QrCode size={16} />
            <span>สแกน QR ตรวจนับ</span>
          </Link>
        </div>
      </div>

      {/* 2. Stat Summary Cards Grid (4 cards in Green & White tone) */}
      <div className="stats-summary-grid">
        <div className="stat-box">
          <div className="stat-box-icon total">
            <Package size={22} />
          </div>
          <div className="stat-box-body">
            <div className="stat-box-label">ครุภัณฑ์ทั้งหมด</div>
            <div className="stat-box-val-row">
              <span className="stat-box-number">
                {totalCount.toLocaleString()}
              </span>
              <span className="stat-box-unit">ชิ้น</span>
            </div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon normal">
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-box-body">
            <div className="stat-box-label">ใช้งานปกติ</div>
            <div className="stat-box-val-row">
              <span className="stat-box-number normal">
                {normalCount.toLocaleString()}
              </span>
              <span className="stat-box-unit">ชิ้น</span>
            </div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon borrow">
            <Inbox size={22} />
          </div>
          <div className="stat-box-body">
            <div className="stat-box-label">ยืมใช้งาน</div>
            <div className="stat-box-val-row">
              <span className="stat-box-number borrow">
                {borrowedCount.toLocaleString()}
              </span>
              <span className="stat-box-unit">ชิ้น</span>
            </div>
          </div>
        </div>

        <div className="stat-box">
          <div className="stat-box-icon repair">
            <Wrench size={22} />
          </div>
          <div className="stat-box-body">
            <div className="stat-box-label">ชำรุด / ส่งซ่อม</div>
            <div className="stat-box-val-row">
              <span className="stat-box-number repair">
                {repairCount.toLocaleString()}
              </span>
              <span className="stat-box-unit">ชิ้น</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Quick Overview Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        {/* Status Distribution */}
        <div className="form-card" style={{ margin: 0 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "1.05rem", fontWeight: 700 }}>
            สัดส่วนสถานะการใช้งาน
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.82rem",
                  marginBottom: "4px",
                  color: "#1e3a2f",
                }}
              >
                <span>ใช้งานปกติ ({normalPct}%)</span>
                <span style={{ fontWeight: 600 }}>{normalCount} ชิ้น</span>
              </div>
              <div style={{ height: "8px", backgroundColor: "#f0f7f3", borderRadius: "999px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${normalPct}%`,
                    backgroundColor: "#10b981",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>

            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.82rem",
                  marginBottom: "4px",
                  color: "#1e3a2f",
                }}
              >
                <span>ยืมใช้งาน ({borrowedPct}%)</span>
                <span style={{ fontWeight: 600 }}>{borrowedCount} ชิ้น</span>
              </div>
              <div style={{ height: "8px", backgroundColor: "#f0f7f3", borderRadius: "999px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${borrowedPct}%`,
                    backgroundColor: "#0d9488",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>

            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.82rem",
                  marginBottom: "4px",
                  color: "#1e3a2f",
                }}
              >
                <span>ชำรุด / ส่งซ่อม ({repairPct}%)</span>
                <span style={{ fontWeight: 600 }}>{repairCount} ชิ้น</span>
              </div>
              <div style={{ height: "8px", backgroundColor: "#f0f7f3", borderRadius: "999px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${repairPct}%`,
                    backgroundColor: "#f59e0b",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Menu Hub in Green-White style */}
        <div className="form-card" style={{ margin: 0 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "1.05rem", fontWeight: 700 }}>
            เมนูลัดการจัดการ
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <Link
              to="/assets"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px",
                backgroundColor: "#f0fdf4",
                borderRadius: "8px",
                border: "1px solid #d1fae5",
                fontSize: "0.88rem",
                fontWeight: 600,
                color: "#064e3b",
                transition: "all 0.15s ease",
              }}
            >
              <Package size={18} color="#059669" />
              <span>ค้นหาครุภัณฑ์</span>
            </Link>

            <Link
              to="/transfers"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px",
                backgroundColor: "#f0fdfa",
                borderRadius: "8px",
                border: "1px solid #ccfbf1",
                fontSize: "0.88rem",
                fontWeight: 600,
                color: "#115e59",
                transition: "all 0.15s ease",
              }}
            >
              <ArrowLeftRight size={18} color="#0d9488" />
              <span>ยืม / คืน ครุภัณฑ์</span>
            </Link>

            <Link
              to="/categories"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px",
                backgroundColor: "#f0fdf4",
                borderRadius: "8px",
                border: "1px solid #d1fae5",
                fontSize: "0.88rem",
                fontWeight: 600,
                color: "#064e3b",
                transition: "all 0.15s ease",
              }}
            >
              <Layers size={18} color="#059669" />
              <span>หมวดหมู่ครุภัณฑ์</span>
            </Link>

            <Link
              to="/locations"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px",
                backgroundColor: "#f0fdf4",
                borderRadius: "8px",
                border: "1px solid #d1fae5",
                fontSize: "0.88rem",
                fontWeight: 600,
                color: "#064e3b",
                transition: "all 0.15s ease",
              }}
            >
              <MapPin size={18} color="#059669" />
              <span>สถานที่ / ห้อง</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4. Recent Assets Table */}
      <div className="table-card">
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e2ece6",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
            รายการครุภัณฑ์ล่าสุด
          </h3>
          <Link
            to="/assets"
            style={{
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "#059669",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>ดูทั้งหมด</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th>เลขครุภัณฑ์</th>
                <th>รายการครุภัณฑ์</th>
                <th>หมวดหมู่</th>
                <th>สถานที่</th>
                <th>ผู้รับผิดชอบ</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="table-empty-row">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : recentAssets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-empty-row">
                    ยังไม่มีข้อมูลครุภัณฑ์ในระบบ
                  </td>
                </tr>
              ) : (
                recentAssets.map((asset) => {
                  const code = asset.asset_code || "-";
                  const categoryName = asset.asset_categories?.category_name || "ครุภัณฑ์ทั่วไป";
                  const roomText = asset.rooms?.room_name || "ห้องธุรการและสารบรรณ";

                  return (
                    <tr key={asset.asset_code}>
                      <td style={{ fontWeight: 700, fontFamily: "monospace" }}>
                        <Link to={`/asset/${encodeURIComponent(code)}`} style={{ color: "#0f291e" }}>
                          {code}
                        </Link>
                      </td>
                      <td style={{ fontWeight: 600, color: "#0f291e" }}>{asset.name}</td>
                      <td>
                        <span className="category-pill">{categoryName}</span>
                      </td>
                      <td>{roomText}</td>
                      <td>{asset.responsible_person || "-"}</td>
                      <td>
                        <StatusBadge status={asset.status || "normal"} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
