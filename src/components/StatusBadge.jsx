import React from "react";

const STATUS_MAP = {
  normal: { label: "ใช้งานปกติ", className: "status-normal" },
  in_use: { label: "ใช้งานปกติ", className: "status-in_use" },
  borrowed: { label: "ยืมใช้งาน", className: "status-borrowed" },
  borrow: { label: "ยืมใช้งาน", className: "status-borrowed" },
  repair: { label: "ส่งซ่อม", className: "status-repair" },
  maintenance: { label: "ส่งซ่อม", className: "status-maintenance" },
  damaged: { label: "ชำรุด", className: "status-damaged" },
  disposed: { label: "จำหน่ายแล้ว", className: "status-disposed" },
};

export default function StatusBadge({ status }) {
  const info = STATUS_MAP[status] || {
    label: status || "ไม่ระบุ",
    className: "status-normal",
  };

  return (
    <span className={`status-pill ${info.className}`}>
      <span className="status-dot" />
      {info.label}
    </span>
  );
}

export { STATUS_MAP };
