import React from "react";

const STATUS_MAP = {
  normal: { label: "ใช้งานปกติ", className: "status-normal" },
  in_use: { label: "ใช้งานปกติ", className: "status-normal" },
  borrowed: { label: "ยืมใช้งาน", className: "status-borrowed" },
  borrow: { label: "ยืมใช้งาน", className: "status-borrowed" },
  repair: { label: "ส่งซ่อม", className: "status-repair" },
  maintenance: { label: "ส่งซ่อม", className: "status-repair" },
  damaged: { label: "ชำรุด", className: "status-damaged" },
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
