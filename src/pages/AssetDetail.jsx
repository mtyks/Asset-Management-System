import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getAssetByCode,
  getAssetHistory,
  updateAssetStatus,
  updateAsset,
  borrowAsset,
  returnAsset,
  getActiveBorrowRecord,
} from "../lib/queries";
import { useAuth } from "../lib/AuthContext";
import StatusBadge from "../components/StatusBadge";
import QRCodeDisplay from "../components/QRCodeDisplay";

export default function AssetDetail() {
  const { assetCode } = useParams();
  const { user } = useAuth();

  const [asset, setAsset] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeBorrow, setActiveBorrow] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editingResponsible, setEditingResponsible] = useState(false);
  const [responsibleDraft, setResponsibleDraft] = useState("");

  // ฟอร์มยืม
  const [borrowerName, setBorrowerName] = useState("");
  const [borrowerContact, setBorrowerContact] = useState("");
  const [dueDate, setDueDate] = useState("");

  const load = useCallback(async () => {
    try {
      const a = await getAssetByCode(assetCode);
      setAsset(a);
      const [h, b] = await Promise.all([getAssetHistory(a.id), getActiveBorrowRecord(a.id)]);
      setHistory(h);
      setActiveBorrow(b);
    } catch (err) {
      setError("ไม่พบครุภัณฑ์รหัสนี้ในระบบ");
    }
  }, [assetCode]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(newStatus) {
    setBusy(true);
    try {
      await updateAssetStatus(asset.id, newStatus);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleBorrow(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await borrowAsset(asset.id, borrowerName, borrowerContact, dueDate || null);
      setBorrowerName("");
      setBorrowerContact("");
      setDueDate("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveResponsible() {
    setBusy(true);
    try {
      await updateAsset(asset.id, { responsible_person: responsibleDraft || null });
      setEditingResponsible(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReturn() {
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
  }

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
      )}

      <div className="detail-grid">
        <div className="detail-info">
          <dl>
            <dt>รหัสครุภัณฑ์</dt>
            <dd>{asset.asset_code}</dd>
            <dt>ประเภท</dt>
            <dd>{asset.asset_categories?.category_name || "-"}</dd>
            <dt>สี</dt>
            <dd>{asset.color || "-"}</dd>
            <dt>ตำแหน่ง</dt>
            <dd>{location}</dd>
            <dt>วันที่รับเข้า</dt>
            <dd>{asset.received_date || "-"}</dd>
            <dt>ผู้รับผิดชอบ</dt>
            <dd>
              {!editingResponsible ? (
                <>
                  {asset.responsible_person || "-"}
                  {user && (
                    <button
                      className="link inline-edit-btn"
                      onClick={() => {
                        setResponsibleDraft(asset.responsible_person || "");
                        setEditingResponsible(true);
                      }}
                    >
                      แก้ไข
                    </button>
                  )}
                </>
              ) : (
                <span className="inline-edit-row">
                  <input
                    value={responsibleDraft}
                    onChange={(e) => setResponsibleDraft(e.target.value)}
                    autoFocus
                  />
                  <button className="btn btn-secondary" disabled={busy} onClick={handleSaveResponsible}>
                    บันทึก
                  </button>
                  <button className="btn btn-ghost-dark" onClick={() => setEditingResponsible(false)}>
                    ยกเลิก
                  </button>
                </span>
              )}
            </dd>
          </dl>

          {user && (
            <div className="staff-actions">
              <h2>จัดการสถานะ (เจ้าหน้าที่)</h2>
              <div className="status-buttons">
                {["normal", "repair", "damaged", "disposed"].map((s) => (
                  <button
                    key={s}
                    className="btn btn-secondary"
                    disabled={busy || asset.status === s}
                    onClick={() => handleStatusChange(s)}
                  >
                    เปลี่ยนเป็น: <StatusBadge status={s} />
                  </button>
                ))}
              </div>

              {asset.status === "borrowed" && activeBorrow ? (
                <div className="borrow-panel">
                  <p>
                    กำลังถูกยืมโดย <strong>{activeBorrow.borrower_name}</strong>
                    {activeBorrow.due_date ? ` (กำหนดคืน ${activeBorrow.due_date})` : ""}
                  </p>
                  <button className="btn btn-primary" disabled={busy} onClick={handleReturn}>
                    บันทึกการคืน
                  </button>
                </div>
              ) : (
                asset.status !== "borrowed" && (
                  <form className="borrow-panel" onSubmit={handleBorrow}>
                    <h3>บันทึกการยืม</h3>
                    <input
                      placeholder="ชื่อผู้ยืม"
                      value={borrowerName}
                      onChange={(e) => setBorrowerName(e.target.value)}
                      required
                    />
                    <input
                      placeholder="เบอร์ติดต่อ"
                      value={borrowerContact}
                      onChange={(e) => setBorrowerContact(e.target.value)}
                    />
                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                    <button className="btn btn-primary" disabled={busy} type="submit">
                      ยืนยันการยืม
                    </button>
                  </form>
                )
              )}

              <h2>ประวัติการเปลี่ยนสถานะ</h2>
              <ul className="history-list">
                {history.length === 0 && <li>ยังไม่มีประวัติ</li>}
                {history.map((h) => (
                  <li key={h.id}>
                    {new Date(h.changed_at).toLocaleString("th-TH")}: {h.old_status || "สร้างใหม่"} → {h.new_status}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="detail-qr">
          <QRCodeDisplay assetCode={asset.asset_code} assetName={asset.name} />
        </div>
      </div>
    </div>
  );
}
