import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  listAssets,
  listCategories,
  listRooms,
  getDashboardCounts,
  deleteAsset,
} from "../lib/queries";
import StatusBadge from "../components/StatusBadge";
import {
  Plus,
  FileText,
  FileSpreadsheet,
  Printer,
  Search,
  Package,
  CheckCircle2,
  Inbox,
  Wrench,
  Monitor,
  Laptop,
  Tv,
  Armchair,
  HardDrive,
  Trash2,
  Edit,
  Eye,
  AlertTriangle,
} from "lucide-react";

export default function AssetsList() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    normal: 0,
    borrowed: 0,
    repair: 0,
  });

  const [filters, setFilters] = useState({
    search: "",
    categoryId: "",
    roomId: "",
    status: "",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // โหลด Categories, Rooms และ Counts
  useEffect(() => {
    Promise.all([
      listCategories().then(setCategories).catch(() => {}),
      listRooms().then(setRooms).catch(() => {}),
      getDashboardCounts().then(setCounts).catch(() => {}),
    ]);
  }, []);

  // โหลดรายการครุภัณฑ์ตาม Filter
  const fetchAssets = () => {
    setLoading(true);
    listAssets(filters)
      .then((data) => {
        setAssets(data || []);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAssets();
  }, [filters]);

  // Export CSV
  const handleExportCSV = () => {
    if (!assets || assets.length === 0) {
      alert("ไม่มีข้อมูลสำหรับส่งออก CSV");
      return;
    }

    const headers = [
      "เลขครุภัณฑ์",
      "ชื่อครุภัณฑ์",
      "สี/ยี่ห้อ",
      "หมวดหมู่",
      "สถานที่",
      "ผู้รับผิดชอบ",
      "สถานะ",
      "วันที่ตรวจรับ",
    ];

    const rows = assets.map((a) => {
      const code = a.asset_code || a.code || "-";
      const name = a.name || "-";
      const color = a.color || "-";
      const cat = a.asset_categories?.category_name || "-";
      const loc = a.rooms?.room_name || "-";
      const resp = a.responsible_person || "-";
      const status = a.status === "borrowed" ? "ยืมใช้งาน" : a.status === "repair" ? "ส่งซ่อม" : "ใช้งานปกติ";
      const date = a.received_date || "-";
      return [code, name, color, cat, loc, resp, status, date];
    });

    const csvContent =
      "\uFEFF" +
      [headers.join(","), ...rows.map((r) => r.map((cell) => `"${cell}"`).join(","))].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `assets_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Window
  const handlePrint = () => {
    window.print();
  };

  // ลบครุภัณฑ์
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeletingId(deleteTarget.id);
      await deleteAsset(deleteTarget.id);
      setDeleteTarget(null);
      fetchAssets();
      getDashboardCounts().then(setCounts).catch(() => {});
    } catch (err) {
      alert("ลบไม่สำเร็จ: " + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  // Helper เลือก Icon ตามชื่อ/หมวดหมู่
  const getItemIcon = (name = "", category = "") => {
    const text = (name + " " + category).toLowerCase();
    if (text.includes("notebook") || text.includes("laptop") || text.includes("โน้ตบุ๊ก")) {
      return <Laptop size={20} />;
    }
    if (text.includes("จอ") || text.includes("monitor") || text.includes("display")) {
      return <Tv size={20} />;
    }
    if (text.includes("คอมพิวเตอร์") || text.includes("pc") || text.includes("optiplex")) {
      return <Monitor size={20} />;
    }
    if (text.includes("โต๊ะ") || text.includes("เก้าอี้") || text.includes("ตู้")) {
      return <Armchair size={20} />;
    }
    if (text.includes("server") || text.includes("switch") || text.includes("router")) {
      return <HardDrive size={20} />;
    }
    return <Monitor size={20} />;
  };

  return (
    <div className="page-container">
      {/* 1. Header & Action Row */}
      <div className="page-heading-row">
        <div className="page-title-group">
          <h1>รายการครุภัณฑ์</h1>
          <p className="page-subtitle">
            ค้นหา กรอง ตรวจสอบ และจัดการข้อมูลครุภัณฑ์ทั้งหมดในระบบ
          </p>
        </div>

        <div className="page-actions-group">
          <Link to="/assets/new" className="btn btn-primary">
            <Plus size={16} strokeWidth={2.5} />
            <span>เพิ่มครุภัณฑ์</span>
          </Link>

          <button className="btn btn-outline-white" onClick={handlePrint} title="ส่งออกเป็นเอกสาร PDF A4">
            <FileText size={16} className="btn-icon-red" />
            <span>PDF A4</span>
          </button>

          <button className="btn btn-outline-white" onClick={handleExportCSV} title="ดาวน์โหลดไฟล์ CSV">
            <FileSpreadsheet size={16} className="btn-icon-green" />
            <span>CSV</span>
          </button>

          <button className="btn btn-outline-white" onClick={handlePrint} title="พิมพ์หน้ารายการครุภัณฑ์">
            <Printer size={16} />
            <span>พิมพ์</span>
          </button>
        </div>
      </div>

      {/* 2. Stat Summary Cards Grid (4 cards in a row) */}
      <div className="stats-summary-grid">
        {/* Total */}
        <div className="stat-box">
          <div className="stat-box-icon total">
            <Package size={22} />
          </div>
          <div className="stat-box-body">
            <div className="stat-box-label">ครุภัณฑ์ทั้งหมด</div>
            <div className="stat-box-val-row">
              <span className="stat-box-number">
                {(counts.total ?? 0).toLocaleString()}
              </span>
              <span className="stat-box-unit">ชิ้น</span>
            </div>
          </div>
        </div>

        {/* Normal */}
        <div className="stat-box">
          <div className="stat-box-icon normal">
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-box-body">
            <div className="stat-box-label">ใช้งานปกติ</div>
            <div className="stat-box-val-row">
              <span className="stat-box-number normal">
                {(counts.normal ?? 0).toLocaleString()}
              </span>
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
            <div className="stat-box-label">ยืมใช้งาน</div>
            <div className="stat-box-val-row">
              <span className="stat-box-number borrow">
                {(counts.borrowed ?? 0).toLocaleString()}
              </span>
              <span className="stat-box-unit">ชิ้น</span>
            </div>
          </div>
        </div>

        {/* Repair */}
        <div className="stat-box">
          <div className="stat-box-icon repair">
            <Wrench size={22} />
          </div>
          <div className="stat-box-body">
            <div className="stat-box-label">ส่งซ่อม / ชำรุด</div>
            <div className="stat-box-val-row">
              <span className="stat-box-number repair">
                {(counts.repair ?? 0).toLocaleString()}
              </span>
              <span className="stat-box-unit">ชิ้น</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="filter-toolbar">
        <div className="search-input-wrap">
          <Search size={16} className="search-icon-inside" />
          <input
            type="text"
            className="search-input-field"
            placeholder="ค้นหาเลขครุภัณฑ์, ชื่อ, ยี่ห้อ, รุ่น, ผู้รับ..."
            value={filters.search}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, search: e.target.value }))
            }
          />
        </div>

        <select
          className="filter-select"
          value={filters.categoryId}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, categoryId: e.target.value }))
          }
        >
          <option value="">ทุกหมวดหมู่ครุภัณฑ์</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.category_name}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={filters.roomId}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, roomId: e.target.value }))
          }
        >
          <option value="">ทุกสถานที่ / ห้อง</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.room_name}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={filters.status}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, status: e.target.value }))
          }
        >
          <option value="">ทุกสถานะ</option>
          <option value="normal">ใช้งานปกติ</option>
          <option value="borrowed">ยืมใช้งาน</option>
          <option value="repair">ส่งซ่อม</option>
          <option value="damaged">ชำรุด</option>
          <option value="disposed">จำหน่ายแล้ว</option>
        </select>
      </div>

      {error && <p className="form-error">โหลดข้อมูลไม่สำเร็จ: {error}</p>}
      {loading ? (
        <div className="page-loading">กำลังโหลด...</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>รูป</th>
              <th>รหัส</th>
              <th>ชื่อ</th>
              <th>ประเภท</th>
              <th>สถานะ</th>
              <th>ตำแหน่ง</th>
              <th>ผู้รับผิดชอบ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-row">
                  ยังไม่มีครุภัณฑ์ตามเงื่อนไขที่เลือก
                </td>
              </tr>
            )}
            {assets.map((a) => (
              <tr key={a.id}>
                <td>
                  {a.image_url ? (
                    <img src={a.image_url} alt={a.name} className="row-thumb" />
                  ) : (
                    <span className="row-thumb-placeholder" />
                  )}
                </td>
                <td>{a.asset_code}</td>
                <td>{a.name}</td>
                <td>{a.asset_categories?.category_name || "-"}</td>
                <td>
                  <StatusBadge status={a.status} />
                </td>
                <td>
                  {a.rooms
                    ? `${a.rooms.floors?.buildings?.name || ""} ชั้น ${a.rooms.floors?.floor_number || ""} ห้อง ${a.rooms.room_name}`
                    : "-"}
                </td>
                <td>{a.responsible_person || "-"}</td>
                <td>
                  <Link to={`/asset/${a.asset_code}`} className="link">
                    ดู
                  </Link>
                  {" · "}
                  <Link to={`/assets/${a.id}/edit`} className="link">
                    แก้ไข
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
