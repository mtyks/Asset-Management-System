import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  listAssets,
  listBorrowRecords,
  borrowAsset,
  returnAsset,
  BORROW_RULES,
} from "../lib/queries";
import {
  Plus,
  Search,
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// ---------- Helpers ----------
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

function parseLocalDate(dateStr) {
  const [y, m, d] = String(dateStr || "")
    .slice(0, 10)
    .split("-")
    .map(Number);
  if (!y || !m || !d) return new Date(dateStr);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

// คืนค่าจำนวนวันที่เกินกำหนด (0 = ยังไม่เกิน)
function getOverdueDays(record) {
  if (record.returned_at || !record.due_date) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = parseLocalDate(record.due_date);
  const diff = Math.round((today - due) / 86400000);
  return diff > 0 ? diff : 0;
}

const BORROW_TERMS = [
  "ยืมได้เฉพาะครุภัณฑ์ที่อยู่ในสถานะ \"ใช้งานปกติ\" เท่านั้น",
  `ระยะเวลายืมสูงสุดไม่เกิน ${BORROW_RULES.maxBorrowDays} วัน และต้องระบุกำหนดวันส่งคืนทุกครั้ง`,
  "ผู้ยืมต้องดูแลรักษาครุภัณฑ์ให้อยู่ในสภาพดี และใช้งานเพื่อกิจการของหน่วยงานเท่านั้น",
  "ห้ามนำครุภัณฑ์ไปให้ผู้อื่นยืมต่อ หรือเคลื่อนย้ายออกนอกหน่วยงานโดยไม่ได้รับอนุญาต",
  "หากครุภัณฑ์ชำรุดหรือสูญหาย ต้องแจ้งเจ้าหน้าที่ทันที และเจ้าหน้าที่จะตรวจสภาพเมื่อรับคืน",
  "หากเกินกำหนดส่งคืน ระบบจะแสดงสถานะ \"เกินกำหนดคืน\" เพื่อให้เจ้าหน้าที่ติดตามทวงคืน",
];

export default function Transfers() {
  const [activeTab, setActiveTab] = useState("all");
  const [assets, setAssets] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Borrow form
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [selectedAssetCode, setSelectedAssetCode] = useState("");
  const [borrowerName, setBorrowerName] = useState("");
  const [borrowerContact, setBorrowerContact] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Return form
  const [returnTarget, setReturnTarget] = useState(null);
  const [returnCondition, setReturnCondition] = useState("normal");
  const [returnNote, setReturnNote] = useState("");
  const [returning, setReturning] = useState(false);

  const [notice, setNotice] = useState("");

  const todayStr = toISODate(new Date());
  const maxDueStr = addDays(BORROW_RULES.maxBorrowDays);

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

  const resetBorrowForm = () => {
    setSelectedAssetCode("");
    setBorrowerName("");
    setBorrowerContact("");
    setDueDate(addDays(7));
    setAcceptTerms(false);
    setFormError("");
  };

  const openBorrowModal = () => {
    resetBorrowForm();
    setShowBorrowModal(true);
  };

  const handleCreateBorrow = async (e) => {
    e.preventDefault();
    setFormError("");

    // ตรวจเงื่อนไขฝั่งหน้าจอก่อนส่ง
    if (!selectedAssetCode) return setFormError("กรุณาเลือกครุภัณฑ์ที่ต้องการยืม");
    if (!borrowerName.trim()) return setFormError("กรุณาระบุชื่อผู้ยืม");
    if (!borrowerContact.trim()) return setFormError("กรุณาระบุเบอร์ติดต่อ / สังกัดของผู้ยืม");
    if (!dueDate) return setFormError("กรุณาระบุกำหนดวันส่งคืน");
    if (dueDate < todayStr) return setFormError("กำหนดวันส่งคืนต้องไม่ย้อนหลังก่อนวันนี้");
    if (dueDate > maxDueStr) {
      return setFormError(`ระยะเวลายืมต้องไม่เกิน ${BORROW_RULES.maxBorrowDays} วัน`);
    }
    if (!acceptTerms) return setFormError("กรุณาติ๊กยอมรับข้อกำหนดและเงื่อนไขการยืมก่อนบันทึก");

    setSubmitting(true);
    try {
      await borrowAsset(selectedAssetCode, borrowerName, borrowerContact, dueDate);
      setShowBorrowModal(false);
      setNotice(`บันทึกการยืมครุภัณฑ์ ${selectedAssetCode} เรียบร้อยแล้ว`);
      refreshData();
    } catch (err) {
      setFormError(err.message || "บันทึกไม่สำเร็จ");
    } finally {
      setSubmitting(false);
    }
  };

  const openReturnModal = (record) => {
    setReturnTarget(record);
    setReturnCondition("normal");
    setReturnNote("");
  };

  const handleConfirmReturn = async () => {
    if (!returnTarget) return;
    if (returnCondition === "damaged" && !returnNote.trim()) {
      alert("กรุณาระบุรายละเอียดความเสียหายที่พบ");
      return;
    }
    setReturning(true);
    try {
      const code = returnTarget.asset_code || returnTarget.assets?.asset_code;
      await returnAsset(code, returnTarget.id, returnCondition, returnNote.trim());
      setNotice(
        returnCondition === "damaged"
          ? `รับคืนครุภัณฑ์ ${code} แล้ว และเปลี่ยนสถานะเป็น "ชำรุด"`
          : `รับคืนครุภัณฑ์ ${code} เรียบร้อย สภาพปกติพร้อมใช้งาน`
      );
      setReturnTarget(null);
      refreshData();
    } catch (err) {
      alert("บันทึกรับคืนไม่สำเร็จ: " + err.message);
    } finally {
      setReturning(false);
    }
  };

  // ---------- Counts & Filter ----------
  const borrowingCount = records.filter((r) => !r.returned_at).length;
  const returnedCount = records.filter((r) => r.returned_at).length;
  const overdueCount = records.filter((r) => getOverdueDays(r) > 0).length;

  const filteredRecords = records.filter((r) => {
    const isBorrowing = !r.returned_at;
    if (activeTab === "borrowing" && !isBorrowing) return false;
    if (activeTab === "returned" && isBorrowing) return false;
    if (activeTab === "overdue" && getOverdueDays(r) === 0) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const code = (r.assets?.asset_code || r.asset_code || "").toLowerCase();
      const name = (r.assets?.name || "").toLowerCase();
      const borrower = (r.borrower_name || "").toLowerCase();
      return code.includes(q) || name.includes(q) || borrower.includes(q);
    }
    return true;
  });

  const availableCount = assets.filter((a) => (a.status || "normal") === "normal").length;

  const tabBtn = (key, label) => (
    <button
      className={`btn ${activeTab === key ? "btn-primary" : "btn-outline-white"}`}
      onClick={() => setActiveTab(key)}
      style={
        key === "overdue" && activeTab !== key && overdueCount > 0
          ? { color: "#dc2626", borderColor: "#fecaca" }
          : undefined
      }
    >
      {label}
    </button>
  );

  return (
    <div className="page-container">
      <div className="page-heading-row">
        <div className="page-title-group">
          <h1>ยืม / คืน ครุภัณฑ์</h1>
          <p className="page-subtitle">
            บันทึกการยืม-คืนครุภัณฑ์ ตรวจสอบกำหนดส่งคืน และตรวจสภาพเมื่อรับคืน
          </p>
        </div>

        <div className="page-actions-group">
          <button className="btn btn-primary" onClick={openBorrowModal}>
            <Plus size={16} />
            <span>สร้างรายการขอยืมครุภัณฑ์</span>
          </button>
        </div>
      </div>

      {notice && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            borderRadius: 10,
            backgroundColor: "#ecfdf5",
            border: "1px solid #6ee7b7",
            color: "#065f46",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: 600,
            fontSize: "0.92rem",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={18} color="#059669" />
            {notice}
          </span>
          <button
            type="button"
            onClick={() => setNotice("")}
            style={{ background: "transparent", border: "none", color: "#047857", cursor: "pointer", fontWeight: 700 }}
          >
            ปิด
          </button>
        </div>
      )}

      {/* Overdue alert banner */}
      {overdueCount > 0 && (
        <div
          onClick={() => setActiveTab("overdue")}
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            borderRadius: 10,
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#b91c1c",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontWeight: 600,
            fontSize: "0.92rem",
            cursor: "pointer",
          }}
          title="คลิกเพื่อดูเฉพาะรายการเกินกำหนดคืน"
        >
          <AlertTriangle size={18} />
          <span>
            มีครุภัณฑ์เกินกำหนดส่งคืน {overdueCount} รายการ — คลิกเพื่อดูรายการและติดตามทวงคืน
          </span>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {tabBtn("all", `ทั้งหมด (${records.length})`)}
          {tabBtn("borrowing", `กำลังยืมอยู่ (${borrowingCount})`)}
          {tabBtn("overdue", `เกินกำหนดคืน (${overdueCount})`)}
          {tabBtn("returned", `คืนแล้ว (${returnedCount})`)}
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
                    กำลังโหลดข้อมูลประวัติการยืม-คืน...
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
                  const overdueDays = getOverdueDays(r);
                  const assetCode = r.assets?.asset_code || r.asset_code || "-";
                  const assetName = r.assets?.name || "ครุภัณฑ์";
                  const borrowDate = r.borrowed_at ? new Date(r.borrowed_at).toLocaleDateString("th-TH") : "-";
                  const returnDate = r.returned_at ? new Date(r.returned_at).toLocaleDateString("th-TH") : "-";

                  return (
                    <tr key={r.id} style={overdueDays > 0 ? { backgroundColor: "#fff7f7" } : undefined}>
                      <td>
                        <Link
                          to={`/asset/${encodeURIComponent(assetCode)}`}
                          style={{ fontWeight: 700, color: "#0f291e" }}
                        >
                          {assetCode}
                        </Link>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "#0f291e" }}>{assetName}</div>
                        <div style={{ fontSize: "0.84rem", color: "#52796f" }}>
                          {r.assets?.color ? `สี ${r.assets.color}` : ""}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "#0f291e" }}>{r.borrower_name}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.94rem", color: "#52796f" }}>
                          {r.borrower_contact || "-"}
                        </span>
                      </td>
                      <td>{borrowDate}</td>
                      <td>
                        <span
                          style={{
                            fontWeight: overdueDays > 0 ? 700 : 400,
                            color: overdueDays > 0 ? "#dc2626" : "#475569",
                          }}
                        >
                          {r.due_date ? new Date(r.due_date).toLocaleDateString("th-TH") : "ไม่ระบุ"}
                        </span>
                      </td>
                      <td>{returnDate}</td>
                      <td>
                        {!isBorrowing ? (
                          (() => {
                            const matchedAsset = assets.find(
                              (a) =>
                                String(a.asset_code || "").toUpperCase() ===
                                String(assetCode || "").toUpperCase()
                            );
                            const isReturnedDamaged =
                              r.return_condition === "damaged" ||
                              (!r.return_condition && matchedAsset?.status === "damaged");
                            return isReturnedDamaged ? (
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 3 }}>
                                <span className="status-pill status-damaged">
                                  <span className="status-dot" />
                                  คืนแล้ว (ชำรุด)
                                </span>
                                {r.return_note && (
                                  <span style={{ fontSize: "0.75rem", color: "#dc2626" }}>
                                    สาเหตุ: {r.return_note}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="status-pill status-normal">
                                <span className="status-dot" />
                                คืนแล้ว (ปกติ)
                              </span>
                            );
                          })()
                        ) : overdueDays > 0 ? (
                          <span className="status-pill status-damaged" title="เกินกำหนดส่งคืน">
                            <span className="status-dot" />
                            เกินกำหนด {overdueDays} วัน
                          </span>
                        ) : (
                          <span className="status-pill status-borrowed">
                            <span className="status-dot" />
                            กำลังยืมอยู่
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {isBorrowing && (
                          <button
                            className="action-btn-link"
                            style={{ color: "#059669", backgroundColor: "#ecfdf5" }}
                            onClick={() => openReturnModal(r)}
                          >
                            บันทึกรับคืน
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

      {/* ---------- Borrow Modal ---------- */}
      {showBorrowModal && (
        <div className="modal-overlay" onClick={() => !submitting && setShowBorrowModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 620, maxHeight: "90vh", overflowY: "auto" }}
          >
            <div className="modal-header">
              <h3 className="modal-title">บันทึกการขอยืมครุภัณฑ์</h3>
            </div>

            {formError && <div className="form-error-banner">{formError}</div>}

            <form onSubmit={handleCreateBorrow}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>เลือกครุภัณฑ์ที่ต้องการยืม *</label>
                <select
                  className="form-control"
                  value={selectedAssetCode}
                  onChange={(e) => setSelectedAssetCode(e.target.value)}
                >
                  <option value="">
                    -- กรุณาเลือกครุภัณฑ์ (พร้อมให้ยืม {availableCount} รายการ) --
                  </option>
                  {[...assets]
                    .sort((a, b) => {
                      const aAvail = (a.status || "normal") === "normal" ? 0 : 1;
                      const bAvail = (b.status || "normal") === "normal" ? 0 : 1;
                      return aAvail - bAvail;
                    })
                    .map((a) => {
                      const st = a.status || "normal";
                      const isAvailable = st === "normal";
                      const statusLabel =
                        st === "normal"
                          ? "พร้อมให้ยืม"
                          : st === "borrowed"
                          ? "กำลังถูกยืมใช้งาน"
                          : "ชำรุด (งดให้ยืม)";
                      return (
                        <option key={a.asset_code} value={a.asset_code} disabled={!isAvailable}>
                          {a.asset_code} - {a.name} ({statusLabel})
                        </option>
                      );
                    })}
                </select>
              </div>

              <div className="form-grid">
                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label>ชื่อผู้ขอยืม *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น สมชาย ใจดี"
                    value={borrowerName}
                    onChange={(e) => setBorrowerName(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label>เบอร์ติดต่อ / สังกัด *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น 081-xxx-xxxx / ฝ่ายไอที"
                    value={borrowerContact}
                    onChange={(e) => setBorrowerContact(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>
                  กำหนดวันส่งคืน * (ยืมได้สูงสุด {BORROW_RULES.maxBorrowDays} วัน)
                </label>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  {BORROW_RULES.quickDays.map((d) => {
                    const val = addDays(d);
                    const active = dueDate === val;
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDueDate(val)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 999,
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          border: active ? "1px solid #059669" : "1px solid #cbd5e1",
                          backgroundColor: active ? "#059669" : "#ffffff",
                          color: active ? "#ffffff" : "#334155",
                        }}
                      >
                        {d} วัน
                      </button>
                    );
                  })}
                </div>
                <input
                  type="date"
                  className="form-control"
                  value={dueDate}
                  min={todayStr}
                  max={maxDueStr}
                  onChange={(e) => setDueDate(e.target.value)}
                />
                {dueDate && (
                  <div style={{ fontSize: "0.8rem", color: "#52796f", marginTop: 4 }}>
                    ต้องส่งคืนภายในวันที่ {new Date(dueDate).toLocaleDateString("th-TH", { dateStyle: "long" })}
                  </div>
                )}
              </div>

              {/* Terms box */}
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  padding: "12px 14px",
                  marginBottom: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "0.9rem", marginBottom: 6, color: "#0f291e" }}>
                  <ClipboardList size={16} color="#059669" />
                  ข้อกำหนดและเงื่อนไขการยืม-คืนครุภัณฑ์
                </div>
                <ol style={{ margin: 0, paddingLeft: 20, fontSize: "0.82rem", color: "#475569", lineHeight: 1.7 }}>
                  {BORROW_TERMS.map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ol>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.88rem", fontWeight: 600, cursor: "pointer", marginBottom: 18 }}>
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "#059669" }}
                />
                ผู้ยืมรับทราบและยอมรับข้อกำหนดและเงื่อนไขการยืมข้างต้น
              </label>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowBorrowModal(false)}
                  disabled={submitting}
                >
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting || !acceptTerms}>
                  {submitting ? "กำลังบันทึก..." : "ยืนยันการขอยืม"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------- Return Modal (ตรวจสภาพตอนรับคืน) ---------- */}
      {returnTarget && (
        <div className="modal-overlay" onClick={() => !returning && setReturnTarget(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h3 className="modal-title">บันทึกรับคืนและตรวจสภาพครุภัณฑ์</h3>
            </div>

            <div style={{ fontSize: "0.9rem", color: "#334155", margin: "6px 0 14px", lineHeight: 1.6 }}>
              <div>
                ครุภัณฑ์: <strong>{returnTarget.assets?.name || "-"}</strong> (
                {returnTarget.asset_code || returnTarget.assets?.asset_code})
              </div>
              <div>ผู้ยืม: <strong>{returnTarget.borrower_name}</strong></div>
              {getOverdueDays(returnTarget) > 0 && (
                <div style={{ color: "#dc2626", fontWeight: 600 }}>
                  ⚠️ ส่งคืนเกินกำหนด {getOverdueDays(returnTarget)} วัน
                </div>
              )}
            </div>

            <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: 8 }}>
              สภาพครุภัณฑ์ที่ได้รับคืน *
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {[
                { val: "normal", icon: <CheckCircle2 size={18} color="#059669" />, title: "สภาพปกติ พร้อมใช้งานต่อ", desc: "สถานะครุภัณฑ์จะกลับเป็น \"ใช้งานปกติ\"", color: "#059669", bg: "#ecfdf5" },
                { val: "damaged", icon: <XCircle size={18} color="#dc2626" />, title: "พบการชำรุดเสียหายตอนรับคืน", desc: "สถานะครุภัณฑ์จะเปลี่ยนเป็น \"ชำรุด\" และงดให้ยืมต่อ", color: "#dc2626", bg: "#fef2f2" },
              ].map((opt) => {
                const active = returnCondition === opt.val;
                return (
                  <label
                    key={opt.val}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 10,
                      cursor: "pointer",
                      border: `1px solid ${active ? opt.color : "#e2e8f0"}`,
                      backgroundColor: active ? opt.bg : "#ffffff",
                    }}
                  >
                    <input
                      type="radio"
                      name="returnCondition"
                      checked={active}
                      onChange={() => setReturnCondition(opt.val)}
                      style={{ marginTop: 3, accentColor: opt.color }}
                    />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "0.9rem" }}>
                        {opt.icon} {opt.title}
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{opt.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="form-group" style={{ marginBottom: 18 }}>
              <label>
                {returnCondition === "damaged" ? "รายละเอียดความเสียหายที่พบ *" : "หมายเหตุ (ถ้ามี)"}
              </label>
              <input
                type="text"
                className="form-control"
                placeholder={returnCondition === "damaged" ? "เช่น หน้าจอแตก, เปิดไม่ติด" : "เช่น คืนครบพร้อมอุปกรณ์เสริม"}
                value={returnNote}
                onChange={(e) => setReturnNote(e.target.value)}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setReturnTarget(null)}
                disabled={returning}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmReturn}
                disabled={returning}
                style={returnCondition === "damaged" ? { backgroundColor: "#dc2626" } : undefined}
              >
                {returning ? "กำลังบันทึก..." : "ยืนยันรับคืน"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
