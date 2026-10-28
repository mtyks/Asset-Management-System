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
  Layers,
  MapPin,
  UserCheck,
  ArrowLeftRight,
  FileSpreadsheet,
  Calendar,
  Sparkles,
  ExternalLink,
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
        setRecentAssets(assets.slice(0, 5));
      }).catch(() => {}),
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

  // 1. หมวดหมู่ครุภัณฑ์ (Category Distribution)
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

  // 2. สถานที่ / ห้องประจำ (Location Distribution)
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
      pct: totalCount > 0 ? Math.round((locationMap[label] / totalCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 3. ผู้รับผิดชอบดูแลครุภัณฑ์ (Custody / Responsible Persons Breakdown)
  const responsibleMap = {};
  for (const a of allAssets) {
    const person = (a.responsible_person || "ส่วนกลาง / ไม่ระบุ").trim();
    responsibleMap[person] = (responsibleMap[person] || 0) + 1;
  }
  const responsibleStats = Object.keys(responsibleMap)
    .map((name) => ({
      name,
      count: responsibleMap[name],
      pct: totalCount > 0 ? Math.round((responsibleMap[name] / totalCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 4. รายการครุภัณฑ์ที่อยู่ระหว่างการยืมใช้งานจริง (Active Loaned Assets)
  const borrowedAssets = allAssets.filter((a) => a.status === "borrowed");

  return (
    <div className="page-container">
      {/* 1. Header Row */}
      <div className="page-heading-row">
        <div className="page-title-group">
          <h1>Dashboard ภาพรวมระบบครุภัณฑ์</h1>
          <p className="page-subtitle">
            รายงานสถิติสินทรัพย์ การกระจายตัวตามสถานที่ และรายการเคลื่อนไหวล่าสุด
          </p>
        </div>

        <div className="page-actions-group">
          <Link to="/assets/new" className="btn btn-primary">
            <Plus size={16} strokeWidth={2.5} />
            <span>เพิ่มครุภัณฑ์ใหม่</span>
          </Link>
          <Link to="/assets" className="btn btn-outline-white">
            <Package size={16} className="btn-icon-green" />
            <span>ค้นหาครุภัณฑ์</span>
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
      <div className="stats-summary-grid">
        {/* Total Assets */}
        <div className="stat-box">
          <div className="stat-box-icon total">
            <Package size={22} />
          </div>
          <div className="stat-box-body">
            <div className="stat-box-label">ครุภัณฑ์ทั้งหมดในทะเบียน</div>
            <div className="stat-box-val-row">
              <span className="stat-box-number">{totalCount.toLocaleString()}</span>
              <span className="stat-box-unit">ชิ้น</span>
            </div>
          </div>
        </div>

        {/* Normal / Ready */}
        <div className="stat-box">
          <div className="stat-box-icon normal">
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-box-body">
            <div className="stat-box-label">พร้อมใช้งานปกติ ({normalPct}%)</div>
            <div className="stat-box-val-row">
              <span className="stat-box-number normal">{normalCount.toLocaleString()}</span>
              <span className="stat-box-unit">ชิ้น</span>
            </div>
          </div>
        </div>

        {/* Borrowed */}
        <div className="stat-box">
          <div className="stat-box-icon borrow">
            <Inbox size={22} />
          </div>
          <div className="stat-box-body">
            <div className="stat-box-label">อยู่ระหว่างยืมใช้งาน ({borrowedPct}%)</div>
            <div className="stat-box-val-row">
              <span className="stat-box-number borrow">{borrowedCount.toLocaleString()}</span>
              <span className="stat-box-unit">ชิ้น</span>
            </div>
          </div>
        </div>

        {/* In Repair / Damaged */}
        <div className="stat-box">
          <div className="stat-box-icon repair">
            <Wrench size={22} />
          </div>
          <div className="stat-box-body">
            <div className="stat-box-label">ชำรุด / ส่งซ่อม ({repairPct}%)</div>
            <div className="stat-box-val-row">
              <span className="stat-box-number repair">{repairCount.toLocaleString()}</span>
              <span className="stat-box-unit">ชิ้น</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Three Non-Overlapping Analytical Breakdown Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        {/* Card 1: สัดส่วนตามหมวดหมู่ครุภัณฑ์ */}
        <div className="analytics-card" style={{ margin: 0 }}>
          <div className="analytics-card-header">
            <h3 className="analytics-card-title">
              <Layers size={18} color="#059669" />
              <span>การกระจายตามหมวดหมู่</span>
            </h3>
            <span className="analytics-card-badge">{categoryStats.length} หมวดหมู่</span>
          </div>

          {categoryStats.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: 0 }}>
              ยังไม่มีข้อมูลหมวดหมู่ครุภัณฑ์ในระบบ
            </p>
          ) : (
            categoryStats.slice(0, 4).map((cat) => (
              <div key={cat.name} className="analytics-item-row">
                <div className="analytics-item-header">
                  <span className="analytics-item-name">{cat.name}</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span className="analytics-item-val">{cat.count}</span>
                    <span className="analytics-item-sub">ชิ้น ({cat.pct}%)</span>
                  </div>
                </div>
                <div className="analytics-bar-track">
                  <div
                    className="analytics-bar-fill emerald"
                    style={{ width: `${Math.max(5, cat.pct)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Card 2: สัดส่วนตามสถานที่และห้องประจำ */}
        <div className="analytics-card" style={{ margin: 0 }}>
          <div className="analytics-card-header">
            <h3 className="analytics-card-title">
              <MapPin size={18} color="#0d9488" />
              <span>การกระจายตามสถานที่ / ห้อง</span>
            </h3>
            <span className="analytics-card-badge" style={{ backgroundColor: "#f0fdfa", color: "#0d9488" }}>
              {locationStats.length} จุดประจำ
            </span>
          </div>

          {locationStats.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: 0 }}>
              ยังไม่มีข้อมูลสถานที่ครุภัณฑ์ในระบบ
            </p>
          ) : (
            locationStats.slice(0, 4).map((loc) => (
              <div key={loc.name} className="analytics-item-row">
                <div className="analytics-item-header">
                  <span className="analytics-item-name">{loc.name}</span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span className="analytics-item-val" style={{ color: "#0d9488" }}>{loc.count}</span>
                    <span className="analytics-item-sub">ชิ้น ({loc.pct}%)</span>
                  </div>
                </div>
                <div className="analytics-bar-track">
                  <div
                    className="analytics-bar-fill teal"
                    style={{ width: `${Math.max(5, loc.pct)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Card 3: ผู้ถือครองและดูแลครุภัณฑ์สูงสุด (Asset Custodianship) */}
        <div className="analytics-card" style={{ margin: 0 }}>
          <div className="analytics-card-header">
            <h3 className="analytics-card-title">
              <UserCheck size={18} color="#0284c7" />
              <span>ผู้ดูแลรับผิดชอบครุภัณฑ์</span>
            </h3>
            <span className="analytics-card-badge" style={{ backgroundColor: "#f0f9ff", color: "#0284c7" }}>
              {responsibleStats.length} ผู้ถือครอง
            </span>
          </div>

          {responsibleStats.length === 0 ? (
            <p style={{ color: "#94a3b8", fontSize: "0.85rem", margin: 0 }}>
              ยังไม่มีข้อมูลผู้รับผิดชอบในระบบ
            </p>
          ) : (
            responsibleStats.slice(0, 4).map((resp) => (
              <div key={resp.name} className="analytics-item-row">
                <div className="analytics-item-header">
                  <span className="analytics-item-name" style={{ color: "#1e293b" }}>
                    {resp.name}
                  </span>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span className="analytics-item-val" style={{ color: "#0284c7" }}>{resp.count}</span>
                    <span className="analytics-item-sub">ชิ้น ({resp.pct}%)</span>
                  </div>
                </div>
                <div className="analytics-bar-track">
                  <div
                    className="analytics-bar-fill"
                    style={{
                      width: `${Math.max(5, resp.pct)}%`,
                      background: "linear-gradient(90deg, #38bdf8, #0284c7)",
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 4. Bottom Grid: Recent Assets (2/3 width) & Active Loans (1/3 width) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "20px",
        }}
      >
        {/* Left: รายการครุภัณฑ์ล่าสุดที่ตรวจรับเข้าสู่ระบบ */}
        <div className="table-card" style={{ margin: 0 }}>
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
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f291e" }}>
                รายการครุภัณฑ์ตรวจรับล่าสุด
              </h3>
            </div>
            <Link
              to="/assets"
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#059669",
                display: "flex",
                alignItems: "center",
                gap: 4,
                textDecoration: "none",
              }}
            >
              <span>ดูทะเบียนทั้งหมด ({totalCount})</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>เลขครุภัณฑ์</th>
                  <th>ชื่อรายการ</th>
                  <th>หมวดหมู่</th>
                  <th>สถานที่</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="table-empty-row">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : recentAssets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="table-empty-row">
                      ยังไม่มีข้อมูลครุภัณฑ์ในระบบ
                    </td>
                  </tr>
                ) : (
                  recentAssets.map((asset) => {
                    const code = asset.asset_code || "-";
                    const categoryName = asset.asset_categories?.category_name || "ครุภัณฑ์ทั่วไป";
                    const roomText = asset.rooms?.room_name || "ไม่ระบุห้อง";

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
                        <td style={{ fontSize: "0.82rem", color: "#475569" }}>{roomText}</td>
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

        {/* Right: สถานะรายการยืม-คืนที่กำลังดำเนินการ (Active Loans Tracker) */}
        <div className="table-card" style={{ margin: 0, display: "flex", flexDirection: "column" }}>
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
              <ArrowLeftRight size={17} color="#0d9488" />
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f291e" }}>
                การยืมใช้งานที่กำลังดำเนินการ
              </h3>
            </div>
            <Link
              to="/transfers"
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#0d9488",
                display: "flex",
                alignItems: "center",
                gap: 4,
                textDecoration: "none",
              }}
            >
              <span>จัดการยืม-คืน</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ padding: "16px 20px", flex: 1, display: "flex", flexDirection: "column" }}>
            {borrowedAssets.length === 0 ? (
              <div
                style={{
                  margin: "auto 0",
                  textAlign: "center",
                  padding: "24px 16px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    backgroundColor: "#f0fdf4",
                    color: "#059669",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 12,
                  }}
                >
                  <CheckCircle2 size={24} />
                </div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f291e", marginBottom: 4 }}>
                  ไม่มีรายการยืมค้างในขณะนี้
                </div>
                <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 16px", maxWidth: 260 }}>
                  ครุภัณฑ์ทุกรายการอยู่ในสถานที่ประจำพร้อมใช้งานตามปกติ
                </p>
                <Link to="/transfers" className="btn btn-outline-white" style={{ fontSize: "0.82rem" }}>
                  <span>บันทึกการยืมครุภัณฑ์</span>
                </Link>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {borrowedAssets.slice(0, 4).map((b) => (
                  <div
                    key={b.asset_code}
                    style={{
                      padding: "12px",
                      borderRadius: "10px",
                      backgroundColor: "#f8faf9",
                      border: "1px solid #e2ece6",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "#0f291e" }}>
                        {b.name}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "#059669", fontFamily: "monospace" }}>
                        รหัส: {b.asset_code}
                      </div>
                      <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: 2 }}>
                        ผู้รับผิดชอบ: {b.responsible_person || "ไม่ระบุ"}
                      </div>
                    </div>
                    <Link
                      to={`/asset/${encodeURIComponent(b.asset_code)}`}
                      className="btn btn-outline-white"
                      style={{ fontSize: "0.76rem", padding: "4px 10px", flexShrink: 0 }}
                    >
                      <span>รายละเอียด</span>
                    </Link>
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
