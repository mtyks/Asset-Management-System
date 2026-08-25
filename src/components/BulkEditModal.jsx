import React, { useState } from "react";
import { bulkUpdateAssets } from "../lib/queries";
import { Edit3, CheckCircle2, AlertCircle, X, Layers, MapPin, User, Calendar, CheckSquare } from "lucide-react";

export default function BulkEditModal({
  isOpen,
  onClose,
  selectedCodes = [],
  categories = [],
  rooms = [],
  onSuccess,
}) {
  // Toggle switches to indicate which fields to update
  const [fieldsToUpdate, setFieldsToUpdate] = useState({
    status: false,
    category_code: false,
    room_code: false,
    responsible_person: false,
    received_date: false,
  });

  const [formValues, setFormValues] = useState({
    status: "normal",
    category_code: "",
    room_code: "",
    responsible_person: "",
    received_date: new Date().toISOString().slice(0, 10),
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const toggleField = (field) => {
    setFieldsToUpdate((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleValueChange = (field, value) => {
    setFormValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedCodes.length === 0) return;

    // Check if at least one field is selected
    const activeFields = Object.keys(fieldsToUpdate).filter((k) => fieldsToUpdate[k]);
    if (activeFields.length === 0) {
      setError("กรุณาติ๊กเลือกอย่างน้อย 1 หัวข้อที่ต้องการแก้ไข");
      return;
    }

    const payload = {};
    for (const field of activeFields) {
      if (field === "category_code") {
        payload.category_code = formValues.category_code || null;
      } else if (field === "room_code") {
        payload.room_code = formValues.room_code || null;
      } else if (field === "responsible_person") {
        payload.responsible_person = formValues.responsible_person.trim() || null;
      } else if (field === "received_date") {
        payload.received_date = formValues.received_date || null;
      } else if (field === "status") {
        payload.status = formValues.status || "normal";
      }
    }

    setSubmitting(true);
    setError(null);

    try {
      await bulkUpdateAssets(selectedCodes, payload);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError("อัปเดตไม่สำเร็จ: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: "620px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="modal-header"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: "#ecfdf5",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Edit3 size={20} />
            </div>
            <div>
              <h3 className="modal-title" style={{ margin: 0 }}>
                แก้ไขข้อมูลหลายรายการพร้อมกัน (Bulk Edit)
              </h3>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#059669", fontWeight: 600 }}>
                กำลังเลือกแก้ไข {selectedCodes.length} รายการ
              </p>
            </div>
          </div>
          <button
            type="button"
            className="action-btn-link"
            onClick={onClose}
            style={{ padding: "6px" }}
          >
            <X size={18} />
          </button>
        </div>

        {error && <div className="form-error-banner">{error}</div>}

        <p style={{ fontSize: "0.85rem", color: "#52796f", margin: "0 0 16px" }}>
          💡 ติ๊กถูกช่องหน้าหัวข้อที่ต้องการเปลี่ยน ข้อมูลในช่องที่ไม่ได้ติ๊กจะไม่ถูกเปลี่ยนแปลง
        </p>

        <form onSubmit={handleSubmit}>
          {/* 1. Status */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "8px",
              backgroundColor: fieldsToUpdate.status ? "#f0fdf4" : "#f8fafc",
              border: `1px solid ${fieldsToUpdate.status ? "#a7f3d0" : "#e2ece6"}`,
              marginBottom: "12px",
              transition: "all 0.15s ease",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontWeight: 600,
                fontSize: "0.88rem",
                cursor: "pointer",
                color: fieldsToUpdate.status ? "#064e3b" : "#334155",
                marginBottom: fieldsToUpdate.status ? 8 : 0,
              }}
            >
              <input
                type="checkbox"
                checked={fieldsToUpdate.status}
                onChange={() => toggleField("status")}
                style={{ width: 16, height: 16, accentColor: "#059669" }}
              />
              <span>เปลี่ยนสถานะครุภัณฑ์ (Status)</span>
            </label>

            {fieldsToUpdate.status && (
              <select
                className="form-control"
                value={formValues.status}
                onChange={(e) => handleValueChange("status", e.target.value)}
              >
                <option value="normal">ใช้งานปกติ</option>
                <option value="borrowed">ยืมใช้งาน</option>
                <option value="repair">ส่งซ่อม</option>
                <option value="damaged">ชำรุด</option>
              </select>
            )}
          </div>

          {/* 2. Category */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "8px",
              backgroundColor: fieldsToUpdate.category_code ? "#f0fdf4" : "#f8fafc",
              border: `1px solid ${fieldsToUpdate.category_code ? "#a7f3d0" : "#e2ece6"}`,
              marginBottom: "12px",
              transition: "all 0.15s ease",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontWeight: 600,
                fontSize: "0.88rem",
                cursor: "pointer",
                color: fieldsToUpdate.category_code ? "#064e3b" : "#334155",
                marginBottom: fieldsToUpdate.category_code ? 8 : 0,
              }}
            >
              <input
                type="checkbox"
                checked={fieldsToUpdate.category_code}
                onChange={() => toggleField("category_code")}
                style={{ width: 16, height: 16, accentColor: "#059669" }}
              />
              <span>เปลี่ยนหมวดหมู่ (Category)</span>
            </label>

            {fieldsToUpdate.category_code && (
              <select
                className="form-control"
                value={formValues.category_code}
                onChange={(e) => handleValueChange("category_code", e.target.value)}
              >
                <option value="">-- ไม่ระบุหมวดหมู่ --</option>
                {categories.map((c) => (
                  <option key={c.category_code || c.id} value={c.category_code || c.id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 3. Room / Location */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "8px",
              backgroundColor: fieldsToUpdate.room_code ? "#f0fdf4" : "#f8fafc",
              border: `1px solid ${fieldsToUpdate.room_code ? "#a7f3d0" : "#e2ece6"}`,
              marginBottom: "12px",
              transition: "all 0.15s ease",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontWeight: 600,
                fontSize: "0.88rem",
                cursor: "pointer",
                color: fieldsToUpdate.room_code ? "#064e3b" : "#334155",
                marginBottom: fieldsToUpdate.room_code ? 8 : 0,
              }}
            >
              <input
                type="checkbox"
                checked={fieldsToUpdate.room_code}
                onChange={() => toggleField("room_code")}
                style={{ width: 16, height: 16, accentColor: "#059669" }}
              />
              <span>เปลี่ยนสถานที่ / ห้อง (Location)</span>
            </label>

            {fieldsToUpdate.room_code && (
              <select
                className="form-control"
                value={formValues.room_code}
                onChange={(e) => handleValueChange("room_code", e.target.value)}
              >
                <option value="">-- ไม่ระบุห้อง --</option>
                {rooms.map((r) => (
                  <option key={r.room_code || r.id} value={r.room_code || r.id}>
                    {r.room_name} ({r.room_code})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 4. Responsible Person */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "8px",
              backgroundColor: fieldsToUpdate.responsible_person ? "#f0fdf4" : "#f8fafc",
              border: `1px solid ${fieldsToUpdate.responsible_person ? "#a7f3d0" : "#e2ece6"}`,
              marginBottom: "12px",
              transition: "all 0.15s ease",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontWeight: 600,
                fontSize: "0.88rem",
                cursor: "pointer",
                color: fieldsToUpdate.responsible_person ? "#064e3b" : "#334155",
                marginBottom: fieldsToUpdate.responsible_person ? 8 : 0,
              }}
            >
              <input
                type="checkbox"
                checked={fieldsToUpdate.responsible_person}
                onChange={() => toggleField("responsible_person")}
                style={{ width: 16, height: 16, accentColor: "#059669" }}
              />
              <span>เปลี่ยนผู้รับผิดชอบ / ผู้ดูแล</span>
            </label>

            {fieldsToUpdate.responsible_person && (
              <input
                type="text"
                className="form-control"
                placeholder="เช่น สมชาย ใจดี หรือชื่อผู้ดูแลคนใหม่"
                value={formValues.responsible_person}
                onChange={(e) => handleValueChange("responsible_person", e.target.value)}
              />
            )}
          </div>

          {/* 5. Received Date */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "8px",
              backgroundColor: fieldsToUpdate.received_date ? "#f0fdf4" : "#f8fafc",
              border: `1px solid ${fieldsToUpdate.received_date ? "#a7f3d0" : "#e2ece6"}`,
              marginBottom: "20px",
              transition: "all 0.15s ease",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontWeight: 600,
                fontSize: "0.88rem",
                cursor: "pointer",
                color: fieldsToUpdate.received_date ? "#064e3b" : "#334155",
                marginBottom: fieldsToUpdate.received_date ? 8 : 0,
              }}
            >
              <input
                type="checkbox"
                checked={fieldsToUpdate.received_date}
                onChange={() => toggleField("received_date")}
                style={{ width: 16, height: 16, accentColor: "#059669" }}
              />
              <span>เปลี่ยนวันที่ตรวจรับเข้าคลัง</span>
            </label>

            {fieldsToUpdate.received_date && (
              <input
                type="date"
                className="form-control"
                value={formValues.received_date}
                onChange={(e) => handleValueChange("received_date", e.target.value)}
              />
            )}
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting || selectedCodes.length === 0}
            >
              <CheckSquare size={16} />
              <span>{submitting ? "กำลังบันทึก..." : `บันทึกการแก้ไข (${selectedCodes.length} รายการ)`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
