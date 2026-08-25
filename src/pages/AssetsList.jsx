import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listAssets,
  listCategories,
  listRooms,
  getDashboardCounts,
  deleteAsset,
  bulkDeleteAssets,
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

export default function AssetsList() {
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
  const [deletingCode, setDeletingCode] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Multi-Select & Bulk Edit States
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Pagination States
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
    setCurrentPage(1); // รีเซ็ตไปหน้า 1 เมื่อ Filter เปลี่ยน
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
            <option key={c.category_code || c.id} value={c.category_code || c.id}>
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
            <option key={r.room_code || r.id} value={r.room_code || r.id}>
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
        </select>
      </div>

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
                        <span style={{ fontSize: "0.85rem", color: "#475569" }}>
                          {roomText}
                        </span>
                      </td>

                      {/* ผู้รับผิดชอบ */}
                      <td>
                        <span style={{ fontSize: "0.85rem", color: "#334155" }}>
                          {asset.responsible_person || "ไม่ระบุ"}
                        </span>
                      </td>

                      {/* สถานะ */}
                      <td>
                        <StatusBadge status={asset.status || "normal"} />
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
    </div>
  );
}
