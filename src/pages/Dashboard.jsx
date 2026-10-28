import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboardCounts, listAssets } from "../lib/queries";
import StatusBadge from "../components/StatusBadge";
import {
  Package,
  CheckCircle2,
  ArrowLeftRight,
  Wrench,
  Plus,
  QrCode,
  ArrowRight,
  MapPin,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Building2,
  Box,
} from "lucide-react";

const CATEGORY_COLORS = [
  "#10b981", // Emerald
  "#0ea5e9", // Sky Blue
  "#8b5cf6", // Violet
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#14b8a6", // Teal
];

export default function Dashboard() {
  const [counts, setCounts] = useState({
    total: 0,
    normal: 0,
    borrowed: 0,
    repair: 0,
    damaged: 0,
  });
  const [allAssets, setAllAssets] = useState([]);
  const [recentAssets, setRecentAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      getDashboardCounts().then(setCounts).catch(() => {}),
      listAssets()
        .then((data) => {
          const assets = data || [];
          setAllAssets(assets);
          setRecentAssets(assets.slice(0, 7));
        })
        .catch(() => {}),
    ])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const totalCount = counts.total || 0;
  const normalCount = counts.normal || 0;
  const borrowedCount = counts.borrowed || 0;
  const repairCount = (counts.repair || 0) + (counts.damaged || 0);

  const normalPct = totalCount > 0 ? Math.round((normalCount / totalCount) * 100) : 0;
  const borrowedPct = totalCount > 0 ? Math.round((borrowedCount / totalCount) * 100) : 0;
  const repairPct = totalCount > 0 ? Math.round((repairCount / totalCount) * 100) : 0;

  // 1. หมวดหมู่ครุภัณฑ์ (Category Breakdown)
  const categoryMap = {};
  for (const a of allAssets) {
    const catName = a.asset_categories?.category_name || "ครุภัณฑ์ทั่วไป";
    categoryMap[catName] = (categoryMap[catName] || 0) + 1;
  }
  const categoryStats = Object.keys(categoryMap)
    .map((name) => ({
      name,
      count: categoryMap[name],
      pct: totalCount > 0 ? Math.round((categoryMap[name] / totalCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 2. สถานที่จัดเก็บหลัก (Top Locations)
  const locationMap = {};
  for (const a of allAssets) {
    const rName = a.rooms?.room_name || "ไม่ระบุห้อง";
    const bName = a.rooms?.buildings?.name ? `${a.rooms.buildings.name}` : "";
    const label = bName ? `${rName} (${bName})` : rName;
    locationMap[label] = (locationMap[label] || 0) + 1;
  }
  const locationStats = Object.keys(locationMap)
    .map((label) => ({
      name: label,
      count: locationMap[label],
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="page-container">
      {/* 1. Clean Modern Header */}
      <div className="page-heading-row" style={{ marginBottom: 24 }}>
        <div className="page-title-group">
          <h1 style={{ fontSize: "1.55rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            ภาพรวมระบบครุภัณฑ์
          </h1>
          <p className="page-subtitle" style={{ marginTop: 4 }}>
            สรุปสถานะทรัพย์สิน หมวดหมู่ และสถานที่จัดเก็บประจำหน่วยงาน
          </p>
        </div>

        <div className="page-actions-group">
          <Link to="/scan" className="btn btn-outline-white">
            <QrCode size={16} />
            <span>สแกน QR</span>
          </Link>
          <Link to="/assets/new" className="btn btn-primary">
            <Plus size={16} strokeWidth={2.5} />
            <span>เพิ่มครุภัณฑ์ใหม่</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="form-error-banner" style={{ marginBottom: 20 }}>
          โหลดข้อมูลไม่สำเร็จ: {error}
        </div>
      )}

      {/* 2. Top 4 KPI Cards (Interactive & Clean) */}
      <div className="dashboard-kpi-grid">
        {/* Card 1: Total */}
        <Link to="/assets" className="kpi-card">
          <div className="kpi-card-top">
            <div>
              <span className="kpi-card-label">ครุภัณฑ์ทั้งหมด</span>
              <div className="kpi-card-value">
                {totalCount.toLocaleString()}
                <span className="kpi-card-unit">รายการ</span>
              </div>
            </div>
            <div className="kpi-card-icon total">
              <Package size={24} />
            </div>
          </div>
          <div className="kpi-card-footer">
            <span className="kpi-card-badge total">ทะเบียนทั้งหมด</span>
            <span style={{ color: "#64748b", display: "inline-flex", alignItems: "center", gap: 4 }}>
              ดูรายการ <ArrowRight size={13} />
            </span>
          </div>
        </Link>

        {/* Card 2: Ready / Normal */}
        <Link to="/assets" className="kpi-card">
          <div className="kpi-card-top">
            <div>
              <span className="kpi-card-label">พร้อมใช้งานปกติ</span>
              <div className="kpi-card-value" style={{ color: "#059669" }}>
                {normalCount.toLocaleString()}
                <span className="kpi-card-unit">รายการ</span>
              </div>
            </div>
            <div className="kpi-card-icon normal">
              <CheckCircle2 size={24} />
            </div>
          </div>
          <div className="kpi-card-footer">
            <span className="kpi-card-badge normal">
              <ShieldCheck size={12} />
              พร้อมใช้ {normalPct}%
            </span>
            <span style={{ color: "#94a3b8" }}>สภาพปกติ</span>
          </div>
        </Link>

        {/* Card 3: Borrowed */}
        <Link to="/transfers" className="kpi-card">
          <div className="kpi-card-top">
            <div>
              <span className="kpi-card-label">กำลังถูกยืมใช้งาน</span>
              <div className="kpi-card-value" style={{ color: "#d97706" }}>
                {borrowedCount.toLocaleString()}
                <span className="kpi-card-unit">รายการ</span>
              </div>
            </div>
            <div className="kpi-card-icon borrow">
              <ArrowLeftRight size={24} />
            </div>
          </div>
          <div className="kpi-card-footer">
            <span className="kpi-card-badge borrow">ยืมออก {borrowedPct}%</span>
            <span style={{ color: "#64748b", display: "inline-flex", alignItems: "center", gap: 4 }}>
              ระบบยืม-คืน <ArrowRight size={13} />
            </span>
          </div>
        </Link>

        {/* Card 4: Repair / Damaged */}
        <Link to="/assets" className="kpi-card">
          <div className="kpi-card-top">
            <div>
              <span className="kpi-card-label">ส่งซ่อม / ชำรุด</span>
              <div className="kpi-card-value" style={{ color: "#dc2626" }}>
                {repairCount.toLocaleString()}
                <span className="kpi-card-unit">รายการ</span>
              </div>
            </div>
            <div className="kpi-card-icon repair">
              <Wrench size={24} />
            </div>
          </div>
          <div className="kpi-card-footer">
            <span className="kpi-card-badge repair">
              <AlertTriangle size={12} />
              {repairCount > 0 ? `ชำรุด ${repairPct}%` : "ปกติทั้งหมด"}
            </span>
            <span style={{ color: "#94a3b8" }}>
              {repairCount > 0 ? "ต้องตรวจสอบ" : "ไม่มีค้างซ่อม"}
            </span>
          </div>
        </Link>
      </div>

      {/* 3. Main 2-Column Content (Left: Recent Table | Right: Categories & Locations) */}
      <div className="dashboard-main-grid">
        {/* Left Column: รายการครุภัณฑ์ล่าสุด */}
        <div className="dash-panel" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "20px 24px",
              borderBottom: "1px solid #eef2f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h3 className="dash-panel-title">
              <div className="dash-panel-icon-box">
                <Sparkles size={16} />
              </div>
              <span>รายการครุภัณฑ์ล่าสุด</span>
            </h3>
            <Link to="/assets" className="dash-panel-link">
              <span>ดูทั้งหมด</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: 24 }}>ข้อมูลครุภัณฑ์</th>
                  <th>หมวดหมู่</th>
                  <th>สถานที่ตั้ง</th>
                  <th style={{ paddingRight: 24 }}>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="table-empty-row">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : recentAssets.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="table-empty-row">
                      ยังไม่มีข้อมูลครุภัณฑ์ในระบบ
                    </td>
                  </tr>
                ) : (
                  recentAssets.map((asset) => {
                    const code = asset.asset_code || "-";
                    const categoryName = asset.asset_categories?.category_name || "ทั่วไป";
                    const roomText = asset.rooms?.room_name || "ไม่ระบุห้อง";

                    return (
                      <tr key={code}>
                        <td style={{ paddingLeft: 24 }}>
                          <div className="recent-asset-cell">
                            <div className="recent-asset-avatar">
                              <Box size={18} />
                            </div>
                            <div className="recent-asset-info">
                              <Link
                                to={`/asset/${encodeURIComponent(code)}`}
                                className="recent-asset-name"
                              >
                                {asset.name}
                              </Link>
                              <span className="recent-asset-code">{code}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="category-pill">{categoryName}</span>
                        </td>
                        <td style={{ fontSize: "0.84rem", color: "#475569", fontWeight: 500 }}>
                          {roomText}
                        </td>
                        <td style={{ paddingRight: 24 }}>
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

        {/* Right Column: Stacked Summary Cards (Categories + Locations) */}
        <div className="dashboard-side-stack">
          {/* Card A: สัดส่วนตามหมวดหมู่ */}
          <div className="dash-panel">
            <div className="dash-panel-header">
              <h3 className="dash-panel-title">
                <div className="dash-panel-icon-box">
                  <Layers size={16} />
                </div>
                <span>สัดส่วนตามหมวดหมู่</span>
              </h3>
              <Link to="/categories" className="dash-panel-link">
                <span>จัดการ</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {categoryStats.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: "0.85rem", textAlign: "center", margin: "16px 0" }}>
                ยังไม่มีข้อมูลหมวดหมู่
              </p>
            ) : (
              <div className="cat-progress-list">
                {categoryStats.slice(0, 5).map((cat, idx) => {
                  const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
                  return (
                    <div key={cat.name} className="cat-progress-item">
                      <div className="cat-progress-top">
                        <span className="cat-progress-name">
                          <span className="cat-dot" style={{ backgroundColor: color }} />
                          {cat.name}
                        </span>
                        <div className="cat-progress-meta">
                          <span className="cat-progress-count">{cat.count} ชิ้น</span>
                          <span className="cat-progress-pct">({cat.pct}%)</span>
                        </div>
                      </div>
                      <div className="cat-progress-track">
                        <div
                          className="cat-progress-fill"
                          style={{
                            width: `${Math.max(6, cat.pct)}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card B: สถานที่จัดเก็บหลัก */}
          <div className="dash-panel">
            <div className="dash-panel-header">
              <h3 className="dash-panel-title">
                <div
                  className="dash-panel-icon-box"
                  style={{ background: "#f0fdfa", color: "#0d9488" }}
                >
                  <Building2 size={16} />
                </div>
                <span>สถานที่จัดเก็บหลัก</span>
              </h3>
              <Link
                to="/locations"
                className="dash-panel-link"
                style={{ background: "#f0fdfa", color: "#0d9488" }}
              >
                <span>ดูห้องทั้งหมด</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            {locationStats.length === 0 ? (
              <p style={{ color: "#94a3b8", fontSize: "0.85rem", textAlign: "center", margin: "16px 0" }}>
                ยังไม่มีข้อมูลสถานที่จัดเก็บ
              </p>
            ) : (
              <div className="location-list">
                {locationStats.slice(0, 4).map((loc) => (
                  <div key={loc.name} className="location-item">
                    <div className="location-info">
                      <div className="location-icon">
                        <MapPin size={16} />
                      </div>
                      <span className="location-name" title={loc.name}>
                        {loc.name}
                      </span>
                    </div>
                    <span className="location-badge">{loc.count} รายการ</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
