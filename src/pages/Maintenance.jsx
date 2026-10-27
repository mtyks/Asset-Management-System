import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listAssets, updateAssetStatus } from "../lib/queries";
import { supabase } from "../supabaseClient";
import {
  Wrench,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Flame,
  ArrowLeft,
  ChevronRight,
  Package,
  Layers,
  MapPin,
  User,
  Phone,
  Calendar,
  X,
  FileText,
  Check,
  Edit,
  Trash2,
  LayoutGrid,
} from "lucide-react";

// Local storage key for fallback/offline persistence
const STORAGE_KEY = "asset_maintenance_tickets";

// Sample initial data if completely empty
const DEFAULT_TICKETS = [
  {
    id: "1",
    repair_no: "RP-2569-001",
    asset_code: "A-2569-1001",
    asset_name: "คอมพิวเตอร์ All-in-One Dell OptiPlex",
    problem: "เปิดเครื่องแล้วจอไม่ติด มีเสียง Beep Code 3 ครั้ง พัดลมหมุนดังผิดปกติ",
    urgency: "urgent", // 'normal' | 'urgent' | 'critical'
    location: "ห้องธุรการและสารบรรณ",
    reporter_name: "สมศรี พูนสุข",
    reporter_contact: "081-234-5678 (ต่อ 102)",
    status: "in_progress", // 'pending' | 'in_progress' | 'completed' | 'cancelled'
    technician_note: "ตรวจพบ RAM หลวมและมีฝุ่นสะสม กำลังทำความสะอาดและทดสอบ Boot เครื่อง",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    completed_at: null,
  },
  {
    id: "2",
    repair_no: "RP-2569-002",
    asset_code: "A-2569-1003",
    asset_name: "เครื่องโปรเจกเตอร์ 4K Epson",
    problem: "หลอดภาพกระพริบ และแจ้งเตือน Lamp Overheat หลังเปิดใช้งานได้ 10 นาที",
    urgency: "critical",
    location: "ห้องประชุมใหญ่ (ชั้น 1)",
    reporter_name: "วิชัย เกียรติสกุล",
    reporter_contact: "089-876-5432 (ต่อ 201)",
    status: "pending",
    technician_note: "",
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    completed_at: null,
  },
  {
    id: "3",
    repair_no: "RP-2569-003",
    asset_code: "A-2569-1002",
    asset_name: "โต๊ะทำงานผู้บริหาร 180 ซม.",
    problem: "รางลิ้นชักด้านขวาหลุดและติดขัด ไม่สามารถเปิดได้",
    urgency: "normal",
    location: "ห้องผู้อำนวยการ",
    reporter_name: "สุดาพร มั่นคง",
    reporter_contact: "ต่อ 105",
    status: "completed",
    technician_note: "เปลี่ยนรางเลื่อนลิ้นชักใหม่และขันน็อตยึดแน่นเรียบร้อย ใช้งานได้ปกติ",
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    completed_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

export default function Maintenance() {
  const [tickets, setTickets] = useState([]);
  const [assetsList, setAssetsList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Form State: New Ticket
  const [formData, setFormData] = useState({
    asset_code: "",
    asset_name: "",
    problem: "",
    urgency: "normal",
    location: "",
    reporter_name: "",
    reporter_contact: "",
  });

  // Form State: Update Ticket Status
  const [updateStatus, setUpdateStatus] = useState("in_progress");
  const [updateNote, setUpdateNote] = useState("");

  // Load Tickets and Assets
  const loadData = () => {
    setLoading(true);

    // 1. Load assets for dropdown
    listAssets()
      .then((data) => setAssetsList(data || []))
      .catch(() => {});

    // 2. Load tickets from localStorage or Supabase
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setTickets(JSON.parse(saved));
      } else {
        setTickets(DEFAULT_TICKETS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TICKETS));
      }
    } catch {
      setTickets(DEFAULT_TICKETS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Save tickets to local state & storage
  const saveTickets = (updatedList) => {
    setTickets(updatedList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
    } catch (e) {
      console.warn("Storage save error:", e);
    }
  };

  // Handle Add New Repair Ticket
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!formData.problem.trim() || !formData.reporter_name.trim()) {
      alert("กรุณาระบุอาการชำรุดและชื่อผู้แจ้งซ่อม");
      return;
    }

    const nextId = Date.now().toString();
    const repairNo = `RP-2569-${String(tickets.length + 1).padStart(3, "0")}`;

    let resolvedAssetName = formData.asset_name;
    let resolvedLocation = formData.location;

    // Auto-fill from asset if selected
    if (formData.asset_code) {
      const matched = assetsList.find((a) => a.asset_code === formData.asset_code);
      if (matched) {
        resolvedAssetName = resolvedAssetName || matched.name;
        resolvedLocation = resolvedLocation || matched.rooms?.room_name || "";
        // Optionally update asset status in database to 'repair'
        try {
          await updateAssetStatus(formData.asset_code, "repair", `แจ้งซ่อม: ${formData.problem}`);
        } catch {
          // ignore
        }
      }
    }

    const newTicket = {
      id: nextId,
      repair_no: repairNo,
      asset_code: formData.asset_code.trim() || "-",
      asset_name: resolvedAssetName.trim() || "อุปกรณ์ทั่วไป",
      problem: formData.problem.trim(),
      urgency: formData.urgency,
      location: resolvedLocation.trim() || "ไม่ระบุสถานที่",
      reporter_name: formData.reporter_name.trim(),
      reporter_contact: formData.reporter_contact.trim() || "-",
      status: "pending",
      technician_note: "",
      created_at: new Date().toISOString(),
      completed_at: null,
    };

    const updated = [newTicket, ...tickets];
    saveTickets(updated);

    setShowAddModal(false);
    setFormData({
      asset_code: "",
      asset_name: "",
      problem: "",
      urgency: "normal",
      location: "",
      reporter_name: "",
      reporter_contact: "",
    });
    alert(`บันทึกคำขอแจ้งซ่อมสำเร็จ! รหัสใบแจ้งซ่อม: ${repairNo}`);
  };

  // Handle Open Update Status Modal
  const handleOpenUpdate = (ticket) => {
    setSelectedTicket(ticket);
    setUpdateStatus(ticket.status || "in_progress");
    setUpdateNote(ticket.technician_note || "");
    setShowUpdateModal(true);
  };

  // Handle Save Status Update
  const handleSaveUpdate = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;

    const isCompleted = updateStatus === "completed";
    const updated = tickets.map((t) => {
      if (t.id === selectedTicket.id) {
        return {
          ...t,
          status: updateStatus,
          technician_note: updateNote.trim(),
          completed_at: isCompleted ? new Date().toISOString() : t.completed_at,
        };
      }
      return t;
    });

    saveTickets(updated);

    // If marked completed, update asset status back to normal in database
    if (isCompleted && selectedTicket.asset_code && selectedTicket.asset_code !== "-") {
      try {
        await updateAssetStatus(selectedTicket.asset_code, "normal", "ซ่อมเสร็จสิ้น: " + updateNote);
      } catch {
        // ignore
      }
    }

    setShowUpdateModal(false);
    setSelectedTicket(null);
  };

  // Handle Delete Ticket
  const handleDeleteTicket = (ticket) => {
    if (!window.confirm(`ยืนยันการลบรายการแจ้งซ่อม ${ticket.repair_no}?`)) return;
    const filtered = tickets.filter((t) => t.id !== ticket.id);
    saveTickets(filtered);
  };

  // Filtered Tickets
  const filteredTickets = tickets.filter((t) => {
    const matchSearch =
      search === "" ||
      t.repair_no.toLowerCase().includes(search.toLowerCase()) ||
      t.asset_code.toLowerCase().includes(search.toLowerCase()) ||
      t.asset_name.toLowerCase().includes(search.toLowerCase()) ||
      t.problem.toLowerCase().includes(search.toLowerCase()) ||
      t.reporter_name.toLowerCase().includes(search.toLowerCase());

    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchUrgency = urgencyFilter === "all" || t.urgency === urgencyFilter;

    return matchSearch && matchStatus && matchUrgency;
  });

  // Calculate Counts
  const counts = {
    total: tickets.length,
    pending: tickets.filter((t) => t.status === "pending").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    completed: tickets.filter((t) => t.status === "completed").length,
  };

  return (
    <div className="maintenance-layout">
      {/* Standalone Maintenance Topbar */}
      <header className="maintenance-topbar">
        <div className="maintenance-topbar-inner">
          <div className="maintenance-brand">
            <div className="maintenance-brand-icon">
              <Wrench size={20} />
            </div>
            <div>
              <div className="maintenance-brand-title">ระบบแจ้งซ่อมและบำรุงรักษา</div>
              <div className="maintenance-brand-sub">Maintenance &amp; Helpdesk Service System</div>
            </div>
          </div>

          <div className="maintenance-topbar-actions">
            <Link to="/" className="btn btn-outline-white" style={{ fontSize: "0.82rem", padding: "6px 12px" }}>
              <LayoutGrid size={15} />
              <span>หน้าเลือกเมนูรวม</span>
            </Link>

            <button
              type="button"
              className="btn btn-primary"
              style={{ fontSize: "0.84rem", padding: "6px 14px", backgroundColor: "#0284c7" }}
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>แจ้งซ่อม</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="page-container" style={{ maxWidth: 1240, margin: "0 auto", padding: "24px 20px", width: "100%" }}>
        {/* 1. Header Row */}
        <div className="page-heading-row">
          <div className="page-title-group">
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
              <span
                style={{
                  backgroundColor: "#e0f2fe",
                  color: "#0284c7",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "6px",
                }}
              >
                SERVICE HELPDESK
              </span>
              <h1 style={{ margin: 0 }}>รายการแจ้งซ่อมทั้งหมด</h1>
            </div>
            <p className="page-subtitle">
              บันทึกคำขอแจ้งซ่อม ติดตามสถานะงานซ่อม มอบหมายงานช่าง และประวัติการบำรุงรักษา
            </p>
          </div>
        </div>

      {/* 2. Stat Summary Cards Grid (4 cards) */}
      <div className="stats-summary-grid">
        {/* Total */}
        <div className="stat-box">
          <div className="stat-box-icon total">
            <Wrench size={22} />
          </div>
          <div className="stat-box-body">
            <div className="stat-box-label">คำขอแจ้งซ่อมทั้งหมด</div>
            <div className="stat-box-val-row">
              <span className="stat-box-number">{counts.total}</span>
              <span className="stat-box-unit">รายการ</span>
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="stat-box">
          <div className="stat-box-icon" style={{ backgroundColor: "#fef3c7", color: "#d97706" }}>
            <Clock size={22} />
          </div>
          <div className="stat-box-body">
            <div className="stat-box-label">รอดำเนินการ (Pending)</div>
            <div className="stat-box-val-row">
              <span className="stat-box-number" style={{ color: "#d97706" }}>
                {counts.pending}
              </span>
              <span className="stat-box-unit">รายการ</span>
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div className="stat-box">
          <div className="stat-box-icon" style={{ backgroundColor: "#e0f2fe", color: "#0284c7" }}>
            <Flame size={22} />
          </div>
          <div className="stat-box-body">
            <div className="stat-box-label">กำลังดำเนินการซ่อม</div>
            <div className="stat-box-val-row">
              <span className="stat-box-number" style={{ color: "#0284c7" }}>
                {counts.in_progress}
              </span>
              <span className="stat-box-unit">รายการ</span>
            </div>
          </div>
        </div>

        {/* Completed */}
        <div className="stat-box">
          <div className="stat-box-icon normal">
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-box-body">
            <div className="stat-box-label">ซ่อมเสร็จสิ้นแล้ว</div>
            <div className="stat-box-val-row">
              <span className="stat-box-number normal">{counts.completed}</span>
              <span className="stat-box-unit">รายการ</span>
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
            placeholder="ค้นหาเลขที่แจ้งซ่อม, รหัสครุภัณฑ์, อาการ, ผู้แจ้ง..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">ทุกสถานะงานซ่อม</option>
          <option value="pending">รอดำเนินการ (Pending)</option>
          <option value="in_progress">กำลังดำเนินการ (In Progress)</option>
          <option value="completed">ซ่อมเสร็จสิ้น (Completed)</option>
          <option value="cancelled">ยกเลิกคำขอ (Cancelled)</option>
        </select>

        <select
          className="filter-select"
          value={urgencyFilter}
          onChange={(e) => setUrgencyFilter(e.target.value)}
        >
          <option value="all">ทุกระดับความเร่งด่วน</option>
          <option value="normal">ทั่วไป (Normal)</option>
          <option value="urgent">ด่วน (Urgent)</option>
          <option value="critical">ด่วนที่สุด (Critical)</option>
        </select>
      </div>

      {/* 4. Table of Repair Tickets */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th style={{ minWidth: "120px" }}>เลขที่แจ้ง</th>
                <th style={{ minWidth: "170px" }}>ครุภัณฑ์ / อุปกรณ์</th>
                <th style={{ minWidth: "200px" }}>อาการชำรุด / ปัญหา</th>
                <th style={{ minWidth: "110px" }}>ความเร่งด่วน</th>
                <th style={{ minWidth: "130px" }}>สถานที่</th>
                <th style={{ minWidth: "130px" }}>ผู้แจ้ง / ติดต่อ</th>
                <th style={{ minWidth: "120px" }}>สถานะ</th>
                <th style={{ minWidth: "130px", textAlign: "right" }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="table-empty-row">
                    กำลังโหลดข้อมูลรายการแจ้งซ่อม...
                  </td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="table-empty-row">
                    ไม่พบรายการแจ้งซ่อมตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                filteredTickets.map((t) => {
                  const urgencyBadge =
                    t.urgency === "critical" ? (
                      <span className="status-pill status-damaged" style={{ fontSize: "0.75rem" }}>
                        ด่วนที่สุด
                      </span>
                    ) : t.urgency === "urgent" ? (
                      <span className="status-pill status-repair" style={{ fontSize: "0.75rem" }}>
                        ด่วน
                      </span>
                    ) : (
                      <span className="status-pill status-normal" style={{ fontSize: "0.75rem", backgroundColor: "#f1f5f9", color: "#475569" }}>
                        ปกติ
                      </span>
                    );

                  const statusBadge =
                    t.status === "completed" ? (
                      <span className="status-pill status-normal">
                        <span className="status-dot" />
                        ซ่อมเสร็จสิ้น
                      </span>
                    ) : t.status === "in_progress" ? (
                      <span className="status-pill status-borrowed">
                        <span className="status-dot" />
                        กำลังซ่อม
                      </span>
                    ) : t.status === "cancelled" ? (
                      <span className="status-pill" style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}>
                        ยกเลิกแล้ว
                      </span>
                    ) : (
                      <span className="status-pill status-repair">
                        <span className="status-dot" />
                        รอดำเนินการ
                      </span>
                    );

                  return (
                    <tr key={t.id}>
                      {/* Repair No */}
                      <td>
                        <span style={{ fontWeight: 700, fontFamily: "monospace", color: "#064e3b" }}>
                          {t.repair_no}
                        </span>
                        <div style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
                          {new Date(t.created_at).toLocaleDateString("th-TH")}
                        </div>
                      </td>

                      {/* Asset */}
                      <td>
                        <div style={{ fontWeight: 600, color: "#0f291e" }}>{t.asset_name}</div>
                        {t.asset_code && t.asset_code !== "-" && (
                          <div style={{ fontSize: "0.76rem", fontFamily: "monospace", color: "#059669" }}>
                            {t.asset_code}
                          </div>
                        )}
                      </td>

                      {/* Problem Description */}
                      <td>
                        <div style={{ fontSize: "0.85rem", color: "#334155", lineHeight: 1.4 }}>
                          {t.problem}
                        </div>
                        {t.technician_note && (
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: "0.76rem",
                              color: "#0369a1",
                              backgroundColor: "#f0f9ff",
                              padding: "2px 6px",
                              borderRadius: "4px",
                            }}
                          >
                            บันทึกช่าง: {t.technician_note}
                          </div>
                        )}
                      </td>

                      {/* Urgency */}
                      <td>{urgencyBadge}</td>

                      {/* Location */}
                      <td>
                        <span style={{ fontSize: "0.82rem", color: "#475569" }}>
                          {t.location}
                        </span>
                      </td>

                      {/* Reporter */}
                      <td>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>
                          {t.reporter_name}
                        </div>
                        <div style={{ fontSize: "0.76rem", color: "#64748b" }}>
                          {t.reporter_contact}
                        </div>
                      </td>

                      {/* Status */}
                      <td>{statusBadge}</td>

                      {/* Actions */}
                      <td>
                        <div className="table-actions" style={{ justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="action-btn-link"
                            onClick={() => handleOpenUpdate(t)}
                            title="อัปเดตสถานะงานซ่อม"
                          >
                            อัปเดตงาน
                          </button>
                          <button
                            type="button"
                            className="action-btn-link danger"
                            onClick={() => handleDeleteTicket(t)}
                            title="ลบคำขอแจ้งซ่อม"
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
      </div>

      {/* Modal: New Repair Ticket */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: "620px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: "#e0f2fe",
                    color: "#0284c7",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Wrench size={20} />
                </div>
                <h3 className="modal-title" style={{ margin: 0 }}>
                  ส่งคำขอแจ้งซ่อมใหม่ (Submit Repair Ticket)
                </h3>
              </div>
              <button
                type="button"
                className="action-btn-link"
                onClick={() => setShowAddModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>เลือกครุภัณฑ์ในระบบ (หากมี)</label>
                <select
                  className="form-control"
                  value={formData.asset_code}
                  onChange={(e) => {
                    const code = e.target.value;
                    const found = assetsList.find((a) => a.asset_code === code);
                    setFormData((prev) => ({
                      ...prev,
                      asset_code: code,
                      asset_name: found ? found.name : prev.asset_name,
                      location: found?.rooms?.room_name || prev.location,
                    }));
                  }}
                >
                  <option value="">-- ไม่ระบุ / แจ้งซ่อมอุปกรณ์ทั่วไป --</option>
                  {assetsList.map((a) => (
                    <option key={a.asset_code} value={a.asset_code}>
                      {a.asset_code} - {a.name} ({a.rooms?.room_name || "ไม่ระบุห้อง"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-grid" style={{ marginBottom: 14 }}>
                <div className="form-group">
                  <label>ชื่อครุภัณฑ์ / อุปกรณ์ที่ชำรุด *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น คอมพิวเตอร์ Dell, เครื่องปรับอากาศ"
                    value={formData.asset_name}
                    onChange={(e) => setFormData((f) => ({ ...f, asset_name: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>ระดับความเร่งด่วน</label>
                  <select
                    className="form-control"
                    value={formData.urgency}
                    onChange={(e) => setFormData((f) => ({ ...f, urgency: e.target.value }))}
                  >
                    <option value="normal">ทั่วไป (Normal)</option>
                    <option value="urgent">ด่วน (Urgent)</option>
                    <option value="critical">ด่วนที่สุด (Critical)</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>อาการชำรุด / รายละเอียดปัญหาที่พบ *</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="อธิบายอาการเสีย เช่น เปิดไม่ติด มีเสียงดัง ภาพไม่ขึ้น น้ำหยด..."
                  value={formData.problem}
                  onChange={(e) => setFormData((f) => ({ ...f, problem: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>สถานที่ตั้งของอุปกรณ์ / ห้องประจำ</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="เช่น ห้องธุรการ ชั้น 1 อาคารหลัก"
                  value={formData.location}
                  onChange={(e) => setFormData((f) => ({ ...f, location: e.target.value }))}
                />
              </div>

              <div className="form-grid" style={{ marginBottom: 20 }}>
                <div className="form-group">
                  <label>ชื่อผู้แจ้งซ่อม *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น สมศรี พูนสุข"
                    value={formData.reporter_name}
                    onChange={(e) => setFormData((f) => ({ ...f, reporter_name: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>เบอร์โทรศัพท์ / ช่องทางติดต่อ</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น 081-xxx-xxxx หรือ เบอร์ต่อภายใน"
                    value={formData.reporter_contact}
                    onChange={(e) => setFormData((f) => ({ ...f, reporter_contact: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} />
                  <span>ยืนยันส่งใบแจ้งซ่อม</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Update Ticket Status */}
      {showUpdateModal && selectedTicket && (
        <div className="modal-overlay" onClick={() => setShowUpdateModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: "540px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: "#f0fdf4",
                    color: "#059669",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Edit size={20} />
                </div>
                <div>
                  <h3 className="modal-title" style={{ margin: 0 }}>
                    อัปเดตสถานะงานซ่อม
                  </h3>
                  <div style={{ fontSize: "0.8rem", color: "#52796f" }}>
                    {selectedTicket.repair_no} - {selectedTicket.asset_name}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="action-btn-link"
                onClick={() => setShowUpdateModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUpdate}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>เปลี่ยนสถานะงาน</label>
                <select
                  className="form-control"
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                >
                  <option value="pending">รอดำเนินการ (Pending)</option>
                  <option value="in_progress">กำลังดำเนินการซ่อม (In Progress)</option>
                  <option value="completed">ซ่อมเสร็จสิ้นแล้ว (Completed)</option>
                  <option value="cancelled">ยกเลิกคำขอ (Cancelled)</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>บันทึกการซ่อม / ผลการดำเนินงานของช่าง</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="เช่น ตรวจเช็คแล้ว อะไหล่ชำรุด เปลี่ยนอะไหล่ใหม่ ทดสอบการใช้งานแล้วปกติ..."
                  value={updateNote}
                  onChange={(e) => setUpdateNote(e.target.value)}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowUpdateModal(false)}
                >
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary">
                  <Check size={16} />
                  <span>บันทึกการอัปเดต</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
