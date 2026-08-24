import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboardCounts } from "../lib/queries";

const CARDS = [
  { key: "total", label: "ครุภัณฑ์ทั้งหมด", className: "stat-total" },
  { key: "normal", label: "สถานะปกติ", className: "stat-normal" },
  { key: "repair", label: "อยู่ระหว่างซ่อม", className: "stat-repair" },
  { key: "borrowed", label: "ถูกยืมอยู่", className: "stat-borrowed" },
  { key: "damaged", label: "ชำรุด", className: "stat-damaged" },
  { key: "disposed", label: "รอจำหน่าย", className: "stat-disposed" },
];

export default function Dashboard() {
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getDashboardCounts()
      .then(setCounts)
      .catch((err) => setError(err.message)); // fail-stop: แสดง error ทันที ไม่ปล่อยให้หน้าจอเงียบ
  }, []);

  if (error) return <div className="page-error">โหลดข้อมูลไม่สำเร็จ: {error}</div>;
  if (!counts) return <div className="page-loading">กำลังโหลด...</div>;

  return (
    <div className="page">
      <div className="page-header">
        <h1>ภาพรวมระบบ</h1>
        <Link to="/assets/new" className="btn btn-primary">
          + เพิ่มครุภัณฑ์ใหม่
        </Link>
      </div>

      <div className="stat-grid">
        {CARDS.map((card) => (
          <div key={card.key} className={`stat-card ${card.className}`}>
            <div className="stat-value">{counts[card.key] ?? 0}</div>
            <div className="stat-label">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="quick-links">
        <Link to="/assets" className="btn btn-secondary">
          ดูรายการครุภัณฑ์ทั้งหมด
        </Link>
        <Link to="/scan" className="btn btn-secondary">
          สแกน QR
        </Link>
      </div>
    </div>
  );
}
