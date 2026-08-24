import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  listAssets,
  listBorrowRecords,
  borrowAsset,
  returnAsset,
} from "../lib/queries";
import StatusBadge from "../components/StatusBadge";
import {
  ArrowLeftRight,
  Plus,
  CheckCircle,
  Clock,
  Search,
  ArrowRight,
  UserCheck,
  Calendar,
  Phone,
} from "lucide-react";

export default function Transfers() {
  const [activeTab, setActiveTab] = useState("all");
  const [assets, setAssets] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBorrowModal, setShowBorrowModal] = useState(false);

  // Form State
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [borrowerName, setBorrowerName] = useState("");
  const [borrowerContact, setBorrowerContact] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");

  const refreshData = () => {
    setLoading(true);
    Promise.all([
      listAssets().then(setAssets).catch(() => {}),
      listBorrowRecords().then(setRecords).catch(() => {}),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleCreateBorrow = async (e) => {
    e.preventDefault();
    if (!selectedAssetId || !borrowerName.trim()) {
      alert("กรุณาเลือกครุภัณฑ์และระบุชื่อผู้ยืม");
      return;
    }
    setSubmitting(true);
    try {
      await borrowAsset(
        selectedAssetId,
        borrowerName.trim(),
        borrowerContact.trim(),
        dueDate || null
      );

      setShowBorrowModal(false);
      setSelectedAssetId("");
      setBorrowerName("");
      setBorrowerContact("");
      setDueDate("");
      refreshData();
      alert("บันทึกการขอยืมครุภัณฑ์ลงฐานข้อมูลสำเร็จแล้ว");
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึก: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnAction = async (record) => {
    try {
      await returnAsset(record.asset_id, record.id);
      refreshData();
      alert("บันทึกการส่งคืนครุภัณฑ์เรียบร้อยแล้ว");
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึกส่งคืน: " + err.message);
    }
  };

  // Filter tab & search
  const filteredRecords = records.filter((r) => {
    const isBorrowing = !r.returned_at;
    if (activeTab === "borrowing" && !isBorrowing) return false;
    if (activeTab === "returned" && isBorrowing) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const code = (r.assets?.asset_code || "").toLowerCase();
      const name = (r.assets?.name || "").toLowerCase();
      const borrower = (r.borrower_name || "").toLowerCase();
      return code.includes(q) || name.includes(q) || borrower.includes(q);
    }
    return true;
  });

  // Filter available assets (that are normal or currently not borrowed)
  const availableAssets = assets.filter((a) => a.status === "normal");

  return (
    <div className="page-container">
      <div className="page-heading-row">
        <div className="page-title-group">
          <h1>ยืม / คืน ครุภัณฑ์</h1>
          <p className="page-subtitle">
            บันทึกประวัติการขอยืม-คืนครุภัณฑ์ ตรวจสอบสถานะ และกำหนดวันส่งคืน (ตาราง <code>borrow_records</code>)
          </p>
        </div>

        <div className="page-actions-group">
          <button className="btn btn-primary" onClick={() => setShowBorrowModal(true)}>
            <Plus size={16} />
            <span>สร้างรายการขอยืมครุภัณฑ์</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className={`btn ${activeTab === "all" ? "btn-primary" : "btn-outline-white"}`}
            onClick={() => setActiveTab("all")}
          >
            ทั้งหมด ({records.length})
          </button>
          <button
            className={`btn ${activeTab === "borrowing" ? "btn-primary" : "btn-outline-white"}`}
            onClick={() => setActiveTab("borrowing")}
          >
            กำลังยืมอยู่ ({records.filter((r) => !r.returned_at).length})
          </button>
          <button
            className={`btn ${activeTab === "returned" ? "btn-primary" : "btn-outline-white"}`}
            onClick={() => setActiveTab("returned")}
          >
            คืนแล้ว ({records.filter((r) => r.returned_at).length})
          </button>
        </div>

        <div className="search-input-wrap" style={{ minWidth: 260, margin: 0 }}>
          <Search size={16} className="search-icon-inside" />
          <input
            type="text"
            className="search-input-field"
            placeholder="ค้นหาเลขครุภัณฑ์, ชื่อผู้ยืม..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Records Table */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th>เลขครุภัณฑ์</th>
                <th>ชื่อรายการครุภัณฑ์</th>
                <th>ผู้ยืม</th>
                <th>เบอร์ติดต่อ / สังกัด</th>
                <th>วันที่ยืม</th>
                <th>กำหนดส่งคืน</th>
                <th>วันที่คืนจริง</th>
                <th>สถานะ</th>
                <th style={{ textAlign: "right" }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="table-empty-row">
                    กำลังโหลดข้อมูลประวัติการยืม-คืนจาก Supabase...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="table-empty-row">
                    ไม่มีรายการยืม-คืนตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const isBorrowing = !r.returned_at;
                  const assetCode = r.assets?.asset_code || "-";
                  const assetName = r.assets?.name || "ครุภัณฑ์";
                  const borrowDate = r.borrowed_at ? new Date(r.borrowed_at).toLocaleDateString("th-TH") : "-";
                  const returnDate = r.returned_at ? new Date(r.returned_at).toLocaleDateString("th-TH") : "-";

                  return (
                    <tr key={r.id}>
                      <td>
                        <Link
                          to={`/asset/${assetCode}`}
                          style={{ fontWeight: 700, color: "#0f172a" }}
                        >
                          {assetCode}
                        </Link>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>{assetName}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          {r.assets?.color ? `สี ${r.assets.color}` : ""}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "#1e293b" }}>{r.borrower_name}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                          {r.borrower_contact || "-"}
                        </span>
                      </td>
                      <td>{borrowDate}</td>
                      <td>
                        <span style={{ fontWeight: isBorrowing && r.due_date ? 600 : 400, color: isBorrowing ? "#dc2626" : "#475569" }}>
                          {r.due_date ? new Date(r.due_date).toLocaleDateString("th-TH") : "ไม่ระบุ"}
                        </span>
                      </td>
                      <td>{returnDate}</td>
                      <td>
                        {isBorrowing ? (
                          <span className="status-pill status-borrowed">
                            <span className="status-dot" />
                            กำลังยืมอยู่
                          </span>
                        ) : (
                          <span className="status-pill status-normal">
                            <span className="status-dot" />
                            คืนแล้ว
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {isBorrowing && (
                          <button
                            className="action-btn-link"
                            style={{ color: "#059669", backgroundColor: "#ecfdf5" }}
                            onClick={() => handleReturnAction(r)}
                          >
                            บันทึกส่งคืน
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Borrow Modal */}
      {showBorrowModal && (
        <div className="modal-overlay" onClick={() => setShowBorrowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">บันทึกการขอยืมครุภัณฑ์</h3>
            </div>
            <form onSubmit={handleCreateBorrow}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>เลือกครุภัณฑ์ที่ต้องการยืม *</label>
                <select
                  className="form-control"
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  required
                >
                  <option value="">-- กรุณาเลือกครุภัณฑ์ --</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.asset_code || a.code} - {a.name} ({a.status === "normal" ? "พร้อมให้ยืม" : `สถานะ: ${a.status}`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>ชื่อผู้ขอยืม *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="เช่น สมชาย ใจดี"
                  value={borrowerName}
                  onChange={(e) => setBorrowerName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>เบอร์ติดต่อ / สังกัด / แผนก</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="เช่น 081-xxx-xxxx หรือ ฝ่ายไอที"
                  value={borrowerContact}
                  onChange={(e) => setBorrowerContact(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>กำหนดวันส่งคืน</label>
                <input
                  type="date"
                  className="form-control"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowBorrowModal(false)}
                  disabled={submitting}
                >
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "กำลังบันทึก..." : "ยืนยันการขอยืม"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
