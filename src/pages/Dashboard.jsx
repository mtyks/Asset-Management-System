import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getDashboardCounts,
  listAssets,
  listBorrowRecords,
} from "../lib/queries";
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
  ShieldCheck,
  AlertTriangle,
  Layers,
  Building2,
  Clock,
  Activity,
  FileSpreadsheet,
  BellRing,
  UserCheck,
} from "lucide-react";

const CHART_COLORS = [
  "#059669", // Emerald
  "#0284c7", // Sky Blue
  "#7c3aed", // Violet
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#14b8a6", // Teal
];

// Clean SVG Donut Chart Component for Category Distribution
function CategoryDonutChart({ data, total }) {
  const size = 168;
  const strokeWidth = 22;
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;

  let cumulativePct = 0;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
        />
        {data.map((slice, idx) => {
          const pct = total > 0 ? slice.count / total : 0;
          const dashArray = `${pct * circumference} ${circumference}`;
          const dashOffset = -cumulativePct * circumference;
          cumulativePct += pct;
          return (
            <circle
              key={slice.name}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={CHART_COLORS[idx % CHART_COLORS.length]}
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${center} ${center})`}
              style={{ transition: "stroke-dasharray 0.5s ease" }}
            />
          );
        })}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <span style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f291e", lineHeight: 1 }}>
          {total.toLocaleString()}
        </span>
        <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, marginTop: 3 }}>
          ชิ้นทั้งหมด
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [counts, setCounts] = useState({
    total: 0,
    normal: 0,
    borrowed: 0,
    repair: 0,
    damaged: 0,
  });
  const [allAssets, setAllAssets] = useState([]);
  const [activeBorrows, setActiveBorrows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      getDashboardCounts().then(setCounts).catch(() => {}),
      listAssets()
        .then((data) => setAllAssets(data || []))
        .catch(() => {}),
      listBorrowRecords()
        .then((records) => {
          const active = (records || []).filter((r) => !r.returned_at);
          setActiveBorrows(active);
        })
        .catch(() => {}),
    ])
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const totalCount = counts.total || 0;
  const normalCount = counts.normal || 0;
  const borrowedCount = counts.borrowed || 0;
  const repairOnlyCount = counts.repair || 0;
  const damagedOnlyCount = counts.damaged || 0;
  const issueCount = repairOnlyCount + damagedOnlyCount;

  // Readiness Percentage (Normal + Borrowed are both functional assets)
  const readyPct =
    totalCount > 0 ? Math.round(((normalCount + borrowedCount) / totalCount) * 100) : 100;
  const normalPct = totalCount > 0 ? Math.round((normalCount / totalCount) * 100) : 0;
  const borrowedPct = totalCount > 0 ? Math.round((borrowedCount / totalCount) * 100) : 0;
  const issuePct = totalCount > 0 ? Math.round((issueCount / totalCount) * 100) : 0;

  // 1. หมวดหมู่ครุภัณฑ์ (สำหรับ Donut Chart)
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

  // 2. ความหนาแน่นรายห้อง + สุขภาพครุภัณฑ์ในแต่ละห้อง
  const roomDetailsMap = {};
  for (const a of allAssets) {
    const rName = a.rooms?.room_name || "ไม่ระบุห้อง";
    const bName = a.rooms?.buildings?.name || "อาคารหลัก";
    const key = `${rName}__${bName}`;
    if (!roomDetailsMap[key]) {
      roomDetailsMap[key] = {
        roomName: rName,
        buildingName: bName,
        total: 0,
        normal: 0,
        issue: 0,
      };
    }
    roomDetailsMap[key].total += 1;
    if (a.status === "repair" || a.status === "damaged") {
      roomDetailsMap[key].issue += 1;
    } else {
      roomDetailsMap[key].normal += 1;
    }
  }
  const roomCards = Object.values(roomDetailsMap).sort((a, b) => b.total - a.total);

  // 3. รายการที่ต้องติดตามด่วน (เฉพาะครุภัณฑ์ที่ส่งซ่อม/ชำรุด ไม่ซ้ำกับตารางทะเบียนทั่วไป)
  const attentionAssets = allAssets
    .filter((a) => a.status === "repair" || a.status === "damaged")
    .slice(0, 5);

  return (
    <div className="page-container">
      {/* 1. Top Command Bar */}
      <div className="page-heading-row" style={{ marginBottom: 20 }}>
        <div className="page-title-group">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span
              style={{
                backgroundColor: "#ecfdf5",
                color: "#059669",
                fontSize: "0.74rem",
                fontWeight: 800,
                padding: "3px 9px",
                borderRadius: 999,
                letterSpacing: "0.04em",
              }}
            >
              SMART ASSET OVERVIEW
            </span>
          </div>
          <h1 style={{ fontSize: "1.55rem", fontWeight: 800, letterSpacing: "-0.02em", margin: 0 }}>
            ศูนย์ควบคุมและวิเคราะห์ภาพรวมครุภัณฑ์
          </h1>
          <p className="page-subtitle" style={{ marginTop: 4 }}>
            สรุปดัชนีความพร้อมใช้งาน สัดส่วนหมวดหมู่ แผนผังประจำห้อง และรายการที่ต้องติดตามด่วน
          </p>
        </div>

        <div className="page-actions-group">
          <Link to="/scan" className="btn btn-outline-white">
            <QrCode size={16} />
            <span>สแกน QR</span>
          </Link>
          <Link to="/import" className="btn btn-outline-white">
            <FileSpreadsheet size={16} />
            <span>นำเข้า Excel</span>
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

      {/* 2. Unified Asset Health & Readiness Hero Strip (No Repetitive Boxes) */}
      <div className="dash-health-hero">
        <div className="dash-health-left">
          <div className="dash-health-score-ring">
            <Activity size={24} color="#059669" />
            <div>
              <div className="dash-health-score-val">{readyPct}%</div>
              <div className="dash-health-score-label">ความพร้อมใช้งาน</div>
            </div>
          </div>

          <div className="dash-health-summary-text">
            <div style={{ fontSize: "0.84rem", color: "#64748b", fontWeight: 600 }}>
              ทะเบียนครุภัณฑ์ในระบบทั้งหมด
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 2 }}>
              <span style={{ fontSize: "1.85rem", fontWeight: 800, color: "#0f291e" }}>
                {totalCount.toLocaleString()}
              </span>
              <span style={{ fontSize: "0.88rem", color: "#64748b", fontWeight: 600 }}>
                รายการ ({categoryStats.length} หมวดหมู่ • {roomCards.length} ห้อง)
              </span>
            </div>
          </div>
        </div>

        {/* Visual Segmented Health Bar + Legend Pills */}
        <div className="dash-health-right">
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: 6 }}>
            <span>สัดส่วนสถานะครุภัณฑ์ปัจจุบัน</span>
            <Link to="/assets" style={{ color: "#059669", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span>เปิดตารางทะเบียนทั้งหมด</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* Multi-Segment Bar */}
          <div className="dash-segmented-bar">
            <div
              style={{
                width: `${Math.max(normalCount > 0 ? 8 : 0, normalPct)}%`,
                backgroundColor: "#10b981",
              }}
              title={`พร้อมใช้งานปกติ: ${normalCount} รายการ (${normalPct}%)`}
            />
            <div
              style={{
                width: `${Math.max(borrowedCount > 0 ? 6 : 0, borrowedPct)}%`,
                backgroundColor: "#f59e0b",
              }}
              title={`กำลังถูกยืม: ${borrowedCount} รายการ (${borrowedPct}%)`}
            />
            <div
              style={{
                width: `${Math.max(issueCount > 0 ? 6 : 0, issuePct)}%`,
                backgroundColor: "#ef4444",
              }}
              title={`ส่งซ่อม/ชำรุด: ${issueCount} รายการ (${issuePct}%)`}
            />
          </div>

          {/* 3 Distinct Status Pills */}
          <div className="dash-health-pills">
            <Link to="/assets" className="dash-status-chip normal">
              <span className="chip-dot" style={{ backgroundColor: "#10b981" }} />
              <span className="chip-label">พร้อมใช้งาน</span>
              <strong className="chip-val">{normalCount.toLocaleString()}</strong>
              <span className="chip-pct">({normalPct}%)</span>
            </Link>

            <Link to="/transfers" className="dash-status-chip borrow">
              <span className="chip-dot" style={{ backgroundColor: "#f59e0b" }} />
              <span className="chip-label">กำลังถูกยืม</span>
              <strong className="chip-val">{borrowedCount.toLocaleString()}</strong>
              <span className="chip-pct">({borrowedPct}%)</span>
            </Link>

            <Link to="/maintenance" className="dash-status-chip issue">
              <span className="chip-dot" style={{ backgroundColor: "#ef4444" }} />
              <span className="chip-label">ส่งซ่อม / ชำรุด</span>
              <strong className="chip-val">{issueCount.toLocaleString()}</strong>
              <span className="chip-pct">({issuePct}%)</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. Bento Grid Row 1: Category Donut Chart (Left) + Active Watchlist & Borrows (Right) */}
      <div className="dash-bento-grid">
        {/* Widget A: แผนภูมิวงแหวนสัดส่วนหมวดหมู่ (Donut Chart + Legend) */}
        <div className="dash-panel">
          <div className="dash-panel-header">
            <h3 className="dash-panel-title">
              <div className="dash-panel-icon-box">
                <Layers size={16} />
              </div>
              <span>โครงสร้างหมวดหมู่ครุภัณฑ์</span>
            </h3>
            <Link to="/categories" className="dash-panel-link">
              <span>จัดการหมวดหมู่</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="table-empty-row">กำลังประมวลผลแผนภูมิ...</div>
          ) : categoryStats.length === 0 ? (
            <div className="table-empty-row">ยังไม่มีข้อมูลหมวดหมู่ครุภัณฑ์</div>
          ) : (
            <div className="dash-donut-layout">
              <CategoryDonutChart data={categoryStats.slice(0, 6)} total={totalCount} />

              <div className="dash-donut-legend">
                {categoryStats.slice(0, 6).map((cat, idx) => {
                  const color = CHART_COLORS[idx % CHART_COLORS.length];
                  return (
                    <div key={cat.name} className="dash-legend-row">
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 3,
                            backgroundColor: color,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: "0.84rem",
                            fontWeight: 600,
                            color: "#1e293b",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {cat.name}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <strong style={{ fontSize: "0.86rem", color: "#0f172a" }}>
                          {cat.count} ชิ้น
                        </strong>
                        <span
                          style={{
                            fontSize: "0.73rem",
                            fontWeight: 700,
                            color: "#64748b",
                            backgroundColor: "#f1f5f9",
                            padding: "1px 6px",
                            borderRadius: 999,
                            minWidth: 42,
                            textAlign: "center",
                          }}
                        >
                          {cat.pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Widget B: รายการเฝ้าระวัง & ติดตามด่วน (ครุภัณฑ์ซ่อม/ชำรุด + ยืมยังไม่คืน) */}
        <div className="dash-panel">
          <div className="dash-panel-header">
            <h3 className="dash-panel-title">
              <div
                className="dash-panel-icon-box"
                style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}
              >
                <BellRing size={16} />
              </div>
              <span>รายการที่ต้องติดตามด่วน (Watchlist)</span>
            </h3>
            <Link
              to="/maintenance"
              className="dash-panel-link"
              style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}
            >
              <span>ไปหน้าระบบแจ้งซ่อม</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="dash-watchlist-stack">
            {/* Active Borrowed Items Alert */}
            {activeBorrows.length > 0 && (
              <div className="dash-watchlist-group">
                <div className="dash-watchlist-group-title" style={{ color: "#d97706" }}>
                  <Clock size={14} />
                  <span>กำลังถูกยืมใช้งาน ({activeBorrows.length} รายการ)</span>
                </div>
                {activeBorrows.slice(0, 2).map((b) => (
                  <div key={b.id} className="dash-watchlist-item borrow">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a" }}>
                        {b.assets?.name || b.asset_code}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        ผู้ยืม: <strong>{b.borrower_name}</strong>{" "}
                        {b.due_date && (
                          <span>• กำหนดคืน {new Date(b.due_date).toLocaleDateString("th-TH")}</span>
                        )}
                      </div>
                    </div>
                    <Link to="/transfers" className="action-btn-link" style={{ fontSize: "0.74rem" }}>
                      รับคืน
                    </Link>
                  </div>
                ))}
              </div>
            )}

            {/* Assets in Repair / Damaged */}
            <div className="dash-watchlist-group">
              <div className="dash-watchlist-group-title" style={{ color: "#dc2626" }}>
                <Wrench size={14} />
                <span>ครุภัณฑ์สถานะส่งซ่อม / ชำรุด ({issueCount} รายการ)</span>
              </div>

              {attentionAssets.length === 0 ? (
                <div
                  style={{
                    backgroundColor: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: 10,
                    padding: "14px",
                    color: "#166534",
                    fontSize: "0.83rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <CheckCircle2 size={18} />
                  <span>ครุภัณฑ์ทุกรายการอยู่ในสภาพปกติ ไม่มีรายการชำรุดค้างในทะเบียน</span>
                </div>
              ) : (
                attentionAssets.map((a) => (
                  <div key={a.asset_code} className="dash-watchlist-item issue">
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Link
                          to={`/asset/${encodeURIComponent(a.asset_code)}`}
                          style={{
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            color: "#0f291e",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {a.name}
                        </Link>
                        <span
                          style={{
                            fontFamily: "monospace",
                            fontSize: "0.73rem",
                            color: "#059669",
                            fontWeight: 700,
                          }}
                        >
                          ({a.asset_code})
                        </span>
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 2 }}>
                        📍 {a.rooms?.room_name || "ไม่ระบุห้อง"}
                      </div>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bento Grid Row 2: Visual Room & Building Capacity Cards */}
      <div className="dash-panel" style={{ marginTop: 20 }}>
        <div className="dash-panel-header">
          <h3 className="dash-panel-title">
            <div
              className="dash-panel-icon-box"
              style={{ backgroundColor: "#f0fdfa", color: "#0d9488" }}
            >
              <Building2 size={16} />
            </div>
            <span>แผนผังการกระจายครุภัณฑ์ตามห้องและอาคาร (Location Matrix)</span>
          </h3>
          <Link
            to="/locations"
            className="dash-panel-link"
            style={{ backgroundColor: "#f0fdfa", color: "#0d9488" }}
          >
            <span>จัดการอาคารและห้อง</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {roomCards.length === 0 ? (
          <div className="table-empty-row">ยังไม่มีข้อมูลสถานที่จัดเก็บ</div>
        ) : (
          <div className="dash-room-matrix">
            {roomCards.slice(0, 8).map((rm) => (
              <div key={`${rm.roomName}-${rm.buildingName}`} className="dash-room-card">
                <div className="dash-room-card-top">
                  <div className="dash-room-icon">
                    <MapPin size={16} />
                  </div>
                  <span className="dash-room-total">{rm.total} ชิ้น</span>
                </div>
                <div className="dash-room-name" title={rm.roomName}>
                  {rm.roomName}
                </div>
                <div className="dash-room-building">{rm.buildingName}</div>

                <div className="dash-room-status-row">
                  <span style={{ color: "#059669", fontWeight: 700 }}>
                    ● ปกติ {rm.normal}
                  </span>
                  {rm.issue > 0 ? (
                    <span style={{ color: "#dc2626", fontWeight: 700 }}>
                      ● ซ่อม/ชำรุด {rm.issue}
                    </span>
                  ) : (
                    <span style={{ color: "#94a3b8" }}>พร้อมใช้ 100%</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
