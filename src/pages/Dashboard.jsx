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

      {/* 2. Stat Summary Cards Grid (4 cards) */}
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
                  color: "#334155",
                }}
              >
                <span>ใช้งานปกติ ({normalPct}%)</span>
                <span style={{ fontWeight: 600 }}>{normalCount} ชิ้น</span>
              </div>
              <div style={{ height: "8px", backgroundColor: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
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
                  color: "#334155",
                }}
              >
                <span>ยืมใช้งาน ({borrowedPct}%)</span>
                <span style={{ fontWeight: 600 }}>{borrowedCount} ชิ้น</span>
              </div>
              <div style={{ height: "8px", backgroundColor: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${borrowedPct}%`,
                    backgroundColor: "#3b82f6",
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
                  color: "#334155",
                }}
              >
                <span>ชำรุด / ส่งซ่อม ({repairPct}%)</span>
                <span style={{ fontWeight: 600 }}>{repairCount} ชิ้น</span>
              </div>
              <div style={{ height: "8px", backgroundColor: "#f1f5f9", borderRadius: "999px", overflow: "hidden" }}>
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

        {/* Quick Menu Hub */}
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
                backgroundColor: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "0.88rem",
                fontWeight: 600,
                color: "#1e293b",
              }}
            >
              <Package size={18} color="#2563eb" />
              <span>ค้นหาครุภัณฑ์</span>
            </Link>

            <Link
              to="/transfers"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px",
                backgroundColor: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "0.88rem",
                fontWeight: 600,
                color: "#1e293b",
              }}
            >
              <ArrowLeftRight size={18} color="#0284c7" />
              <span>ยืม / คืน ครุภัณฑ์</span>
            </Link>

            <Link
              to="/categories"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px",
                backgroundColor: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "0.88rem",
                fontWeight: 600,
                color: "#1e293b",
              }}
            >
              <Layers size={18} color="#8b5cf6" />
              <span>หมวดหมู่ครุภัณฑ์</span>
            </Link>

            <Link
              to="/locations"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px",
                backgroundColor: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                fontSize: "0.88rem",
                fontWeight: 600,
                color: "#1e293b",
              }}
            >
              <MapPin size={18} color="#ec4899" />
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
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
              รายการครุภัณฑ์ล่าสุด
            </h3>
          </div>
          <Link
            to="/assets"
            className="btn btn-outline-white"
            style={{ fontSize: "0.8rem", padding: "4px 10px" }}
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
              {recentAssets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-empty-row">
                    ยังไม่มีข้อมูลครุภัณฑ์ในระบบ
                  </td>
                </tr>
              ) : (
                recentAssets.map((asset) => {
                  const code = asset.asset_code || asset.code || "-";
                  const cat = asset.asset_categories?.category_name || asset.asset_categories?.name || "-";
                  const room = asset.rooms?.room_name || "ห้องธุรการและสารบรรณ";
                  return (
                    <tr key={asset.id}>
                      <td>
                        <Link to={`/asset/${code}`} style={{ fontWeight: 700, color: "#0f172a" }}>
                          {code}
                        </Link>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>{asset.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          {asset.color ? `สี ${asset.color}` : "-"}
                        </div>
                      </td>
                      <td>
                        <span className="category-pill">{cat}</span>
                      </td>
                      <td>{room}</td>
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
