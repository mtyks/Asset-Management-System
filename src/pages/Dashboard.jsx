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
  FolderOpen,
  MapPin,
  Clock,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Building2,
} from "lucide-react";

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
      listAssets().then((data) => {
        const assets = data || [];
        setAllAssets(assets);
        setRecentAssets(assets.slice(0, 6));
      }).catch(() => {}),
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

  // 1. หมวดหมู่ครุภัณฑ์ (Category Distribution Tiles)
  const categoryMap = {};
  for (const a of allAssets) {
    const catName = a.asset_categories?.category_name || "ครุภัณฑ์ทั่วไป";
    categoryMap[catName] = (categoryMap[catName] || 0) + 1;
  }
  const categoryStats = Object.keys(categoryMap)
    .map((name) => ({
      name,
      count: categoryMap[name],
    }))
    .sort((a, b) => b.count - a.count);

  // 2. สถานที่ / ห้องประจำ (Location Distribution List)
  const locationMap = {};
  for (const a of allAssets) {
    const rName = a.rooms?.room_name || "ไม่ระบุห้อง";
    const bName = a.rooms?.buildings?.name ? `(${a.rooms.buildings.name})` : "";
    const label = `${rName} ${bName}`.trim();
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
      {/* 1. Header Row */}
      <div className="page-heading-row">
        <div className="page-title-group">
          <h1>Dashboard ภาพรวมระบบครุภัณฑ์</h1>
          <p className="page-subtitle">
            สถิติครุภัณฑ์ การจัดสรรพื้นที่ และสถานะความพร้อมใช้งานของทรัพย์สิน
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

      {error && (
        <div className="form-error-banner" style={{ marginBottom: 20 }}>
          โหลดข้อมูลไม่สำเร็จ: {error}
        </div>
      )}

      {/* 2. Top Summary KPI Cards (4 distinct metrics) */}
      <div className="dashboard-kpi-grid">
        {/* Total Assets */}
        <div className="kpi-card total">
          <div className="kpi-card-content">
            <span className="kpi-card-label">ครุภัณฑ์ทั้งหมด</span>
            <div className="kpi-card-value">
              {totalCount.toLocaleString()}
              <span className="kpi-card-unit">รายการ</span>
            </div>
            <span className="kpi-card-badge total">ทะเบียนในระบบ</span>
          </div>
          <div className="kpi-card-icon total">
            <Package size={24} />
          </div>
        </div>

        {/* Normal / Ready */}
        <div className="kpi-card normal">
          <div className="kpi-card-content">
            <span className="kpi-card-label">พร้อมใช้งานปกติ</span>
            <div className="kpi-card-value" style={{ color: "#059669" }}>
              {normalCount.toLocaleString()}
              <span className="kpi-card-unit">รายการ</span>
            </div>
            <span className="kpi-card-badge normal">
              <ShieldCheck size={12} />
              พร้อมใช้ {normalPct}%
            </span>
          </div>
          <div className="kpi-card-icon normal">
            <CheckCircle2 size={24} />
          </div>
        </div>

        {/* Borrowed */}
        <div className="kpi-card borrow">
          <div className="kpi-card-content">
            <span className="kpi-card-label">อยู่ระหว่างยืมใช้งาน</span>
            <div className="kpi-card-value" style={{ color: "#d97706" }}>
              {borrowedCount.toLocaleString()}
              <span className="kpi-card-unit">รายการ</span>
            </div>
            <span className="kpi-card-badge borrow">
              <ArrowLeftRight size={12} />
              ยืมออก {borrowedPct}%
            </span>
          </div>
          <div className="kpi-card-icon borrow">
            <ArrowLeftRight size={24} />
          </div>
        </div>

        {/* Repair / Damaged */}
        <div className="kpi-card repair">
          <div className="kpi-card-content">
            <span className="kpi-card-label">ส่งซ่อม / ชำรุด</span>
            <div className="kpi-card-value" style={{ color: "#dc2626" }}>
              {repairCount.toLocaleString()}
              <span className="kpi-card-unit">รายการ</span>
            </div>
            <span className="kpi-card-badge repair">
              <AlertTriangle size={12} />
              {repairCount > 0 ? "ต้องดำเนินการ" : "ไม่มีครุภัณฑ์เสีย"}
            </span>
          </div>
          <div className="kpi-card-icon repair">
            <Wrench size={24} />
          </div>
        </div>
      </div>

      {/* 3. Middle Section: Two Distinct Perspectives (Visual Tiles vs Room List) */}
      <div className="dashboard-section-row">
        {/* Panel 1: หมวดหมู่ครุภัณฑ์ (Category Visual Tiles) */}
        <div className="dash-panel">
          <div className="dash-panel-header">
            <h3 className="dash-panel-title">
              <FolderOpen size={18} color="#059669" />
              <span>แยกตามหมวดหมู่ครุภัณฑ์</span>
            </h3>
            <Link to="/assets" className="dash-panel-link">
              <span>ดูทั้งหมด ({categoryStats.length} หมวด)</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {categoryStats.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "auto 0", textAlign: "center", padding: "20px 0" }}>
              ยังไม่มีข้อมูลหมวดหมู่ในระบบ
            </p>
          ) : (
            <div className="category-tiles-grid">
              {categoryStats.slice(0, 6).map((cat) => (
                <Link
                  key={cat.name}
                  to={`/assets`}
                  className="category-tile"
                  title={`ดูรายการในหมวด ${cat.name}`}
                >
                  <div className="category-tile-icon">
                    <Layers size={18} />
                  </div>
                  <div className="category-tile-name">{cat.name}</div>
                  <div className="category-tile-count">
                    {cat.count}
                    <span className="category-tile-unit">ชิ้น</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Panel 2: สถานที่จัดเก็บและห้องประจำ (Location Overview) */}
        <div className="dash-panel">
          <div className="dash-panel-header">
            <h3 className="dash-panel-title">
              <Building2 size={18} color="#0d9488" />
              <span>สถานที่จัดเก็บและห้องประจำ</span>
            </h3>
            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>
              {locationStats.length} จุดจัดเก็บ
            </span>
          </div>

          {locationStats.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: "auto 0", textAlign: "center", padding: "20px 0" }}>
              ยังไม่มีข้อมูลสถานที่ในระบบ
            </p>
          ) : (
            <div className="location-list">
              {locationStats.slice(0, 4).map((loc) => (
                <div key={loc.name} className="location-item">
                  <div className="location-info">
                    <div className="location-icon">
                      <MapPin size={16} />
                    </div>
                    <span className="location-name">{loc.name}</span>
                  </div>
                  <span className="location-badge">
                    {loc.count} รายการ
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 4. Bottom Section: Operational Panels (Recent Items Table + Readiness Status) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr",
          gap: "20px",
        }}
        className="bottom-operational-grid"
      >
        {/* Left: รายการครุภัณฑ์ตรวจรับล่าสุด */}
        <div className="dash-panel" style={{ padding: 0, overflow: "hidden" }}>
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid #e2ece6",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={17} color="#059669" />
              <h3 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 700, color: "#0f291e" }}>
                ครุภัณฑ์ตรวจรับล่าสุด
              </h3>
            </div>
            <Link to="/assets" className="dash-panel-link">
              <span>ดูทะเบียนทั้งหมด</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>เลขครุภัณฑ์</th>
                  <th>ชื่อรายการ</th>
                  <th>สถานที่</th>
                  <th>สถานะ</th>
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
                    const roomText = asset.rooms?.room_name || "ไม่ระบุห้อง";

                    return (
                      <tr key={asset.asset_code}>
                        <td style={{ fontWeight: 700, fontFamily: "monospace" }}>
                          <Link to={`/asset/${encodeURIComponent(code)}`} style={{ color: "#059669" }}>
                            {code}
                          </Link>
                        </td>
                        <td style={{ fontWeight: 600, color: "#0f291e" }}>{asset.name}</td>
                        <td style={{ fontSize: "0.82rem", color: "#64748b" }}>{roomText}</td>
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

        {/* Right: สถานะความพร้อมและทางลัดตรวจสอบด่วน */}
        <div className="dash-panel">
          <div className="dash-panel-header">
            <h3 className="dash-panel-title">
              <Clock size={18} color="#059669" />
              <span>ความพร้อมของทรัพย์สิน</span>
            </h3>
          </div>

          {/* Unified Multi-color Health Meter */}
          <div className="health-meter-container">
            <div className="health-meter-header">
              <span className="health-meter-title">อัตราความพร้อมใช้งาน</span>
              <span className="health-meter-val">{normalPct}%</span>
            </div>
            <div className="health-bar-track">
              <div
                className="health-bar-segment ready"
                style={{ width: `${normalPct}%` }}
                title={`พร้อมใช้งาน: ${normalCount} รายการ (${normalPct}%)`}
              />
              <div
                className="health-bar-segment borrowed"
                style={{ width: `${borrowedPct}%` }}
                title={`ยืมใช้งาน: ${borrowedCount} รายการ (${borrowedPct}%)`}
              />
              <div
                className="health-bar-segment repair"
                style={{ width: `${repairPct}%` }}
                title={`ซ่อม/ชำรุด: ${repairCount} รายการ (${repairPct}%)`}
              />
            </div>
          </div>

          {/* Direct Status Navigation Tags */}
          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#475569", marginBottom: 10 }}>
              ทางลัดตรวจสอบตามสถานะ
            </div>
            <div className="health-status-tags">
              <Link to="/assets" className="health-tag ready">
                <span className="health-tag-dot ready" />
                <span>พร้อมใช้งาน ({normalCount})</span>
              </Link>
              <Link to="/transfers" className="health-tag borrowed">
                <span className="health-tag-dot borrowed" />
                <span>กำลังถูกยืม ({borrowedCount})</span>
              </Link>
              <Link to="/repairs" className="health-tag repair">
                <span className="health-tag-dot repair" />
                <span>ส่งซ่อม/ชำรุด ({repairCount})</span>
              </Link>
              <Link to="/scan" className="health-tag" style={{ background: "#f1f5f9", color: "#334155" }}>
                <QrCode size={13} />
                <span>สแกนตรวจนับ</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
