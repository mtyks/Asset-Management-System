import React, { useState, useEffect } from "react";
import {
  listAssets,
  listMaintenance,
  createMaintenance,
  completeMaintenance,
} from "../lib/queries";
import { Wrench, Plus, CheckCircle, AlertCircle, Clock } from "lucide-react";

export default function Maintenance() {
  const [assets, setAssets] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [problem, setProblem] = useState("");
  const [reporter, setReporter] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refreshData = () => {
    setLoading(true);
    Promise.all([
      listAssets().then(setAssets).catch(() => {}),
      listMaintenance().then(setRepairs).catch(() => {}),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleAddRepair = async (e) => {
    e.preventDefault();
    if (!selectedAssetId || !problem.trim() || !reporter.trim()) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }
    setSubmitting(true);
    try {
      await createMaintenance({
        repair_no: `RP-2569-${String(repairs.length + 1).padStart(3, "0")}`,
        asset_id: selectedAssetId,
        problem: problem.trim(),
        reporter: reporter.trim(),
        status: "pending",
      });

      setShowModal(false);
      setSelectedAssetId("");
      setProblem("");
      setReporter("");
      refreshData();
      alert("บันทึกการส่งซ่อมเรียบร้อยแล้ว");
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteRepair = async (item) => {
    try {
      await completeMaintenance(item.id, item.asset_id);
      refreshData();
      alert("บันทึกการซ่อมเสร็จสิ้นแล้ว");
    } catch (err) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    }
  };

  return (
    <div className="page-container">
      <div className="page-heading-row">
        <div className="page-title-group">
          <h1>ซ่อมบำรุงครุภัณฑ์</h1>
          <p className="page-subtitle">
            ติดตามรายการแจ้งซ่อม ตรวจสอบประวัติการบำรุงรักษา และการประเมินสภาพ
          </p>
        </div>

        <div className="page-actions-group">
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            <span>สร้างใบแจ้งซ่อม</span>
          </button>
        </div>
      </div>

      <div className="table-card">
        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th>เลขที่แจ้งซ่อม</th>
                <th>รหัส / ชื่อครุภัณฑ์</th>
                <th>อาการ / ปัญหา</th>
                <th>ผู้แจ้งซ่อม</th>
                <th>วันที่แจ้ง</th>
                <th>สถานะการซ่อม</th>
                <th style={{ textAlign: "right" }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="table-empty-row">
                    กำลังโหลดข้อมูลการแจ้งซ่อม...
                  </td>
                </tr>
              ) : repairs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="table-empty-row">
                    ไม่มีรายการแจ้งซ่อมที่รอดำเนินการ
                  </td>
                </tr>
              ) : (
                repairs.map((item) => {
                  const assetCode = item.assets?.asset_code || item.asset_code || "-";
                  const assetName = item.assets?.name || item.asset_name || "ครุภัณฑ์";
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 700, color: "#0f172a" }}>{item.repair_no || item.repairNo || "RP-2569"}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>{assetCode}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{assetName}</div>
                      </td>
                      <td style={{ maxWidth: 300 }}>{item.problem}</td>
                      <td>{item.reporter}</td>
                      <td>{item.repair_date || item.repairDate || new Date().toISOString().slice(0, 10)}</td>
                      <td>
                        {item.status === "pending" ? (
                          <span className="status-pill status-repair">
                            <span className="status-dot" />
                            อยู่ระหว่างซ่อม
                          </span>
                        ) : (
                          <span className="status-pill status-normal">
                            <span className="status-dot" />
                            ซ่อมเสร็จแล้ว
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {item.status === "pending" && (
                          <button
                            className="action-btn-link"
                            style={{ color: "#059669", backgroundColor: "#ecfdf5" }}
                            onClick={() => handleCompleteRepair(item)}
                          >
                            เสร็จสิ้นการซ่อม
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

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">สร้างใบแจ้งซ่อมครุภัณฑ์</h3>
            </div>
            <form onSubmit={handleAddRepair}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>เลือกครุภัณฑ์ที่ชำรุด *</label>
                <select
                  className="form-control"
                  value={selectedAssetId}
                  onChange={(e) => setSelectedAssetId(e.target.value)}
                  required
                >
                  <option value="">-- กรุณาเลือกครุภัณฑ์ --</option>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.asset_code || a.code} - {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>อาการ / ปัญหาที่พบ *</label>
                <textarea
                  className="form-control"
                  placeholder="ระบุอาการชำรุด เช่น เปิดไม่ติด, หน้าจอแตก, น้ำยาแอร์รั่ว"
                  value={problem}
                  onChange={(e) => setProblem(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>ชื่อผู้แจ้งซ่อม *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="เช่น อนันต์ ระบบดี"
                  value={reporter}
                  onChange={(e) => setReporter(e.target.value)}
                  required
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "กำลังบันทึก..." : "ส่งใบแจ้งซ่อม"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
