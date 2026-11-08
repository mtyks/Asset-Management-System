import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  listAssets,
  listCategories,
  listRooms,
  getDashboardCounts,
  deleteAsset,
  bulkDeleteAssets,
  updateAssetStatus,
  getRepairHistorySummary,
} from "../lib/queries";
import StatusBadge from "../components/StatusBadge";
import ImportCSVModal from "../components/ImportCSVModal";
import BulkEditModal from "../components/BulkEditModal";
import {
  Plus,
  Upload,
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
  AlertTriangle,
  CheckSquare,
} from "lucide-react";

const ASSETS_FILTER_STORAGE_KEY = "ams_assets_list_filters_v1";

function loadSavedAssetFilters() {
  try {
    const raw = sessionStorage.getItem(ASSETS_FILTER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function AssetsList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get("status");
  const savedState = loadSavedAssetFilters();

  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [counts, setCounts] = useState({
    total: 0,
    normal: 0,
    borrowed: 0,
    repair: 0,
  });

  const [filters, setFilters] = useState(() => ({
    search: savedState?.filters?.search || "",
    categoryId: savedState?.filters?.categoryId || "",
    roomId: savedState?.filters?.roomId || "",
    status:
      urlStatus !== null
        ? urlStatus === "all"
          ? ""
          : urlStatus
        : savedState?.filters?.status || "",
  }));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noticeMessage, setNoticeMessage] = useState("");
  const [deletingCode, setDeletingCode] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [repairCompleteTarget, setRepairCompleteTarget] = useState(null);
  const [repairCompleteNote, setRepairCompleteNote] = useState("ซ่อมบำรุงเสร็จเรียบร้อย กลับมาใช้งานตามปกติ");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [repairSummary, setRepairSummary] = useState({ repairedMap: {}, repairLogs: [] });
  const [showRepairHistoryModal, setShowRepairHistoryModal] = useState(false);
  const [historyModalTab, setHistoryModalTab] = useState("completed");

  // Sync URL query param (?status=...) when navigating from Dashboard
  useEffect(() => {
    if (urlStatus !== null) {
      const mapped = urlStatus === "all" ? "" : urlStatus;
      setFilters((prev) => ({ ...prev, status: mapped }));
      setCurrentPage(1);
    }
  }, [urlStatus]);

  // Multi-Select & Bulk Edit States
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Pagination States (Locked across Edit navigation)
  const [currentPage, setCurrentPage] = useState(() => Number(savedState?.currentPage) || 1);
  const [pageSize, setPageSize] = useState(() => Number(savedState?.pageSize) || 10);

  // บันทึกสถานะตัวกรองและหน้าปัจจุบันไว้ใน sessionStorage เพื่อล็อคค่าเดิมเมื่อกลับมาจากหน้าแก้ไข
  useEffect(() => {
    try {
      sessionStorage.setItem(
        ASSETS_FILTER_STORAGE_KEY,
        JSON.stringify({ filters, currentPage, pageSize })
      );
    } catch {
      // ignore storage errors
    }
  }, [filters, currentPage, pageSize]);

  // โหลด Categories, Rooms และ Counts
  useEffect(() => {
    Promise.all([
      listCategories().then(setCategories).catch(() => {}),
      listRooms().then(setRooms).catch(() => {}),
      getDashboardCounts().then(setCounts).catch(() => {}),
      getRepairHistorySummary().then(setRepairSummary).catch(() => {}),
    ]);
  }, []);

  // โหลดรายการครุภัณฑ์ตาม Filter
  const fetchAssets = () => {
    setLoading(true);
    Promise.all([
      listAssets(filters),
      getRepairHistorySummary().catch(() => ({ repairedMap: {}, repairLogs: [] })),
    ])
      .then(([data, summary]) => {
        setAssets(data || []);
        if (summary) setRepairSummary(summary);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAssets();
  }, [filters]);

  // คำนวณ Pagination
  const totalItems = assets.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = totalItems > 0 ? (currentPage - 1) * pageSize : 0;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentAssets = assets.slice(startIndex, endIndex);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  // Selection Logic
  const isAllSelected = currentAssets.length > 0 && currentAssets.every((a) => selectedCodes.includes(a.asset_code));
  const isSomeSelected = currentAssets.some((a) => selectedCodes.includes(a.asset_code)) && !isAllSelected;

  const toggleSelectAll = () => {
    const pageCodes = currentAssets.map((a) => a.asset_code);
    if (isAllSelected) {
      setSelectedCodes((prev) => prev.filter((c) => !pageCodes.includes(c)));
    } else {
      setSelectedCodes((prev) => Array.from(new Set([...prev, ...pageCodes])));
    }
  };

  const toggleSelectRow = (code) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

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

    const exportRows = selectedCodes.length > 0
      ? assets.filter((a) => selectedCodes.includes(a.asset_code))
      : assets;

    const rows = exportRows.map((a) => {
      const code = a.asset_code || "-";
      const name = a.name || "-";
      const color = a.color || "-";
      const cat = a.asset_categories?.category_name || "-";
      const loc = a.rooms?.room_name || "-";
      const resp = a.responsible_person || "-";
      const status =
        a.status === "borrowed"
          ? "ยืมใช้งาน"
          : a.status === "repair"
          ? "ส่งซ่อม"
          : a.status === "damaged"
          ? "ชำรุด"
          : "ใช้งานปกติ";
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

  // ลบครุภัณฑ์ชิ้นเดียว
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeletingCode(deleteTarget.asset_code);
      await deleteAsset(deleteTarget.asset_code);
      setSelectedCodes((prev) => prev.filter((c) => c !== deleteTarget.asset_code));
      setDeleteTarget(null);
      fetchAssets();
      getDashboardCounts().then(setCounts).catch(() => {});
    } catch (err) {
      alert("ลบไม่สำเร็จ: " + err.message);
    } finally {
      setDeletingCode(null);
    }
  };

  // ลบครุภัณฑ์หลายชิ้นพร้อมกัน
  const confirmBulkDelete = async () => {
    if (selectedCodes.length === 0) return;
    setBulkDeleting(true);
    try {
      await bulkDeleteAssets(selectedCodes);
      setSelectedCodes([]);
      setShowBulkDeleteModal(false);
      fetchAssets();
      getDashboardCounts().then(setCounts).catch(() => {});
    } catch (err) {
      alert("ลบรายการที่เลือกไม่สำเร็จ: " + err.message);
    } finally {
      setBulkDeleting(false);
    }
  };

  // บันทึกซ่อมเสร็จ / เปลี่ยนสถานะกลับเป็นใช้งานปกติ
  const confirmRepairComplete = async () => {
    if (!repairCompleteTarget) return;
    setUpdatingStatus(true);
    try {
      await updateAssetStatus(
        repairCompleteTarget.asset_code,
        "normal",
        repairCompleteNote.trim() || "ซ่อมบำรุงเสร็จเรียบร้อย กลับมาใช้งานตามปกติ"
      );
      setNoticeMessage(
        `บันทึกสถานะ "ใช้งานปกติ (ซ่อมเสร็จ)" สำหรับครุภัณฑ์ "${repairCompleteTarget.name}" (${repairCompleteTarget.asset_code}) เรียบร้อยแล้ว`
      );
      setRepairCompleteTarget(null);
      setRepairCompleteNote("ซ่อมบำรุงเสร็จเรียบร้อย กลับมาใช้งานตามปกติ");
      fetchAssets();
      getDashboardCounts().then(setCounts).catch(() => {});
    } catch (err) {
      alert("อัปเดตสถานะไม่สำเร็จ: " + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleQuickStatusFilter = (statusVal) => {
    setFilters((prev) => ({ ...prev, status: statusVal }));
    setCurrentPage(1);
    if (statusVal) {
      setSearchParams({ status: statusVal });
    } else {
      setSearchParams({});
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

          <button
            className="btn btn-outline-white"
            onClick={() => setShowImportModal(true)}
            title="นำเข้าข้อมูลครุภัณฑ์จากไฟล์ CSV"
          >
            <Upload size={16} className="btn-icon-green" />
            <span>นำเข้า CSV</span>
          </button>

          <button
            className="btn btn-outline-white"
            onClick={handleExportCSV}
            title={selectedCodes.length > 0 ? `ดาวน์โหลด CSV (${selectedCodes.length} รายการที่เลือก)` : "ดาวน์โหลดไฟล์ CSV ทั้งหมด"}
          >
            <FileSpreadsheet size={16} className="btn-icon-green" />
            <span>{selectedCodes.length > 0 ? `ส่งออก (${selectedCodes.length})` : "ส่งออก CSV"}</span>
          </button>

          <button
            className="btn btn-outline-white"
            onClick={handlePrint}
            title="พิมพ์หน้ารายการครุภัณฑ์"
          >
            <Printer size={16} />
            <span>พิมพ์</span>
          </button>
        </div>
      </div>

      {noticeMessage && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            borderRadius: 10,
            backgroundColor: "#ecfdf5",
            border: "1px solid #6ee7b7",
            color: "#065f46",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            fontSize: "0.92rem",
            fontWeight: 600,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={18} color="#059669" />
            <span>{noticeMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setNoticeMessage("")}
            style={{
              background: "transparent",
              border: "none",
              color: "#047857",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.85rem",
            }}
          >
            ปิด
          </button>
        </div>
      )}

      {/* 2. Stat Summary Cards Grid (4 cards in a row - Clickable to Filter) */}
      <div className="stats-summary-grid">
        {/* Total */}
        <div
          className="stat-box"
          onClick={() => handleQuickStatusFilter("")}
          style={{
            cursor: "pointer",
            outline: filters.status === "" ? "2px solid #3b82f6" : "none",
            backgroundColor: filters.status === "" ? "#f8fafc" : undefined,
          }}
          title="คลิกเพื่อแสดงครุภัณฑ์ทั้งหมด"
        >
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
        <div
          className="stat-box"
          onClick={() => handleQuickStatusFilter("normal")}
          style={{
            cursor: "pointer",
            outline: filters.status === "normal" ? "2px solid #10b981" : "none",
            backgroundColor: filters.status === "normal" ? "#f0fdf4" : undefined,
          }}
          title="คลิกเพื่อกรองเฉพาะครุภัณฑ์ที่ใช้งานปกติ"
        >
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
        <div
          className="stat-box"
          onClick={() => handleQuickStatusFilter("borrowed")}
          style={{
            cursor: "pointer",
            outline: filters.status === "borrowed" ? "2px solid #f59e0b" : "none",
            backgroundColor: filters.status === "borrowed" ? "#fffbeb" : undefined,
          }}
          title="คลิกเพื่อกรองเฉพาะครุภัณฑ์ที่ถูกยืมใช้งาน"
        >
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
        <div
          className="stat-box"
          onClick={() => handleQuickStatusFilter("repair_damaged")}
          style={{
            cursor: "pointer",
            outline:
              filters.status === "repair_damaged" ||
              filters.status === "repair" ||
              filters.status === "damaged"
                ? "2px solid #ef4444"
                : "none",
            backgroundColor:
              filters.status === "repair_damaged" ||
              filters.status === "repair" ||
              filters.status === "damaged"
                ? "#fef2f2"
                : undefined,
          }}
          title="คลิกเพื่อกรองเฉพาะครุภัณฑ์ที่ส่งซ่อม / ชำรุด"
        >
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
            onChange={(e) => {
              setFilters((prev) => ({ ...prev, search: e.target.value }));
              setCurrentPage(1);
            }}
          />
        </div>

        <select
          className="filter-select"
          value={filters.categoryId}
          onChange={(e) => {
            setFilters((prev) => ({ ...prev, categoryId: e.target.value }));
            setCurrentPage(1);
          }}
        >
          <option value="">ทุกหมวดหมู่ครุภัณฑ์</option>
          {categories.map((c) => (
            <option key={c.category_code || c.id} value={c.category_code || c.id}>
              {c.category_name}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={filters.roomId}
          onChange={(e) => {
            setFilters((prev) => ({ ...prev, roomId: e.target.value }));
            setCurrentPage(1);
          }}
        >
          <option value="">ทุกสถานที่ / ห้อง</option>
          {rooms.map((r) => (
            <option key={r.room_code || r.id} value={r.room_code || r.id}>
              {r.room_name}
            </option>
          ))}
        </select>

        <select
          className="filter-select"
          value={filters.status}
          onChange={(e) => {
            handleQuickStatusFilter(e.target.value);
          }}
        >
          <option value="">ทุกสถานะ</option>
          <option value="normal">ใช้งานปกติ</option>
          <option value="borrowed">ยืมใช้งาน</option>
          <option value="repair_damaged">ส่งซ่อม / ชำรุด (ทั้งหมด)</option>
          <option value="repair">ส่งซ่อม</option>
          <option value="damaged">ชำรุด</option>
          <option value="repaired">ซ่อมเสร็จแล้ว (เคยส่งซ่อม)</option>
        </select>

        <button
          type="button"
          className="btn btn-outline-white"
          onClick={() => {
            setHistoryModalTab("completed");
            setShowRepairHistoryModal(true);
          }}
          style={{
            borderColor: "#a7f3d0",
            backgroundColor: "#ecfdf5",
            color: "#047857",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
          title="ดูประวัติครุภัณฑ์ที่เคยส่งซ่อมและซ่อมเสร็จแล้วทั้งหมด"
        >
          <CheckCircle2 size={16} color="#059669" />
          <span>ประวัติซ่อมเสร็จ</span>
        </button>
      </div>

      {/* แถบสลับดูรายการ กำลังส่งซ่อม vs ซ่อมเสร็จแล้ว เมื่ออยู่ในหมวดส่งซ่อม/ซ่อมเสร็จ */}
      {(filters.status === "repair_damaged" ||
        filters.status === "repair" ||
        filters.status === "damaged" ||
        filters.status === "repaired") && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 16,
            padding: "10px 14px",
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => handleQuickStatusFilter("repair_damaged")}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: "0.86rem",
                fontWeight: 600,
                cursor: "pointer",
                border:
                  filters.status !== "repaired"
                    ? "1px solid #f59e0b"
                    : "1px solid #cbd5e1",
                backgroundColor:
                  filters.status !== "repaired" ? "#fffbeb" : "#ffffff",
                color: filters.status !== "repaired" ? "#b45309" : "#475569",
              }}
            >
              🔧 กำลังส่งซ่อม / ชำรุด ({counts.repair ?? 0} ชิ้น)
            </button>
            <button
              type="button"
              onClick={() => handleQuickStatusFilter("repaired")}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: "0.86rem",
                fontWeight: 600,
                cursor: "pointer",
                border:
                  filters.status === "repaired"
                    ? "1px solid #10b981"
                    : "1px solid #cbd5e1",
                backgroundColor:
                  filters.status === "repaired" ? "#ecfdf5" : "#ffffff",
                color: filters.status === "repaired" ? "#047857" : "#475569",
              }}
            >
              ✓ ซ่อมเสร็จแล้ว / เคยส่งซ่อม (
              {
                Object.values(repairSummary.repairedMap || {}).filter(
                  (x) => x.isRepairedAndNormal
                ).length
              }{" "}
              ชิ้น)
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setHistoryModalTab("all");
              setShowRepairHistoryModal(true);
            }}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: "0.84rem",
              fontWeight: 600,
              cursor: "pointer",
              border: "1px solid #bae6fd",
              backgroundColor: "#f0f9ff",
              color: "#0369a1",
            }}
          >
            📋 ดูตารางประวัติการซ่อมทั้งหมด ({(repairSummary.repairLogs || []).length} รายการ)
          </button>
        </div>
      )}

      {/* Bulk Action Bar (Visible when >= 1 items selected) */}
      {selectedCodes.length > 0 && (
        <div className="bulk-action-bar">
          <div className="bulk-action-info">
            <span className="bulk-badge-count">{selectedCodes.length}</span>
            <span>รายการที่เลือกอยู่</span>
          </div>
          <div className="bulk-action-buttons">
            <button
              type="button"
              className="bulk-btn-edit"
              onClick={() => setShowBulkEditModal(true)}
            >
              <Edit size={15} />
              <span>แก้ไขพร้อมกัน ({selectedCodes.length})</span>
            </button>
            <button
              type="button"
              className="bulk-btn-delete"
              onClick={() => setShowBulkDeleteModal(true)}
            >
              <Trash2 size={15} />
              <span>ลบที่เลือก ({selectedCodes.length})</span>
            </button>
            <button
              type="button"
              className="bulk-btn-clear"
              onClick={() => setSelectedCodes([])}
            >
              <span>ยกเลิก</span>
            </button>
          </div>
        </div>
      )}

      {error && <div className="form-error-banner">โหลดข้อมูลไม่สำเร็จ: {error}</div>}

      {/* 4. Modern Data Table Card */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th style={{ width: "40px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    className="table-checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    onChange={toggleSelectAll}
                    title="เลือกทั้งหมดในหน้านี้"
                  />
                </th>
                <th style={{ width: "60px", textAlign: "center" }}>รูป</th>
                <th style={{ minWidth: "140px" }}>เลขครุภัณฑ์</th>
                <th style={{ minWidth: "180px" }}>รายการครุภัณฑ์</th>
                <th style={{ minWidth: "130px" }}>หมวดหมู่</th>
                <th style={{ minWidth: "150px" }}>สถานที่</th>
                <th style={{ minWidth: "120px" }}>ผู้รับผิดชอบ</th>
                <th style={{ minWidth: "110px" }}>สถานะ</th>
                <th style={{ minWidth: "120px", textAlign: "right" }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="table-empty-row">
                    กำลังโหลดข้อมูลครุภัณฑ์...
                  </td>
                </tr>
              ) : currentAssets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="table-empty-row">
                    ไม่พบรายการครุภัณฑ์ตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                currentAssets.map((asset) => {
                  const code = asset.asset_code || "-";
                  const categoryName = asset.asset_categories?.category_name || "ครุภัณฑ์ทั่วไป";
                  const roomText = asset.rooms?.room_name || "ห้องธุรการและสารบรรณ";
                  const isSelected = selectedCodes.includes(asset.asset_code);

                  return (
                    <tr
                      key={asset.asset_code}
                      style={{
                        backgroundColor: isSelected ? "#f0fdf4" : undefined,
                        transition: "background-color 0.15s ease",
                      }}
                    >
                      {/* Checkbox Column */}
                      <td style={{ textAlign: "center", width: "40px" }}>
                        <input
                          type="checkbox"
                          className="table-checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(asset.asset_code)}
                        />
                      </td>

                      {/* รูปภาพ Thumbnail ล็อคขนาด 44x44 เสมอ */}
                      <td style={{ textAlign: "center", width: "60px" }}>
                        <div className="asset-thumb-box">
                          {asset.image_url ? (
                            <img
                              src={asset.image_url}
                              alt={asset.name}
                              className="asset-thumb-img"
                            />
                          ) : (
                            getItemIcon(asset.name, categoryName)
                          )}
                        </div>
                      </td>

                      {/* เลขครุภัณฑ์ */}
                      <td>
                        <div className="asset-code-cell">
                          <Link
                            to={`/asset/${encodeURIComponent(code)}`}
                            className="asset-code-main"
                            title="ดูรายละเอียด"
                          >
                            {code}
                          </Link>
                        </div>
                      </td>

                      {/* รายการครุภัณฑ์ */}
                      <td>
                        <div className="asset-name-cell">
                          <Link
                            to={`/asset/${encodeURIComponent(code)}`}
                            className="asset-name-main"
                          >
                            {asset.name}
                          </Link>
                          <span className="asset-name-sub">
                            {asset.color ? `สี/ยี่ห้อ: ${asset.color}` : ""}
                          </span>
                        </div>
                      </td>

                      {/* หมวดหมู่ */}
                      <td>
                        <span className="category-pill">{categoryName}</span>
                      </td>

                      {/* สถานที่ */}
                      <td>
                        <span style={{ fontSize: "0.94rem", color: "#475569" }}>
                          {roomText}
                        </span>
                      </td>

                      {/* ผู้รับผิดชอบ */}
                      <td>
                        <span style={{ fontSize: "0.94rem", color: "#334155" }}>
                          {asset.responsible_person || "ไม่ระบุ"}
                        </span>
                      </td>

                      {/* สถานะ */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                          <StatusBadge status={asset.status || "normal"} />
                          {asset.repair_info?.isRepairedAndNormal && (
                            <span
                              onClick={() => {
                                setHistoryModalTab("completed");
                                setShowRepairHistoryModal(true);
                              }}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                fontSize: "0.74rem",
                                fontWeight: 600,
                                color: "#047857",
                                backgroundColor: "#d1fae5",
                                border: "1px solid #6ee7b7",
                                borderRadius: 6,
                                padding: "2px 7px",
                                cursor: "pointer",
                              }}
                              title={
                                asset.repair_info.lastCompletedNote
                                  ? `ประวัติซ่อมล่าสุด: ${asset.repair_info.lastCompletedNote}`
                                  : "คลิกเพื่อดูประวัติการซ่อม"
                              }
                            >
                              ✓ ซ่อมเสร็จแล้ว
                              {asset.repair_info.lastCompletedAt
                                ? ` (${new Date(asset.repair_info.lastCompletedAt).toLocaleDateString("th-TH")})`
                                : ""}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* จัดการ */}
                      <td>
                        <div className="table-actions" style={{ justifyContent: "flex-end" }}>
                          <Link
                            to={`/assets/${encodeURIComponent(code)}/edit`}
                            className="action-btn-link"
                            title="แก้ไขข้อมูล"
                          >
                            แก้ไข
                          </Link>
                          <button
                            type="button"
                            className="action-btn-link danger"
                            onClick={() => setDeleteTarget(asset)}
                            title="ลบครุภัณฑ์"
                          >
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {!loading && totalItems > 0 && (
          <div className="pagination-wrapper">
            <div className="pagination-info">
              แสดง <strong>{startIndex + 1}</strong> - <strong>{endIndex}</strong> จากทั้งหมด <strong>{totalItems.toLocaleString()}</strong> รายการ
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
              {/* Page Size Selector */}
              <div className="pagination-size-wrap">
                <span>แสดง:</span>
                <select
                  className="pagination-size-select"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={10}>10 รายการ / หน้า</option>
                  <option value={25}>25 รายการ / หน้า</option>
                  <option value={50}>50 รายการ / หน้า</option>
                  <option value={100}>100 รายการ / หน้า</option>
                </select>
              </div>

              {/* Page Navigation Buttons */}
              <div className="pagination-controls">
                <button
                  type="button"
                  className="pagination-btn"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                  title="หน้าแรก"
                >
                  &laquo;
                </button>
                <button
                  type="button"
                  className="pagination-btn"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  title="หน้าก่อนหน้า"
                >
                  &lsaquo;
                </button>

                {/* Numbered Page Buttons */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === totalPages ||
                      (p >= currentPage - 2 && p <= currentPage + 2)
                  )
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    const showEllipsis = prev && p - prev > 1;
                    return (
                      <React.Fragment key={p}>
                        {showEllipsis && (
                          <span style={{ padding: "0 4px", color: "#94a3b8" }}>...</span>
                        )}
                        <button
                          type="button"
                          className={`pagination-btn ${p === currentPage ? "active" : ""}`}
                          onClick={() => setCurrentPage(p)}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  type="button"
                  className="pagination-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  title="หน้าถัดไป"
                >
                  &rsaquo;
                </button>
                <button
                  type="button"
                  className="pagination-btn"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  title="หน้าสุดท้าย"
                >
                  &raquo;
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Single Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: "#fef2f2",
                    color: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AlertTriangle size={20} />
                </div>
                <h3 className="modal-title" style={{ margin: 0 }}>
                  ยืนยันการลบครุภัณฑ์
                </h3>
              </div>
            </div>

            <p style={{ fontSize: "0.9rem", color: "#475569", margin: "14px 0 20px" }}>
              คุณแน่ใจหรือไม่ว่าต้องการลบครุภัณฑ์{" "}
              <strong>"{deleteTarget.name}"</strong> (รหัส:{" "}
              <strong>{deleteTarget.asset_code}</strong>)?
              การกระทำนี้ไม่สามารถยกเลิกได้
            </p>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingCode !== null}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ backgroundColor: "#dc2626" }}
                onClick={confirmDelete}
                disabled={deletingCode !== null}
              >
                {deletingCode ? "กำลังลบ..." : "ยืนยันการลบ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowBulkDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: "#fef2f2",
                    color: "#dc2626",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AlertTriangle size={20} />
                </div>
                <h3 className="modal-title" style={{ margin: 0 }}>
                  ยืนยันการลบหลายรายการพร้อมกัน
                </h3>
              </div>
            </div>

            <p style={{ fontSize: "0.9rem", color: "#475569", margin: "14px 0 20px" }}>
              คุณแน่ใจหรือไม่ว่าต้องการลบครุภัณฑ์ที่เลือกทั้งหมดจำนวน{" "}
              <strong style={{ color: "#dc2626" }}>{selectedCodes.length}</strong> รายการ?
              การกระทำนี้ไม่สามารถยกเลิกได้
            </p>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={bulkDeleting}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ backgroundColor: "#dc2626" }}
                onClick={confirmBulkDelete}
                disabled={bulkDeleting}
              >
                {bulkDeleting ? "กำลังลบ..." : `ยืนยันลบ ${selectedCodes.length} รายการ`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Edit Modal */}
      <BulkEditModal
        isOpen={showBulkEditModal}
        onClose={() => setShowBulkEditModal(false)}
        selectedCodes={selectedCodes}
        categories={categories}
        rooms={rooms}
        onSuccess={() => {
          setSelectedCodes([]);
          fetchAssets();
          getDashboardCounts().then(setCounts).catch(() => {});
        }}
      />

      {/* Import CSV Modal */}
      <ImportCSVModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={() => {
          fetchAssets();
          getDashboardCounts().then(setCounts).catch(() => {});
        }}
      />

      {/* Repair History & Completed Repairs Modal */}
      {showRepairHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowRepairHistoryModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 880, width: "95%", maxHeight: "88vh", overflowY: "auto" }}
          >
            <div
              className="modal-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid #e2e8f0",
                paddingBottom: 12,
                marginBottom: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    backgroundColor: "#ecfdf5",
                    color: "#059669",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h3 className="modal-title" style={{ margin: 0, fontSize: "1.1rem" }}>
                    ประวัติครุภัณฑ์ที่ส่งซ่อมและซ่อมเสร็จแล้ว
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                    ตรวจสอบรายการครุภัณฑ์ที่ซ่อมเสร็จกลับมาใช้งานปกติ และประวัติการแจ้งซ่อมย้อนหลังทั้งหมด
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowRepairHistoryModal(false)}
                style={{ padding: "6px 12px" }}
              >
                ปิดหน้าต่าง
              </button>
            </div>

            {/* Tabs inside modal */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setHistoryModalTab("completed")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  border:
                    historyModalTab === "completed"
                      ? "1px solid #059669"
                      : "1px solid #cbd5e1",
                  backgroundColor:
                    historyModalTab === "completed" ? "#059669" : "#ffffff",
                  color: historyModalTab === "completed" ? "#ffffff" : "#334155",
                }}
              >
                ✓ ครุภัณฑ์ที่ซ่อมเสร็จแล้ว (
                {
                  Object.values(repairSummary.repairedMap || {}).filter(
                    (x) => x.isRepairedAndNormal
                  ).length
                }{" "}
                รายการ)
              </button>
              <button
                type="button"
                onClick={() => setHistoryModalTab("all")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  border:
                    historyModalTab === "all"
                      ? "1px solid #0284c7"
                      : "1px solid #cbd5e1",
                  backgroundColor:
                    historyModalTab === "all" ? "#0284c7" : "#ffffff",
                  color: historyModalTab === "all" ? "#ffffff" : "#334155",
                }}
              >
                📋 ประวัติการส่งซ่อม - ซ่อมเสร็จทั้งหมด (
                {(repairSummary.repairLogs || []).length} เหตุการณ์)
              </button>
            </div>

            {historyModalTab === "completed" ? (
              <div className="table-responsive">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>วันที่ซ่อมเสร็จล่าสุด</th>
                      <th>รหัสครุภัณฑ์</th>
                      <th>รายการ / สถานที่</th>
                      <th>สถานะปัจจุบัน</th>
                      <th>รายละเอียด / หมายเหตุการซ่อม</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(repairSummary.repairedMap || {}).filter(
                      (x) => x.isRepairedAndNormal
                    ).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="table-empty-row">
                          ยังไม่มีรายการครุภัณฑ์ที่ซ่อมเสร็จแล้วในขณะนี้ (เมื่อช่างในระบบแจ้งซ่อมกดปิดงานซ่อมเสร็จ รายการจะแสดงที่นี่อัตโนมัติ)
                        </td>
                      </tr>
                    ) : (
                      Object.values(repairSummary.repairedMap || {})
                        .filter((x) => x.isRepairedAndNormal)
                        .sort(
                          (a, b) =>
                            new Date(b.lastCompletedAt || 0).getTime() -
                            new Date(a.lastCompletedAt || 0).getTime()
                        )
                        .map((item) => {
                          const matchedLog = (repairSummary.repairLogs || []).find(
                            (l) =>
                              String(l.asset_code || "").toUpperCase() ===
                              String(item.asset_code || "").toUpperCase()
                          );
                          return (
                            <tr key={item.asset_code}>
                              <td style={{ whiteSpace: "nowrap", fontSize: "0.86rem" }}>
                                {item.lastCompletedAt
                                  ? new Date(item.lastCompletedAt).toLocaleString("th-TH")
                                  : "-"}
                              </td>
                              <td>
                                <Link
                                  to={`/asset/${encodeURIComponent(item.asset_code)}`}
                                  onClick={() => setShowRepairHistoryModal(false)}
                                  className="asset-code-main"
                                >
                                  {item.asset_code}
                                </Link>
                              </td>
                              <td>
                                <div style={{ fontWeight: 600, color: "#0f172a" }}>
                                  {matchedLog?.asset_name || item.asset_code}
                                </div>
                                <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                                  {matchedLog?.room_name || ""}
                                </div>
                              </td>
                              <td>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                                  <StatusBadge status="normal" />
                                  <span
                                    style={{
                                      fontSize: "0.72rem",
                                      fontWeight: 600,
                                      color: "#047857",
                                      backgroundColor: "#d1fae5",
                                      padding: "1px 6px",
                                      borderRadius: 4,
                                    }}
                                  >
                                    ✓ ซ่อมเสร็จแล้ว
                                  </span>
                                </div>
                              </td>
                              <td style={{ fontSize: "0.86rem", color: "#334155" }}>
                                {item.lastCompletedNote || "ซ่อมเสร็จสิ้น กลับมาใช้งานปกติ"}
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="modern-table">
                  <thead>
                    <tr>
                      <th>วัน / เวลา</th>
                      <th>รหัสครุภัณฑ์</th>
                      <th>ชื่อครุภัณฑ์</th>
                      <th>สถานะเดิม</th>
                      <th>สถานะใหม่</th>
                      <th>รายละเอียด / หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(repairSummary.repairLogs || []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="table-empty-row">
                          ยังไม่มีประวัติการแจ้งซ่อมหรือซ่อมเสร็จในระบบ
                        </td>
                      </tr>
                    ) : (
                      (repairSummary.repairLogs || []).map((log) => (
                        <tr key={log.id}>
                          <td style={{ whiteSpace: "nowrap", fontSize: "0.85rem" }}>
                            {new Date(log.changed_at).toLocaleString("th-TH")}
                          </td>
                          <td>
                            <Link
                              to={`/asset/${encodeURIComponent(log.asset_code)}`}
                              onClick={() => setShowRepairHistoryModal(false)}
                              className="asset-code-main"
                            >
                              {log.asset_code}
                            </Link>
                          </td>
                          <td style={{ fontWeight: 600 }}>{log.asset_name}</td>
                          <td>
                            {log.old_status ? <StatusBadge status={log.old_status} /> : "-"}
                          </td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <StatusBadge status={log.new_status} />
                              {log.is_completed_event && (
                                <span
                                  style={{
                                    fontSize: "0.72rem",
                                    fontWeight: 600,
                                    color: "#047857",
                                    backgroundColor: "#d1fae5",
                                    padding: "1px 6px",
                                    borderRadius: 4,
                                  }}
                                >
                                  ✓ ซ่อมเสร็จ
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ fontSize: "0.86rem", color: "#334155" }}>
                            {log.note || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
