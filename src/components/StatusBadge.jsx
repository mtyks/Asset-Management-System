const STATUS_MAP = {
  normal: { label: "ปกติ", className: "badge badge-normal" },
  repair: { label: "ซ่อม", className: "badge badge-repair" },
  borrowed: { label: "ถูกยืม", className: "badge badge-borrowed" },
  damaged: { label: "ชำรุด", className: "badge badge-damaged" },
  disposed: { label: "รอจำหน่าย", className: "badge badge-disposed" },
};

export default function StatusBadge({ status }) {
  const info = STATUS_MAP[status] || { label: status, className: "badge" };
  return <span className={info.className}>{info.label}</span>;
}

export { STATUS_MAP };
