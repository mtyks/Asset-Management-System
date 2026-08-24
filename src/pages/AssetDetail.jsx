import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getAssetByCode,
  getAssetHistory,
  updateAssetStatus,
  borrowAsset,
  returnAsset,
  getActiveBorrowRecord,
} from "../lib/queries";
import { useAuth } from "../lib/AuthContext";
import StatusBadge from "../components/StatusBadge";
import QRCodeDisplay from "../components/QRCodeDisplay";
import {
  ArrowLeft,
  Edit,
  Printer,
  QrCode,
  Package,
  MapPin,
  User,
  Calendar,
  Clock,
  CheckCircle,
  ArrowRightLeft,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";

export default function AssetDetail() {
  const { assetCode } = useParams();
  const { user } = useAuth();

  const [asset, setAsset] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeBorrow, setActiveBorrow] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Borrow Form state
  const [borrowerName, setBorrowerName] = useState("");
  const [borrowerContact, setBorrowerContact] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [showBorrowBox, setShowBorrowBox] = useState(false);

  const load = useCallback(async () => {
    try {
      const a = await getAssetByCode(assetCode);
      setAsset(a);
      const [h, b] = await Promise.all([
        getAssetHistory(a.id),
        getActiveBorrowRecord(a.id),
      ]);
      setHistory(h || []);
      setActiveBorrow(b || null);
      setError(null);
    } catch (err) {
      setError("ไม่พบข้อมูลครุภัณฑ์รหัสนี้ในระบบ");
    }
  }, [assetCode]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatusChange = async (newStatus) => {
    setBusy(true);
    try {
      await updateAssetStatus(asset.id, newStatus);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleBorrow = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await borrowAsset(asset.id, borrowerName, borrowerContact, dueDate || null);
      setBorrowerName("");
      setBorrowerContact("");
      setDueDate("");
      setShowBorrowBox(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReturn = async () => {
    if (!activeBorrow) return;
    setBusy(true);
    try {
      await returnAsset(asset.id, activeBorrow.id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="page-error">{error}</div>;
  if (!asset) return <div className="page-loading">กำลังโหลด...</div>;

  const location = asset.rooms
    ? `${asset.rooms.floors?.buildings?.name || ""} ชั้น ${asset.rooms.floors?.floor_number ?? "-"} ห้อง ${asset.rooms.room_name}`
    : "ยังไม่ระบุตำแหน่ง";

  return (
    <div className="page asset-detail">
      <div className="page-header">
        <h1>{asset.name}</h1>
        <StatusBadge status={asset.status} />
      </div>

      <div className="asset-hero-image">
        {asset.image_url ? (
          <img src={asset.image_url} alt={asset.name} />
        ) : (
          <div className="asset-hero-placeholder">
            <span>ไม่มีรูปภาพประกอบ</span>
          </div>
        )}
      </div>

      {user && (
        <div className="form-actions" style={{ marginBottom: 16 }}>
          <Link to={`/assets/${asset.id}/edit`} className="btn btn-secondary">
            แก้ไขข้อมูลทั้งหมด
          </Link>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="page-container">
        <div className="table-empty-row">กำลังโหลดข้อมูลครุภัณฑ์...</div>
      </div>
    );
  }

  const categoryName =
    asset.asset_categories?.category_name ||
    asset.asset_categories?.name ||
    "ครุภัณฑ์ทั่วไป";

  const locationText = asset.rooms?.room_name
    ? asset.rooms.room_name
    : asset.rooms
    ? `${asset.rooms.floors?.buildings?.name || ""} ชั้น ${asset.rooms.floors?.floor_number || ""} ห้อง ${asset.rooms.room_name}`
    : "ห้องธุรการและสารบรรณ";

  return (
    <div className="page-container" style={{ maxWidth: 1080 }}>
      {/* Header */}
      <div className="page-heading-row">
        <div className="page-title-group">
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1>{asset.name}</h1>
            <StatusBadge status={asset.status || "normal"} />
          </div>
          <p className="page-subtitle">
            รหัสครุภัณฑ์: <strong style={{ color: "#0f172a" }}>{asset.asset_code || asset.code}</strong>
          </p>
        </div>

        <div className="page-actions-group">
          <Link to="/assets" className="btn btn-outline-white">
            <ArrowLeft size={16} />
            <span>ย้อนกลับ</span>
          </Link>
          <Link to={`/assets/${asset.id}/edit`} className="btn btn-primary">
            <Edit size={16} />
            <span>แก้ไขข้อมูล</span>
          </Link>
        </div>
      </div>

      {/* Main Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        {/* Left Column: Image & Specifications */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Asset Image Card */}
          <div className="form-card" style={{ margin: 0, padding: 20 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: "1.05rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <ImageIcon size={18} color="#2563eb" />
              <span>รูปภาพครุภัณฑ์</span>
            </h3>

            {asset.image_url ? (
              <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0", backgroundColor: "#0b1329" }}>
                <img
                  src={asset.image_url}
                  alt={asset.name}
                  style={{
                    width: "100%",
                    maxHeight: "360px",
                    objectFit: "contain",
                    display: "block",
                    backgroundColor: "#f8fafc",
                  }}
                />
                <a
                  href={asset.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    backgroundColor: "rgba(15, 23, 42, 0.75)",
                    color: "#ffffff",
                    padding: "4px 8px",
                    borderRadius: 6,
                    fontSize: "0.75rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    backdropFilter: "blur(4px)",
                  }}
                >
                  <ExternalLink size={12} />
                  <span>ดูภาพขนาดเต็ม</span>
                </a>
              </div>
            ) : (
              <div
                style={{
                  height: 180,
                  backgroundColor: "#f8fafc",
                  border: "2px dashed #e2e8f0",
                  borderRadius: 12,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  color: "#94a3b8",
                }}
              >
                <ImageIcon size={36} strokeWidth={1.5} />
                <span style={{ fontSize: "0.85rem" }}>ยังไม่มีรูปภาพครุภัณฑ์ชิ้นนี้</span>
                <Link
                  to={`/assets/${asset.id}/edit`}
                  className="btn btn-outline-white"
                  style={{ fontSize: "0.78rem", padding: "4px 10px" }}
                >
                  + เพิ่มรูปภาพ
                </Link>
              </div>
            )}
          </div>

          {/* Specifications Card */}
          <div className="form-card" style={{ margin: 0 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "1.05rem", fontWeight: 700 }}>
              ข้อมูลจำเพาะของครุภัณฑ์
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.88rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                <span style={{ color: "#64748b" }}>เลขครุภัณฑ์:</span>
                <strong style={{ fontFamily: "monospace" }}>{asset.asset_code || asset.code}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                <span style={{ color: "#64748b" }}>ชื่อรายการ:</span>
                <span style={{ fontWeight: 600 }}>{asset.name}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                <span style={{ color: "#64748b" }}>รายละเอียด / สี / ยี่ห้อ:</span>
                <span>{asset.color || "-"}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                <span style={{ color: "#64748b" }}>หมวดหมู่:</span>
                <span className="category-pill">{categoryName}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                <span style={{ color: "#64748b" }}>สถานที่ตั้ง:</span>
                <span style={{ fontWeight: 600 }}>{locationText}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                <span style={{ color: "#64748b" }}>ผู้รับผิดชอบ:</span>
                <span>{asset.responsible_person || "ไม่ระบุ"}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>
                <span style={{ color: "#64748b" }}>สถานะ:</span>
                <StatusBadge status={asset.status || "normal"} />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>วันที่ตรวจรับ:</span>
                <span>{asset.received_date || "-"}</span>
              </div>
            </div>

            {/* Quick Status Change */}
            <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>
                ปรับเปลี่ยนสถานะด่วน:
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  className="btn btn-outline-white"
                  style={{ fontSize: "0.8rem", padding: "6px 10px" }}
                  disabled={busy || asset.status === "normal"}
                  onClick={() => handleStatusChange("normal")}
                >
                  ปกติ
                </button>
                <button
                  className="btn btn-outline-white"
                  style={{ fontSize: "0.8rem", padding: "6px 10px" }}
                  disabled={busy || asset.status === "repair"}
                  onClick={() => handleStatusChange("repair")}
                >
                  ส่งซ่อม
                </button>
                <button
                  className="btn btn-outline-white"
                  style={{ fontSize: "0.8rem", padding: "6px 10px" }}
                  disabled={busy || asset.status === "damaged"}
                  onClick={() => handleStatusChange("damaged")}
                >
                  ชำรุด
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: QR Code & Borrow / Return */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* QR Code Display Card */}
          <div className="form-card" style={{ margin: 0, textAlign: "center" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: "1.05rem", fontWeight: 700 }}>
              ป้ายทะเบียน QR Code
            </h3>
            <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0 0 16px" }}>
              สแกนด้วยกล้องมือถือเพื่อเข้าถึงหน้ารายละเอียดนี้ได้ทันที
            </p>

            <div style={{ display: "inline-block", margin: "0 auto 16px" }}>
              <QRCodeDisplay
                value={asset.asset_code || asset.code}
                caption={asset.name}
              />
            </div>

            <div>
              <button className="btn btn-outline-white" onClick={() => window.print()}>
                <Printer size={16} />
                <span>พิมพ์สติ๊กเกอร์ QR</span>
              </button>
            </div>
          </div>

          {/* Borrow / Return Card */}
          <div className="form-card" style={{ margin: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>
                การยืม - คืนครุภัณฑ์
              </h3>
              {asset.status === "borrowed" && activeBorrow && (
                <button
                  className="btn btn-primary"
                  style={{ backgroundColor: "#059669" }}
                  onClick={handleReturn}
                  disabled={busy}
                >
                  <CheckCircle size={16} />
                  <span>บันทึกส่งคืน</span>
                </button>
              )}
            </div>

            {asset.status === "borrowed" && activeBorrow ? (
              <div
                style={{
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "8px",
                  padding: "14px 16px",
                  fontSize: "0.88rem",
                }}
              >
                <div style={{ fontWeight: 600, color: "#1e40af", marginBottom: 4 }}>
                  ครุภัณฑ์นี้กำลังถูกยืมใช้งานโดย: {activeBorrow.borrower_name}
                </div>
                <div style={{ color: "#3b82f6" }}>
                  ติดต่อ: {activeBorrow.borrower_contact || "-"} | กำหนดคืน: {activeBorrow.due_date || "ไม่ระบุ"}
                </div>
              </div>
            ) : (
              <div>
                {!showBorrowBox ? (
                  <button
                    className="btn btn-secondary"
                    onClick={() => setShowBorrowBox(true)}
                  >
                    <ArrowRightLeft size={16} />
                    <span>บันทึกการขอยืมครุภัณฑ์ชิ้นนี้</span>
                  </button>
                ) : (
                  <form onSubmit={handleBorrow} style={{ maxWidth: 480 }}>
                    <div className="form-group" style={{ marginBottom: 10 }}>
                      <label>ชื่อผู้ยืม</label>
                      <input
                        type="text"
                        className="form-control"
                        value={borrowerName}
                        onChange={(e) => setBorrowerName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 10 }}>
                      <label>เบอร์ติดต่อ / แผนก</label>
                      <input
                        type="text"
                        className="form-control"
                        value={borrowerContact}
                        onChange={(e) => setBorrowerContact(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 14 }}>
                      <label>กำหนดวันส่งคืน</label>
                      <input
                        type="date"
                        className="form-control"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="submit" className="btn btn-primary" disabled={busy}>
                        ยืนยันการยืม
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowBorrowBox(false)}
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History Log */}
      {history.length > 0 && (
        <div className="table-card">
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
              ประวัติการเปลี่ยนแปลงสถานะ (Timeline)
            </h3>
          </div>
          <div className="table-responsive">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>วัน / เวลา</th>
                  <th>สถานะเดิม</th>
                  <th>สถานะใหม่</th>
                  <th>หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td>{new Date(h.changed_at).toLocaleString("th-TH")}</td>
                    <td>{h.old_status ? <StatusBadge status={h.old_status} /> : "-"}</td>
                    <td><StatusBadge status={h.new_status} /></td>
                    <td>{h.note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
