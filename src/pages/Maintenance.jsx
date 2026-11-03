import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import {
  listAssets,
  updateAssetStatus,
  fetchMaintenanceTickets,
  saveMaintenanceTicketToCloud,
  deleteMaintenanceTicketFromCloud,
  uploadRepairPhoto,
} from "../lib/queries";
import {
  Wrench,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Flame,
  X,
  Check,
  Edit,
  LayoutGrid,
  QrCode,
  Camera,
  CameraOff,
  Upload,
  Printer,
  Image as ImageIcon,
  UserCheck,
  Banknote,
  Building2,
  Calendar,
  Eye,
  Cloud,
  Download,
  BookOpen,
  AlertTriangle,
  Columns,
  Table as TableIcon,
  Timer,
} from "lucide-react";

const QR_MODAL_SCANNER_ID = "maintenance-qr-reader";

const QUICK_TECHNICIANS = [
  "ทีมช่างไอทีและคอมพิวเตอร์",
  "ทีมช่างไฟฟ้าและอาคาร",
  "ช่างเทคนิคพัสดุกลาง",
];

// Sample initial data with enriched fields
const DEFAULT_TICKETS = [
  {
    id: "1",
    repair_no: "RP-2569-001",
    asset_code: "A-2569-1001",
    asset_name: "คอมพิวเตอร์ All-in-One Dell OptiPlex",
    problem: "เปิดเครื่องแล้วจอไม่ติด มีเสียง Beep Code 3 ครั้ง พัดลมหมุนดังผิดปกติ",
    urgency: "urgent",
    location: "ห้องธุรการและสารบรรณ",
    reporter_name: "สมศรี พูนสุข",
    reporter_contact: "081-234-5678 (ต่อ 102)",
    status: "in_progress",
    repair_type: "internal",
    technician_name: "ทีมช่างไอทีและคอมพิวเตอร์",
    vendor_name: "",
    expected_date: new Date(Date.now() + 86400000 * 1).toISOString().slice(0, 10),
    repair_cost: 450,
    parts_used: "ซิลิโคนระบายความร้อน CPU, สเปรย์ทำความสะอาดแผงวงจร",
    technician_note: "ตรวจพบ RAM หลวมและมีฝุ่นสะสม กำลังทำความสะอาดและทดสอบ Boot เครื่อง",
    before_image_url: "",
    after_image_url: "",
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
    status: "waiting_parts",
    repair_type: "external",
    technician_name: "ช่างเทคนิคพัสดุกลาง",
    vendor_name: "ศูนย์บริการ Epson Authorized Service",
    expected_date: new Date(Date.now() + 86400000 * 4).toISOString().slice(0, 10),
    repair_cost: 3200,
    parts_used: "ชุดหลอดภาพโปรเจกเตอร์แท้ ELPLP97 และพัดลมระบายความร้อน",
    technician_note: "ส่งตรวจเช็คที่ศูนย์บริการ รอเบิกอะไหล่หลอดภาพใหม่",
    before_image_url: "",
    after_image_url: "",
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
    repair_type: "internal",
    technician_name: "ทีมช่างไฟฟ้าและอาคาร",
    vendor_name: "",
    expected_date: new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10),
    repair_cost: 350,
    parts_used: "ชุดรางเลื่อนลูกปืน 16 นิ้ว 1 คู่",
    technician_note: "เปลี่ยนรางเลื่อนลิ้นชักใหม่และขันน็อตยึดแน่นเรียบร้อย ใช้งานได้ปกติ",
    before_image_url: "",
    after_image_url: "",
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    completed_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
];

const REPAIR_TYPE_LABELS = {
  internal: "ซ่อมเองภายใน",
  warranty: "ส่งเคลมประกัน",
  external: "ส่งร้านซ่อมภายนอก",
};

// Calculate SLA duration & overdue status for a ticket
function getSlaInfo(ticket) {
  const now = Date.now();
  const createdMs = ticket.created_at ? new Date(ticket.created_at).getTime() : now;

  if (ticket.status === "completed") {
    const completedMs = ticket.completed_at ? new Date(ticket.completed_at).getTime() : now;
    const days = Math.max(1, Math.round((completedMs - createdMs) / 86400000));
    return {
      type: "completed",
      isOverdue: false,
      days,
      label: `ซ่อมเสร็จใน ${days} วัน`,
    };
  }

  if (ticket.status === "cancelled" || ticket.status === "unrepairable") {
    return {
      type: "normal",
      isOverdue: false,
      days: 0,
      label: ticket.status === "unrepairable" ? "จำหน่าย/ซ่อมไม่ได้" : "ยกเลิกรายการ",
    };
  }

  // Active ticket: check expected_date for overdue
  if (ticket.expected_date) {
    const expEndMs = new Date(`${ticket.expected_date}T23:59:59`).getTime();
    if (!Number.isNaN(expEndMs) && now > expEndMs) {
      const overdueDays = Math.max(1, Math.ceil((now - expEndMs) / 86400000));
      return {
        type: "overdue",
        isOverdue: true,
        days: overdueDays,
        label: `เกินกำหนด ${overdueDays} วัน`,
      };
    }
  }

  const openDays = Math.max(1, Math.ceil((now - createdMs) / 86400000));
  return {
    type: "normal",
    isOverdue: false,
    days: openDays,
    label: `เปิดงาน ${openDays} วัน`,
  };
}

// Visual 4-Step Progress Timeline Component
function RepairStepTimeline({ status }) {
  const steps = [
    { key: "pending", label: "1. รับเรื่องแจ้งซ่อม" },
    { key: "in_progress", label: "2. กำลังดำเนินการซ่อม" },
    { key: "waiting_parts", label: "3. รออะไหล่ / ส่งศูนย์" },
    { key: "completed", label: "4. ซ่อมเสร็จสิ้น" },
  ];

  const getStepState = (stepKey) => {
    if (status === "completed") return "done";
    if (status === "cancelled" || status === "unrepairable") {
      return stepKey === "pending" ? "done" : "";
    }
    if (status === "pending") {
      return stepKey === "pending" ? "active" : "";
    }
    if (status === "in_progress") {
      if (stepKey === "pending") return "done";
      if (stepKey === "in_progress") return "active";
      return "";
    }
    if (status === "waiting_parts") {
      if (stepKey === "pending" || stepKey === "in_progress") return "done";
      if (stepKey === "waiting_parts") return "active";
      return "";
    }
    return "";
  };

  return (
    <div className="repair-step-timeline">
      {steps.map((st, idx) => {
        const state = getStepState(st.key);
        return (
          <div key={st.key} className={`repair-step-node ${state}`}>
            <div className="repair-step-circle">
              {state === "done" ? "✓" : idx + 1}
            </div>
            <div className="repair-step-label">{st.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function Maintenance() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [tickets, setTickets] = useState([]);
  const [assetsList, setAssetsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  // View Mode ("table" | "kanban")
  const [viewMode, setViewMode] = useState("table");

  // Filter States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [repairTypeFilter, setRepairTypeFilter] = useState("all");

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [logbookAssetCode, setLogbookAssetCode] = useState(null);

  // Inline QR Scanner inside Add Modal
  const [qrScanActive, setQrScanActive] = useState(false);
  const [qrScanMessage, setQrScanMessage] = useState(null);
  const qrScannerRef = useRef(null);

  // Form State: New Ticket
  const [formData, setFormData] = useState({
    asset_code: "",
    asset_name: "",
    problem: "",
    urgency: "normal",
    location: "",
    reporter_name: "",
    reporter_contact: "",
    repair_type: "internal",
    technician_name: "",
    before_image_url: "",
  });
  const [uploadingBeforeImg, setUploadingBeforeImg] = useState(false);

  // Form State: Update Ticket Status & Technician Info
  const [updateForm, setUpdateForm] = useState({
    status: "in_progress",
    repair_type: "internal",
    technician_name: "",
    vendor_name: "",
    expected_date: "",
    repair_cost: 0,
    parts_used: "",
    technician_note: "",
    after_image_url: "",
  });
  const [uploadingAfterImg, setUploadingAfterImg] = useState(false);

  // Load Tickets and Assets
  const loadData = async () => {
    setLoading(true);
    try {
      const [assetsData, ticketResult] = await Promise.all([
        listAssets().catch(() => []),
        fetchMaintenanceTickets(DEFAULT_TICKETS),
      ]);
      setAssetsList(assetsData || []);
      setTickets(ticketResult.tickets || []);
      setIsCloudSynced(ticketResult.isCloudSynced);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle QR Auto-Fill from URL query params (?asset_code=...&action=new)
  useEffect(() => {
    const paramCode = searchParams.get("asset_code");
    const paramName = searchParams.get("asset_name");
    const paramLoc = searchParams.get("location");
    const paramAction = searchParams.get("action");

    if (paramCode || paramAction === "new") {
      const decodedCode = paramCode ? decodeURIComponent(paramCode).trim() : "";
      const matched = assetsList.find(
        (a) => (a.asset_code || "").toLowerCase() === decodedCode.toLowerCase()
      );

      setFormData((prev) => ({
        ...prev,
        asset_code: matched?.asset_code || decodedCode,
        asset_name: matched?.name || (paramName ? decodeURIComponent(paramName) : prev.asset_name),
        location:
          matched?.rooms?.room_name ||
          (paramLoc ? decodeURIComponent(paramLoc) : prev.location),
      }));
      setShowAddModal(true);

      // Clear URL params after auto-filling so refreshing doesn't re-trigger
      if (assetsList.length > 0 || paramName) {
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, assetsList, setSearchParams]);

  // Stop QR camera when closing Add Modal
  const stopModalQrCamera = async () => {
    if (qrScannerRef.current) {
      try {
        if (qrScannerRef.current.isScanning) {
          await qrScannerRef.current.stop();
        }
      } catch {}
    }
    setQrScanActive(false);
  };

  const applyScannedAssetCode = (rawText) => {
    if (!rawText) return;
    stopModalQrCamera();

    let extractedCode = rawText.trim();
    try {
      if (extractedCode.startsWith("http://") || extractedCode.startsWith("https://")) {
        const url = new URL(extractedCode);
        const parts = url.pathname.split("/").filter(Boolean);
        extractedCode = decodeURIComponent(parts[parts.length - 1] || extractedCode);
      }
    } catch {}

    const matched = assetsList.find(
      (a) => (a.asset_code || "").toLowerCase() === extractedCode.toLowerCase()
    );

    if (matched) {
      setFormData((prev) => ({
        ...prev,
        asset_code: matched.asset_code,
        asset_name: matched.name || prev.asset_name,
        location: matched.rooms?.room_name || prev.location,
      }));
      setQrScanMessage(`ดึงข้อมูลครุภัณฑ์สำเร็จ: ${matched.asset_code} (${matched.name})`);
    } else {
      setFormData((prev) => ({
        ...prev,
        asset_code: extractedCode,
      }));
      setQrScanMessage(`สแกนรหัสสำเร็จ: ${extractedCode} (กรุณาระบุชื่อครุภัณฑ์เพิ่มเติมหากไม่อยู่ในทะเบียน)`);
    }
  };

  const startModalQrCamera = async () => {
    setQrScanMessage(null);
    setQrScanActive(true);
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode(QR_MODAL_SCANNER_ID);
        qrScannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 210, height: 210 } },
          (decoded) => applyScannedAssetCode(decoded),
          () => {}
        );
      } catch {
        setQrScanActive(false);
        setQrScanMessage("ไม่สามารถเปิดกล้องได้ กรุณาใช้ปุ่มอัปโหลดรูป QR Code แทน");
      }
    }, 150);
  };

  const handleQrFileScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQrScanMessage("กำลังอ่าน QR Code จากรูปภาพ...");
    try {
      const scanner = new Html5Qrcode("maintenance-qr-file-temp");
      const decoded = await scanner.scanFile(file, true);
      applyScannedAssetCode(decoded);
    } catch {
      setQrScanMessage("ไม่พบ QR Code ในรูปภาพที่เลือก");
    } finally {
      e.target.value = "";
    }
  };

  // Handle Before Photo Upload
  const handleBeforePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBeforeImg(true);
    try {
      const url = await uploadRepairPhoto(file, "before");
      if (url) {
        setFormData((prev) => ({ ...prev, before_image_url: url }));
      }
    } catch {
      alert("อัปโหลดรูปภาพไม่สำเร็จ");
    } finally {
      setUploadingBeforeImg(false);
      e.target.value = "";
    }
  };

  // Handle After Photo Upload
  const handleAfterPhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAfterImg(true);
    try {
      const url = await uploadRepairPhoto(file, "after");
      if (url) {
        setUpdateForm((prev) => ({ ...prev, after_image_url: url }));
      }
    } catch {
      alert("อัปโหลดรูปภาพไม่สำเร็จ");
    } finally {
      setUploadingAfterImg(false);
      e.target.value = "";
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

    if (formData.asset_code) {
      const matched = assetsList.find((a) => a.asset_code === formData.asset_code);
      if (matched) {
        resolvedAssetName = resolvedAssetName || matched.name;
        resolvedLocation = resolvedLocation || matched.rooms?.room_name || "";
        try {
          await updateAssetStatus(
            formData.asset_code,
            "repair",
            `แจ้งซ่อม (${repairNo}): ${formData.problem}`
          );
        } catch {}
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
      status: formData.technician_name.trim() ? "in_progress" : "pending",
      repair_type: formData.repair_type || "internal",
      technician_name: formData.technician_name.trim() || "",
      vendor_name: "",
      expected_date: null,
      repair_cost: 0,
      parts_used: "",
      technician_note: "",
      before_image_url: formData.before_image_url || "",
      after_image_url: "",
      created_at: new Date().toISOString(),
      completed_at: null,
    };

    const updated = [newTicket, ...tickets];
    setTickets(updated);
    await saveMaintenanceTicketToCloud(newTicket, updated);

    stopModalQrCamera();
    setShowAddModal(false);
    setQrScanMessage(null);
    setFormData({
      asset_code: "",
      asset_name: "",
      problem: "",
      urgency: "normal",
      location: "",
      reporter_name: "",
      reporter_contact: "",
      repair_type: "internal",
      technician_name: "",
      before_image_url: "",
    });
  };

  // Handle Open Update Status Modal
  const handleOpenUpdate = (ticket) => {
    setSelectedTicket(ticket);
    setUpdateForm({
      status: ticket.status || "in_progress",
      repair_type: ticket.repair_type || "internal",
      technician_name: ticket.technician_name || "",
      vendor_name: ticket.vendor_name || "",
      expected_date: ticket.expected_date || "",
      repair_cost: ticket.repair_cost || 0,
      parts_used: ticket.parts_used || "",
      technician_note: ticket.technician_note || "",
      after_image_url: ticket.after_image_url || "",
    });
    setShowUpdateModal(true);
  };

  // Handle Save Status Update
  const handleSaveUpdate = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;

    const isCompleted = updateForm.status === "completed";
    const isUnrepairable = updateForm.status === "unrepairable";

    const updatedTicket = {
      ...selectedTicket,
      status: updateForm.status,
      repair_type: updateForm.repair_type || "internal",
      technician_name: updateForm.technician_name.trim(),
      vendor_name: updateForm.vendor_name.trim(),
      expected_date: updateForm.expected_date || null,
      repair_cost: Number(updateForm.repair_cost) || 0,
      parts_used: updateForm.parts_used.trim(),
      technician_note: updateForm.technician_note.trim(),
      after_image_url: updateForm.after_image_url || "",
      completed_at: isCompleted ? new Date().toISOString() : selectedTicket.completed_at,
    };

    const updatedList = tickets.map((t) => (t.id === selectedTicket.id ? updatedTicket : t));
    setTickets(updatedList);
    await saveMaintenanceTicketToCloud(updatedTicket, updatedList);

    // Sync asset status in Supabase database
    if (selectedTicket.asset_code && selectedTicket.asset_code !== "-") {
      try {
        if (isCompleted) {
          await updateAssetStatus(
            selectedTicket.asset_code,
            "normal",
            `ซ่อมเสร็จสิ้น (${selectedTicket.repair_no}): ${updateForm.technician_note || "ใช้งานได้ปกติ"}`
          );
        } else if (isUnrepairable) {
          await updateAssetStatus(
            selectedTicket.asset_code,
            "damaged",
            `ซ่อมไม่ได้/ชำรุด (${selectedTicket.repair_no}): ${updateForm.technician_note}`
          );
        } else if (
          updateForm.status === "in_progress" ||
          updateForm.status === "waiting_parts"
        ) {
          await updateAssetStatus(
            selectedTicket.asset_code,
            "repair",
            `อยู่ระหว่างซ่อม (${selectedTicket.repair_no})`
          );
        }
      } catch {}
    }

    setShowUpdateModal(false);
    setSelectedTicket(null);
  };

  // Handle Open Printable Job Sheet
  const handleOpenPrint = (ticket) => {
    setSelectedTicket(ticket);
    setShowPrintModal(true);
  };

  // Handle Delete Ticket
  const handleDeleteTicket = async (ticket) => {
    if (!window.confirm(`ยืนยันการลบรายการแจ้งซ่อม ${ticket.repair_no}?`)) return;
    const filtered = tickets.filter((t) => t.id !== ticket.id);
    setTickets(filtered);
    await deleteMaintenanceTicketFromCloud(ticket.id, filtered);
  };

  // Count how many times each asset_code has been repaired & cumulative cost
  const assetRepairCountMap = {};
  const assetRepairCostMap = {};
  for (const t of tickets) {
    if (t.asset_code && t.asset_code !== "-") {
      assetRepairCountMap[t.asset_code] = (assetRepairCountMap[t.asset_code] || 0) + 1;
      assetRepairCostMap[t.asset_code] =
        (assetRepairCostMap[t.asset_code] || 0) + (Number(t.repair_cost) || 0);
    }
  }

  // Filtered Tickets
  const filteredTickets = tickets.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch =
      search === "" ||
      (t.repair_no || "").toLowerCase().includes(q) ||
      (t.asset_code || "").toLowerCase().includes(q) ||
      (t.asset_name || "").toLowerCase().includes(q) ||
      (t.problem || "").toLowerCase().includes(q) ||
      (t.reporter_name || "").toLowerCase().includes(q) ||
      (t.technician_name || "").toLowerCase().includes(q);

    const sla = getSlaInfo(t);
    const matchStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "overdue"
        ? sla.isOverdue
        : t.status === statusFilter;
    const matchUrgency = urgencyFilter === "all" || t.urgency === urgencyFilter;
    const matchRepairType =
      repairTypeFilter === "all" || (t.repair_type || "internal") === repairTypeFilter;

    return matchSearch && matchStatus && matchUrgency && matchRepairType;
  });

  // Export filtered tickets to Excel-compatible UTF-8 BOM CSV
  const handleExportCSV = () => {
    if (filteredTickets.length === 0) {
      alert("ไม่มีข้อมูลรายการแจ้งซ่อมสำหรับส่งออก");
      return;
    }

    const statusTextMap = {
      pending: "รอดำเนินการ",
      in_progress: "กำลังซ่อม",
      waiting_parts: "รออะไหล่/ส่งศูนย์",
      completed: "ซ่อมเสร็จสิ้น",
      unrepairable: "ซ่อมไม่ได้/จำหน่าย",
      cancelled: "ยกเลิก",
    };

    const urgencyTextMap = {
      normal: "ปกติ",
      urgent: "ด่วน",
      critical: "ด่วนที่สุด",
    };

    const headers = [
      "เลขที่แจ้งซ่อม",
      "วันที่แจ้ง",
      "กำหนดเสร็จ",
      "วันที่ซ่อมเสร็จ",
      "ระยะเวลา/SLA",
      "รหัสครุภัณฑ์",
      "ชื่อครุภัณฑ์",
      "สถานที่ตั้ง",
      "อาการชำรุด",
      "ความเร่งด่วน",
      "สถานะ",
      "รูปแบบการซ่อม",
      "ช่างผู้รับผิดชอบ",
      "ศูนย์บริการ/ร้านซ่อม",
      "อะไหล่ที่ใช้",
      "ค่าใช้จ่ายซ่อม (บาท)",
      "บันทึกผลการซ่อม",
      "ชื่อผู้แจ้ง",
      "เบอร์ติดต่อ",
    ];

    const escapeCsvCell = (val) => {
      const str = val == null ? "" : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = filteredTickets.map((t) => {
      const sla = getSlaInfo(t);
      return [
        t.repair_no || "",
        t.created_at ? new Date(t.created_at).toLocaleDateString("th-TH") : "",
        t.expected_date ? new Date(t.expected_date).toLocaleDateString("th-TH") : "-",
        t.completed_at ? new Date(t.completed_at).toLocaleDateString("th-TH") : "-",
        sla.label,
        t.asset_code || "-",
        t.asset_name || "",
        t.location || "",
        t.problem || "",
        urgencyTextMap[t.urgency] || "ปกติ",
        statusTextMap[t.status] || t.status,
        REPAIR_TYPE_LABELS[t.repair_type || "internal"] || "ซ่อมเองภายใน",
        t.technician_name || "-",
        t.vendor_name || "-",
        t.parts_used || "-",
        Number(t.repair_cost) || 0,
        t.technician_note || "-",
        t.reporter_name || "",
        t.reporter_contact || "-",
      ]
        .map(escapeCsvCell)
        .join(",");
    });

    const csvContent = "\uFEFF" + [headers.map(escapeCsvCell).join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `รายงานแจ้งซ่อม_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Calculate Summary Metrics
  const counts = {
    total: tickets.length,
    pending: tickets.filter((t) => t.status === "pending").length,
    in_progress: tickets.filter(
      (t) => t.status === "in_progress" || t.status === "waiting_parts"
    ).length,
    completed: tickets.filter((t) => t.status === "completed").length,
    overdue: tickets.filter((t) => getSlaInfo(t).isOverdue).length,
    totalCost: tickets.reduce((sum, t) => sum + (Number(t.repair_cost) || 0), 0),
  };

  return (
    <div className="maintenance-layout">
      {/* Hidden element for QR file scan */}
      <div id="maintenance-qr-file-temp" style={{ display: "none" }} />

      {/* Standalone Maintenance Topbar */}
      <header className="maintenance-topbar no-print">
        <div className="maintenance-topbar-inner">
          <div className="maintenance-brand">
            <div className="maintenance-brand-icon">
              <Wrench size={20} />
            </div>
            <div>
              <div className="maintenance-brand-title">ระบบแจ้งซ่อมและบำรุงรักษา</div>
              <div className="maintenance-brand-sub">
                Maintenance &amp; Helpdesk Service System
              </div>
            </div>
          </div>

          <div className="maintenance-topbar-actions">
            <Link
              to="/"
              className="btn btn-outline-white"
              style={{ fontSize: "0.82rem", padding: "6px 12px" }}
            >
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
      <div
        className="page-container no-print"
        style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 20px", width: "100%" }}
      >
        {/* 1. Header Row with Export CSV & View Mode Switcher */}
        <div
          className="page-heading-row"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          <div className="page-title-group">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 4,
              }}
            >
              <span
                style={{
                  backgroundColor: "#e0f2fe",
                  color: "#0284c7",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "6px",
                }}
              >
                SERVICE HELPDESK
              </span>
              <h1 style={{ margin: 0 }}>รายการแจ้งซ่อมและบำรุงรักษา</h1>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  padding: "3px 10px",
                  borderRadius: 999,
                  backgroundColor: isCloudSynced ? "#ecfdf5" : "#f1f5f9",
                  color: isCloudSynced ? "#059669" : "#475569",
                }}
              >
                <Cloud size={13} />
                {isCloudSynced ? "ซิงค์ฐานข้อมูล Supabase แล้ว" : "บันทึกอัตโนมัติ + ซิงค์สถานะครุภัณฑ์"}
              </span>
            </div>
            <p className="page-subtitle">
              ติดตามไทม์ไลน์สถานะ SLA สมุดประวัติการซ่อมรายเครื่อง กระดาน Kanban และส่งออกรายงาน Excel
            </p>
          </div>

          {/* Right Toolbar Actions: View Toggle + Export CSV */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div className="view-toggle-group">
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === "table" ? "active" : ""}`}
                onClick={() => setViewMode("table")}
              >
                <TableIcon size={15} />
                <span>มุมมองตาราง</span>
              </button>
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === "kanban" ? "active" : ""}`}
                onClick={() => setViewMode("kanban")}
              >
                <Columns size={15} />
                <span>กระดานสถานะ (Kanban)</span>
              </button>
            </div>

            <button
              type="button"
              className="btn btn-outline-white"
              onClick={handleExportCSV}
              style={{
                fontSize: "0.82rem",
                padding: "8px 14px",
                borderColor: "#cbd5e1",
                color: "#0f291e",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
              title="ดาวน์โหลดรายงานสรุปการซ่อมเป็นไฟล์ Excel (.CSV)"
            >
              <Download size={15} color="#059669" />
              <span>Export Excel (.CSV)</span>
            </button>
          </div>
        </div>

        {/* 2. Stat Summary Cards Grid (5 cards including Total Repair Cost) */}
        <div className="maintenance-kpi-grid">
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
            <div
              className="stat-box-icon"
              style={{ backgroundColor: "#fef3c7", color: "#d97706" }}
            >
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

          {/* In Progress / Waiting Parts */}
          <div className="stat-box">
            <div
              className="stat-box-icon"
              style={{ backgroundColor: "#e0f2fe", color: "#0284c7" }}
            >
              <Flame size={22} />
            </div>
            <div className="stat-box-body">
              <div className="stat-box-label">กำลังซ่อม / รออะไหล่</div>
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

          {/* Total Repair Cost */}
          <div className="stat-box">
            <div
              className="stat-box-icon"
              style={{ backgroundColor: "#f3e8ff", color: "#7c3aed" }}
            >
              <Banknote size={22} />
            </div>
            <div className="stat-box-body">
              <div className="stat-box-label">งบประมาณซ่อมสะสม</div>
              <div className="stat-box-val-row">
                <span className="stat-box-number" style={{ color: "#7c3aed", fontSize: "1.45rem" }}>
                  {counts.totalCost.toLocaleString()}
                </span>
                <span className="stat-box-unit">บาท</span>
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
              placeholder="ค้นหาเลขที่แจ้งซ่อม, รหัสครุภัณฑ์, อาการ, ผู้แจ้ง, ชื่อช่าง..."
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
            <option value="in_progress">กำลังดำเนินการซ่อม</option>
            <option value="waiting_parts">รออะไหล่ / ส่งศูนย์</option>
            <option value="overdue">⚠️ เกินกำหนดส่งคืน (Overdue)</option>
            <option value="completed">ซ่อมเสร็จสิ้นแล้ว</option>
            <option value="unrepairable">ซ่อมไม่ได้ / แทงจำหน่าย</option>
            <option value="cancelled">ยกเลิกคำขอ</option>
          </select>

          <select
            className="filter-select"
            value={repairTypeFilter}
            onChange={(e) => setRepairTypeFilter(e.target.value)}
          >
            <option value="all">ทุกรูปแบบการซ่อม</option>
            <option value="internal">ซ่อมเองภายใน</option>
            <option value="warranty">ส่งเคลมประกัน</option>
            <option value="external">ส่งร้านซ่อมภายนอก</option>
          </select>

          <select
            className="filter-select"
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
          >
            <option value="all">ทุกระดับความเร่งด่วน</option>
            <option value="normal">ปกติ (Normal)</option>
            <option value="urgent">ด่วน (Urgent)</option>
            <option value="critical">ด่วนที่สุด (Critical)</option>
          </select>
        </div>

        {/* 4A. Table View of Repair Tickets */}
        {viewMode === "table" ? (
          <div className="table-card">
            <div className="table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: "115px" }}>เลขที่แจ้ง</th>
                    <th style={{ minWidth: "195px" }}>ครุภัณฑ์ / สถานที่</th>
                    <th style={{ minWidth: "230px" }}>อาการเสีย &amp; บันทึกการซ่อม</th>
                    <th style={{ minWidth: "155px" }}>ช่าง / รูปแบบซ่อม</th>
                    <th style={{ minWidth: "110px" }}>ค่าซ่อม / อะไหล่</th>
                    <th style={{ minWidth: "120px" }}>ผู้แจ้ง</th>
                    <th style={{ minWidth: "135px" }}>สถานะ / SLA</th>
                    <th style={{ minWidth: "220px", textAlign: "right", whiteSpace: "nowrap" }}>
                      จัดการ
                    </th>
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
                          <span
                            className="status-pill status-damaged"
                            style={{ fontSize: "0.72rem", padding: "2px 7px" }}
                          >
                            ด่วนที่สุด
                          </span>
                        ) : t.urgency === "urgent" ? (
                          <span
                            className="status-pill status-repair"
                            style={{ fontSize: "0.72rem", padding: "2px 7px" }}
                          >
                            ด่วน
                          </span>
                        ) : (
                          <span
                            className="status-pill"
                            style={{
                              fontSize: "0.72rem",
                              padding: "2px 7px",
                              backgroundColor: "#f1f5f9",
                              color: "#475569",
                            }}
                          >
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
                        ) : t.status === "waiting_parts" ? (
                          <span
                            className="status-pill"
                            style={{ backgroundColor: "#eff6ff", color: "#1d4ed8" }}
                          >
                            <span className="status-dot" style={{ backgroundColor: "#2563eb" }} />
                            รออะไหล่/ส่งศูนย์
                          </span>
                        ) : t.status === "unrepairable" ? (
                          <span className="status-pill status-damaged">
                            <span className="status-dot" />
                            ซ่อมไม่ได้
                          </span>
                        ) : t.status === "cancelled" ? (
                          <span
                            className="status-pill"
                            style={{ backgroundColor: "#f1f5f9", color: "#64748b" }}
                          >
                            ยกเลิกแล้ว
                          </span>
                        ) : (
                          <span className="status-pill status-repair">
                            <span className="status-dot" />
                            รอดำเนินการ
                          </span>
                        );

                      const rType = t.repair_type || "internal";
                      const repeatCount = assetRepairCountMap[t.asset_code] || 0;
                      const cumulativeAssetCost = assetRepairCostMap[t.asset_code] || 0;
                      const isLemonWarning =
                        repeatCount >= 3 || cumulativeAssetCost >= 5000 || t.status === "unrepairable";
                      const sla = getSlaInfo(t);

                      return (
                        <tr key={t.id}>
                          {/* 1. Repair No + Urgency */}
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontFamily: "monospace",
                                  color: "#064e3b",
                                }}
                              >
                                {t.repair_no}
                              </span>
                              <div style={{ fontSize: "0.73rem", color: "#94a3b8" }}>
                                {new Date(t.created_at).toLocaleDateString("th-TH")}
                              </div>
                              <div>{urgencyBadge}</div>
                            </div>
                          </td>

                          {/* 2. Asset & Location + Clickable Repair Logbook */}
                          <td>
                            <div style={{ fontWeight: 700, color: "#0f291e" }}>{t.asset_name}</div>
                            {t.asset_code && t.asset_code !== "-" && (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 6,
                                  flexWrap: "wrap",
                                  marginTop: 3,
                                }}
                              >
                                <Link
                                  to={`/asset/${encodeURIComponent(t.asset_code)}`}
                                  style={{
                                    fontSize: "0.76rem",
                                    fontFamily: "monospace",
                                    color: "#059669",
                                    fontWeight: 600,
                                  }}
                                >
                                  {t.asset_code}
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => setLogbookAssetCode(t.asset_code)}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    fontSize: "0.69rem",
                                    backgroundColor: isLemonWarning ? "#fef2f2" : "#f1f5f9",
                                    color: isLemonWarning ? "#dc2626" : "#334155",
                                    border: `1px solid ${isLemonWarning ? "#fecaca" : "#e2e8f0"}`,
                                    padding: "2px 7px",
                                    borderRadius: 999,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    whiteSpace: "nowrap",
                                  }}
                                  title="คลิกเพื่อเปิดสมุดประวัติการซ่อมสะสมของครุภัณฑ์เครื่องนี้"
                                >
                                  <BookOpen size={11} />
                                  <span>
                                    {isLemonWarning
                                      ? `⚠️ ซ่อม ${repeatCount} ครั้ง`
                                      : `ประวัติซ่อม (${repeatCount})`}
                                  </span>
                                </button>
                              </div>
                            )}
                            <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: 3 }}>
                              📍 {t.location}
                            </div>
                          </td>

                          {/* 3. Problem + Technician Note + Before/After Photos */}
                          <td>
                            <div style={{ fontSize: "0.85rem", color: "#334155", lineHeight: 1.4 }}>
                              {t.problem}
                            </div>
                            {t.technician_note && (
                              <div
                                style={{
                                  marginTop: 5,
                                  fontSize: "0.76rem",
                                  color: "#0369a1",
                                  backgroundColor: "#f0f9ff",
                                  padding: "4px 8px",
                                  borderRadius: "6px",
                                  borderLeft: "3px solid #0284c7",
                                }}
                              >
                                <strong>บันทึกช่าง:</strong> {t.technician_note}
                              </div>
                            )}

                            {/* Photo Thumbnail Buttons */}
                            {(t.before_image_url || t.after_image_url) && (
                              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                                {t.before_image_url && (
                                  <button
                                    type="button"
                                    className="photo-thumb-pill"
                                    onClick={() =>
                                      setLightboxImage({
                                        url: t.before_image_url,
                                        title: `รูปก่อนซ่อม (${t.repair_no} - ${t.asset_name})`,
                                      })
                                    }
                                  >
                                    <ImageIcon size={12} color="#d97706" />
                                    <span>รูปก่อนซ่อม</span>
                                  </button>
                                )}
                                {t.after_image_url && (
                                  <button
                                    type="button"
                                    className="photo-thumb-pill"
                                    onClick={() =>
                                      setLightboxImage({
                                        url: t.after_image_url,
                                        title: `รูปหลังซ่อมเสร็จ (${t.repair_no} - ${t.asset_name})`,
                                      })
                                    }
                                  >
                                    <ImageIcon size={12} color="#059669" />
                                    <span>รูปหลังซ่อม</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* 4. Technician & Repair Type */}
                          <td>
                            <div style={{ marginBottom: 4 }}>
                              <span className={`repair-type-tag ${rType}`}>
                                {REPAIR_TYPE_LABELS[rType] || "ซ่อมเองภายใน"}
                              </span>
                            </div>
                            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#1e293b" }}>
                              {t.technician_name || (
                                <span style={{ color: "#94a3b8", fontWeight: 400 }}>ยังไม่ระบุช่าง</span>
                              )}
                            </div>
                            {t.vendor_name && (
                              <div style={{ fontSize: "0.73rem", color: "#64748b" }}>
                                ศูนย์/ร้าน: {t.vendor_name}
                              </div>
                            )}
                            {t.expected_date && t.status !== "completed" && (
                              <div style={{ fontSize: "0.72rem", color: "#0284c7", marginTop: 2 }}>
                                กำหนดเสร็จ: {new Date(t.expected_date).toLocaleDateString("th-TH")}
                              </div>
                            )}
                          </td>

                          {/* 5. Repair Cost & Parts */}
                          <td>
                            <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.86rem" }}>
                              {Number(t.repair_cost) > 0
                                ? `${Number(t.repair_cost).toLocaleString()} ฿`
                                : "-"}
                            </div>
                            {t.parts_used && (
                              <div
                                style={{
                                  fontSize: "0.73rem",
                                  color: "#64748b",
                                  maxWidth: 140,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                                title={t.parts_used}
                              >
                                อะไหล่: {t.parts_used}
                              </div>
                            )}
                          </td>

                          {/* 6. Reporter */}
                          <td>
                            <div style={{ fontSize: "0.84rem", fontWeight: 600, color: "#1e293b" }}>
                              {t.reporter_name}
                            </div>
                            <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                              {t.reporter_contact}
                            </div>
                          </td>

                          {/* 7. Status + SLA Duration / Overdue Badge */}
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-start" }}>
                              {statusBadge}
                              <span className={`sla-badge ${sla.type}`}>
                                <Timer size={11} />
                                <span>{sla.label}</span>
                              </span>
                            </div>
                          </td>

                          {/* 8. Actions (Single line guaranteed) */}
                          <td style={{ whiteSpace: "nowrap" }}>
                            <div
                              className="table-actions"
                              style={{ justifyContent: "flex-end", gap: 6, flexWrap: "nowrap" }}
                            >
                              <button
                                type="button"
                                className="action-btn-link"
                                onClick={() => handleOpenPrint(t)}
                                title="ดูและพิมพ์ใบแจ้งซ่อม"
                                style={{
                                  backgroundColor: "#f8fafc",
                                  color: "#334155",
                                  border: "1px solid #e2e8f0",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 5,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                <Printer size={13} />
                                <span>ใบงาน</span>
                              </button>
                              <button
                                type="button"
                                className="action-btn-link"
                                onClick={() => handleOpenUpdate(t)}
                                title="อัปเดตสถานะ / บันทึกช่าง / ค่าซ่อม"
                                style={{ whiteSpace: "nowrap" }}
                              >
                                อัปเดตงาน
                              </button>
                              <button
                                type="button"
                                className="action-btn-link danger"
                                onClick={() => handleDeleteTicket(t)}
                                title="ลบคำขอแจ้งซ่อม"
                                style={{ whiteSpace: "nowrap" }}
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
        ) : (
          /* 4B. Kanban Board View (4 Status Columns) */
          <div className="kanban-board-grid">
            {[
              {
                key: "pending",
                title: "รอดำเนินการ (Pending)",
                dotColor: "#d97706",
                bgHeader: "#fffbeb",
                items: filteredTickets.filter((t) => t.status === "pending"),
              },
              {
                key: "in_progress",
                title: "กำลังดำเนินการซ่อม",
                dotColor: "#0284c7",
                bgHeader: "#f0f9ff",
                items: filteredTickets.filter((t) => t.status === "in_progress"),
              },
              {
                key: "waiting_parts",
                title: "รออะไหล่ / ส่งศูนย์",
                dotColor: "#2563eb",
                bgHeader: "#eff6ff",
                items: filteredTickets.filter((t) => t.status === "waiting_parts"),
              },
              {
                key: "completed",
                title: "ซ่อมเสร็จสิ้น / ปิดงาน",
                dotColor: "#10b981",
                bgHeader: "#ecfdf5",
                items: filteredTickets.filter(
                  (t) =>
                    t.status === "completed" ||
                    t.status === "unrepairable" ||
                    t.status === "cancelled"
                ),
              },
            ].map((col) => (
              <div key={col.key} className="kanban-column">
                <div
                  className="kanban-column-header"
                  style={{ backgroundColor: col.bgHeader }}
                >
                  <div className="kanban-column-title">
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        backgroundColor: col.dotColor,
                        display: "inline-block",
                      }}
                    />
                    <span>{col.title}</span>
                  </div>
                  <span className="kanban-column-count">{col.items.length}</span>
                </div>

                <div className="kanban-card-list">
                  {col.items.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "28px 12px",
                        color: "#94a3b8",
                        fontSize: "0.8rem",
                      }}
                    >
                      ไม่มีรายการในสถานะนี้
                    </div>
                  ) : (
                    col.items.map((t) => {
                      const sla = getSlaInfo(t);
                      const repeatCount = assetRepairCountMap[t.asset_code] || 0;
                      return (
                        <div key={t.id} className="kanban-card">
                          <div className="kanban-card-top">
                            <span className="kanban-card-no">{t.repair_no}</span>
                            <span className={`sla-badge ${sla.type}`}>
                              <Timer size={11} />
                              <span>{sla.label}</span>
                            </span>
                          </div>

                          <div className="kanban-card-asset">{t.asset_name}</div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                              flexWrap: "wrap",
                              marginBottom: 6,
                            }}
                          >
                            {t.asset_code && t.asset_code !== "-" && (
                              <>
                                <span
                                  style={{
                                    fontSize: "0.73rem",
                                    fontFamily: "monospace",
                                    color: "#059669",
                                    fontWeight: 700,
                                  }}
                                >
                                  {t.asset_code}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setLogbookAssetCode(t.asset_code)}
                                  style={{
                                    fontSize: "0.68rem",
                                    padding: "1px 6px",
                                    borderRadius: 999,
                                    border: "1px solid #cbd5e1",
                                    backgroundColor: "#f8fafc",
                                    color: "#334155",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                  }}
                                >
                                  ประวัติซ่อม ({repeatCount})
                                </button>
                              </>
                            )}
                          </div>

                          <div className="kanban-card-problem">{t.problem}</div>

                          <div
                            style={{
                              fontSize: "0.74rem",
                              color: "#475569",
                              marginTop: 6,
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span>👷 {t.technician_name || "ยังไม่ระบุช่าง"}</span>
                            {Number(t.repair_cost) > 0 && (
                              <strong style={{ color: "#7c3aed" }}>
                                {Number(t.repair_cost).toLocaleString()} ฿
                              </strong>
                            )}
                          </div>

                          <div className="kanban-card-footer">
                            <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                              📍 {t.location}
                            </span>
                            <div style={{ display: "flex", gap: 5, flexWrap: "nowrap" }}>
                              <button
                                type="button"
                                className="action-btn-link"
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "0.74rem",
                                  backgroundColor: "#f8fafc",
                                  border: "1px solid #e2e8f0",
                                  color: "#334155",
                                  whiteSpace: "nowrap",
                                }}
                                onClick={() => handleOpenPrint(t)}
                              >
                                ใบงาน
                              </button>
                              <button
                                type="button"
                                className="action-btn-link"
                                style={{
                                  padding: "4px 8px",
                                  fontSize: "0.74rem",
                                  whiteSpace: "nowrap",
                                }}
                                onClick={() => handleOpenUpdate(t)}
                              >
                                อัปเดตงาน
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* MODAL 1: New Repair Ticket (with QR Auto-Fill & Before Photo)         */}
      {/* ===================================================================== */}
      {showAddModal && (
        <div
          className="modal-overlay no-print"
          onClick={() => {
            stopModalQrCamera();
            setShowAddModal(false);
          }}
        >
          <div
            className="modal-content"
            style={{ maxWidth: "660px", maxHeight: "92vh", overflowY: "auto" }}
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
                <div>
                  <h3 className="modal-title" style={{ margin: 0 }}>
                    เปิดใบแจ้งซ่อมใหม่ (Submit Repair Ticket)
                  </h3>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    สแกน QR Code เพื่อดึงข้อมูลครุภัณฑ์อัตโนมัติ หรือเลือกจากรายการ
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="action-btn-link"
                onClick={() => {
                  stopModalQrCamera();
                  setShowAddModal(false);
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick QR Code Auto-Fill Bar */}
            <div
              style={{
                backgroundColor: "#f0f9ff",
                border: "1px solid #bae6fd",
                borderRadius: 12,
                padding: "12px 14px",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <QrCode size={18} color="#0284c7" />
                  <span style={{ fontSize: "0.84rem", fontWeight: 700, color: "#0369a1" }}>
                    แจ้งซ่อมด่วนด้วย QR Code บนตัวครุภัณฑ์
                  </span>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  {!qrScanActive ? (
                    <button
                      type="button"
                      className="btn btn-outline-white"
                      style={{ fontSize: "0.78rem", padding: "5px 10px" }}
                      onClick={startModalQrCamera}
                    >
                      <Camera size={14} />
                      <span>สแกนด้วยกล้อง</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: "0.78rem", padding: "5px 10px" }}
                      onClick={stopModalQrCamera}
                    >
                      <CameraOff size={14} />
                      <span>ปิดกล้อง</span>
                    </button>
                  )}

                  <label
                    className="btn btn-outline-white"
                    style={{ fontSize: "0.78rem", padding: "5px 10px", cursor: "pointer" }}
                  >
                    <Upload size={14} />
                    <span>อัปโหลดรูป QR</span>
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleQrFileScan}
                    />
                  </label>
                </div>
              </div>

              {qrScanActive && (
                <div
                  id={QR_MODAL_SCANNER_ID}
                  style={{
                    width: "100%",
                    maxWidth: 280,
                    margin: "12px auto 4px",
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                />
              )}

              {qrScanMessage && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: "0.78rem",
                    color: "#047857",
                    backgroundColor: "#ecfdf5",
                    padding: "6px 10px",
                    borderRadius: 6,
                    fontWeight: 600,
                  }}
                >
                  {qrScanMessage}
                </div>
              )}
            </div>

            <form onSubmit={handleAddSubmit}>
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>เลือกครุภัณฑ์ในระบบ (ดึงชื่อและห้องอัตโนมัติ)</label>
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
                    <option value="normal">ปกติ (Normal)</option>
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

              {/* Before Repair Photo Upload */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>แนบรูปถ่ายอาการชำรุด (Before Photo)</label>
                <div className="photo-upload-box">
                  {formData.before_image_url ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "center" }}>
                      <img
                        src={formData.before_image_url}
                        alt="Before repair"
                        style={{
                          width: 90,
                          height: 70,
                          objectFit: "cover",
                          borderRadius: 8,
                          border: "1px solid #cbd5e1",
                        }}
                      />
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#059669" }}>
                          แนบรูปภาพอาการเสียแล้ว
                        </div>
                        <button
                          type="button"
                          className="action-btn-link danger"
                          style={{ marginTop: 4, fontSize: "0.75rem" }}
                          onClick={() => setFormData((prev) => ({ ...prev, before_image_url: "" }))}
                        >
                          ลบรูปภาพ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label style={{ cursor: "pointer", display: "block" }}>
                      <div style={{ color: "#0284c7", fontWeight: 600, fontSize: "0.84rem" }}>
                        {uploadingBeforeImg
                          ? "กำลังประมวลผลรูปภาพ..."
                          : "📷 คลิกเพื่อเลือกรูปถ่ายอาการเสีย หรือถ่ายภาพจากมือถือ"}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 2 }}>
                        ช่วยให้ช่างประเมินอาการและเตรียมอะไหล่ได้แม่นยำขึ้น
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleBeforePhotoChange}
                        disabled={uploadingBeforeImg}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="form-grid" style={{ marginBottom: 14 }}>
                <div className="form-group">
                  <label>สถานที่ตั้ง / ห้องประจำ</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น ห้องธุรการ ชั้น 1"
                    value={formData.location}
                    onChange={(e) => setFormData((f) => ({ ...f, location: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>มอบหมายทีมช่างเบื้องต้น (หากทราบ)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น ทีมช่างไอที, ช่างอาคาร"
                    value={formData.technician_name}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, technician_name: e.target.value }))
                    }
                  />
                </div>
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
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, reporter_contact: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    stopModalQrCamera();
                    setShowAddModal(false);
                  }}
                >
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary" disabled={uploadingBeforeImg}>
                  <Check size={16} />
                  <span>ยืนยันส่งใบแจ้งซ่อม</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: Update Ticket (Technician, Repair Type, Cost, After Photo)   */}
      {/* ===================================================================== */}
      {showUpdateModal && selectedTicket && (
        <div className="modal-overlay no-print" onClick={() => setShowUpdateModal(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: "640px", maxHeight: "92vh", overflowY: "auto" }}
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
                    บันทึกการซ่อม มอบหมายช่าง และค่าใช้จ่าย
                  </h3>
                  <div style={{ fontSize: "0.8rem", color: "#52796f" }}>
                    {selectedTicket.repair_no} — {selectedTicket.asset_name} ({selectedTicket.asset_code})
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

            {/* Visual 4-Step Status Progress Timeline */}
            <RepairStepTimeline status={updateForm.status} />

            <form onSubmit={handleSaveUpdate}>
              {/* Row 1: Status & Repair Type */}
              <div className="form-grid" style={{ marginBottom: 14 }}>
                <div className="form-group">
                  <label>สถานะงานซ่อม</label>
                  <select
                    className="form-control"
                    value={updateForm.status}
                    onChange={(e) =>
                      setUpdateForm((prev) => ({ ...prev, status: e.target.value }))
                    }
                  >
                    <option value="pending">รอดำเนินการ (Pending)</option>
                    <option value="in_progress">กำลังดำเนินการซ่อม (In Progress)</option>
                    <option value="waiting_parts">รออะไหล่ / ส่งเคลมศูนย์</option>
                    <option value="completed">ซ่อมเสร็จสิ้นแล้ว (คืนสถานะปกติ)</option>
                    <option value="unrepairable">ซ่อมไม่ได้ / ชำรุดรอจำหน่าย</option>
                    <option value="cancelled">ยกเลิกคำขอ (Cancelled)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>รูปแบบการดำเนินการซ่อม</label>
                  <select
                    className="form-control"
                    value={updateForm.repair_type}
                    onChange={(e) =>
                      setUpdateForm((prev) => ({ ...prev, repair_type: e.target.value }))
                    }
                  >
                    <option value="internal">ซ่อมเองภายในหน่วยงาน</option>
                    <option value="warranty">ส่งเคลมประกันศูนย์</option>
                    <option value="external">ส่งร้านซ่อมภายนอก</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Technician Assignment */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>ช่างผู้รับผิดชอบ / ทีมช่างดำเนินการ</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="ระบุชื่อช่างผู้รับผิดชอบ หรือเลือกด่วนด้านล่าง"
                  value={updateForm.technician_name}
                  onChange={(e) =>
                    setUpdateForm((prev) => ({ ...prev, technician_name: e.target.value }))
                  }
                />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {QUICK_TECHNICIANS.map((tech) => (
                    <button
                      key={tech}
                      type="button"
                      onClick={() =>
                        setUpdateForm((prev) => ({ ...prev, technician_name: tech }))
                      }
                      style={{
                        fontSize: "0.73rem",
                        padding: "3px 9px",
                        borderRadius: 999,
                        border: "1px solid #cbd5e1",
                        backgroundColor:
                          updateForm.technician_name === tech ? "#059669" : "#f8fafc",
                        color: updateForm.technician_name === tech ? "#ffffff" : "#475569",
                        cursor: "pointer",
                      }}
                    >
                      + {tech}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: External Vendor & Expected Date */}
              <div className="form-grid" style={{ marginBottom: 14 }}>
                <div className="form-group">
                  <label>ชื่อศูนย์บริการ / ร้านซ่อมภายนอก (ถ้ามี)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น ศูนย์บริการ Dell, ร้านไอทีเซอร์วิส"
                    value={updateForm.vendor_name}
                    onChange={(e) =>
                      setUpdateForm((prev) => ({ ...prev, vendor_name: e.target.value }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>วันที่คาดว่าจะซ่อมเสร็จ / ได้รับคืน</label>
                  <input
                    type="date"
                    className="form-control"
                    value={updateForm.expected_date}
                    onChange={(e) =>
                      setUpdateForm((prev) => ({ ...prev, expected_date: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* Row 4: Repair Cost & Parts Used */}
              <div className="form-grid" style={{ marginBottom: 14 }}>
                <div className="form-group">
                  <label>ค่าใช้จ่ายในการซ่อม / ค่าอะไหล่ (บาท)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="form-control"
                    placeholder="0"
                    value={updateForm.repair_cost}
                    onChange={(e) =>
                      setUpdateForm((prev) => ({ ...prev, repair_cost: e.target.value }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>รายการอะไหล่ที่เปลี่ยน / อุปกรณ์ที่ใช้</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น เปลี่ยน SSD 512GB, เปลี่ยนสายไฟ"
                    value={updateForm.parts_used}
                    onChange={(e) =>
                      setUpdateForm((prev) => ({ ...prev, parts_used: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* Row 5: Technician Note */}
              <div className="form-group" style={{ marginBottom: 14 }}>
                <label>บันทึกผลการซ่อม / รายละเอียดการแก้ไขของช่าง</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="เช่น ตรวจเช็คแล้ว อะไหล่ชำรุด เปลี่ยนอะไหล่ใหม่ ทดสอบการใช้งานแล้วปกติ..."
                  value={updateForm.technician_note}
                  onChange={(e) =>
                    setUpdateForm((prev) => ({ ...prev, technician_note: e.target.value }))
                  }
                />
              </div>

              {/* Row 6: After Repair Photo Upload */}
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label>แนบรูปถ่ายหลังซ่อมเสร็จ / หลักฐานการซ่อม (After Photo)</label>
                <div className="photo-upload-box">
                  {updateForm.after_image_url ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 14, justifyContent: "center" }}>
                      <img
                        src={updateForm.after_image_url}
                        alt="After repair"
                        style={{
                          width: 90,
                          height: 70,
                          objectFit: "cover",
                          borderRadius: 8,
                          border: "1px solid #cbd5e1",
                        }}
                      />
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#059669" }}>
                          แนบรูปภาพหลังซ่อมเสร็จเรียบร้อย
                        </div>
                        <button
                          type="button"
                          className="action-btn-link danger"
                          style={{ marginTop: 4, fontSize: "0.75rem" }}
                          onClick={() =>
                            setUpdateForm((prev) => ({ ...prev, after_image_url: "" }))
                          }
                        >
                          ลบรูปภาพ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label style={{ cursor: "pointer", display: "block" }}>
                      <div style={{ color: "#059669", fontWeight: 600, fontSize: "0.84rem" }}>
                        {uploadingAfterImg
                          ? "กำลังประมวลผลรูปภาพ..."
                          : "📸 คลิกเพื่ออัปโหลดรูปหลังซ่อมเสร็จ หรือใบเสร็จค่าซ่อม"}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={handleAfterPhotoChange}
                        disabled={uploadingAfterImg}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowUpdateModal(false)}
                >
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary" disabled={uploadingAfterImg}>
                  <Check size={16} />
                  <span>บันทึกการอัปเดตงานซ่อม</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: Printable Job Sheet (ใบแจ้งซ่อม / ใบส่งซ่อมราชการ)          */}
      {/* ===================================================================== */}
      {showPrintModal && selectedTicket && (
        <div className="modal-overlay" onClick={() => setShowPrintModal(false)}>
          <div
            className="modal-content printable-job-sheet-modal"
            style={{ maxWidth: "740px", maxHeight: "94vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Action Bar (Hidden when printing) */}
            <div className="modal-header no-print">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Printer size={20} color="#0284c7" />
                <h3 className="modal-title" style={{ margin: 0 }}>
                  ใบแจ้งซ่อมและบันทึกผลการบำรุงรักษา ({selectedTicket.repair_no})
                </h3>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => window.print()}
                  style={{ backgroundColor: "#0284c7" }}
                >
                  <Printer size={16} />
                  <span>พิมพ์ใบงาน / บันทึก PDF</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowPrintModal(false)}
                >
                  ปิด
                </button>
              </div>
            </div>

            {/* Official Printable Paper Area */}
            <div className="job-sheet-paper">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  borderBottom: "2px solid #0f172a",
                  paddingBottom: 14,
                  marginBottom: 18,
                }}
              >
                <div>
                  <h2 style={{ margin: "0 0 4px", fontSize: "1.25rem", fontWeight: 800 }}>
                    ใบแจ้งซ่อมและบันทึกประวัติการบำรุงรักษาครุภัณฑ์
                  </h2>
                  <div style={{ fontSize: "0.84rem", color: "#475569" }}>
                    ระบบบริหารจัดการครุภัณฑ์และงานซ่อมบำรุง (Maintenance Job Sheet)
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontSize: "1rem",
                      fontWeight: 800,
                      fontFamily: "monospace",
                      color: "#0284c7",
                    }}
                  >
                    เลขที่: {selectedTicket.repair_no}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#475569" }}>
                    วันที่แจ้ง: {new Date(selectedTicket.created_at).toLocaleDateString("th-TH")}
                  </div>
                </div>
              </div>

              {/* Visual Progress Timeline inside Job Sheet */}
              <RepairStepTimeline status={selectedTicket.status} />

              {/* Section 1: Asset & Reporter Info */}
              <div
                style={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "14px 16px",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    marginBottom: 10,
                    color: "#0f172a",
                    borderBottom: "1px solid #e2e8f0",
                    paddingBottom: 6,
                  }}
                >
                  1. ข้อมูลครุภัณฑ์และผู้แจ้งซ่อม
                </div>
                <div className="job-sheet-grid">
                  <div>
                    <strong>รหัสครุภัณฑ์:</strong> {selectedTicket.asset_code}
                  </div>
                  <div>
                    <strong>ชื่อรายการ:</strong> {selectedTicket.asset_name}
                  </div>
                  <div>
                    <strong>สถานที่ตั้ง / ห้อง:</strong> {selectedTicket.location}
                  </div>
                  <div>
                    <strong>ระดับความเร่งด่วน:</strong>{" "}
                    {selectedTicket.urgency === "critical"
                      ? "ด่วนที่สุด"
                      : selectedTicket.urgency === "urgent"
                      ? "ด่วน"
                      : "ปกติ"}
                  </div>
                  <div>
                    <strong>ชื่อผู้แจ้งซ่อม:</strong> {selectedTicket.reporter_name}
                  </div>
                  <div>
                    <strong>เบอร์ติดต่อ:</strong> {selectedTicket.reporter_contact}
                  </div>
                </div>
              </div>

              {/* Section 2: Problem Details */}
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "14px 16px",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    marginBottom: 8,
                    color: "#0f172a",
                  }}
                >
                  2. อาการชำรุด / ปัญหาที่พบ
                </div>
                <div style={{ fontSize: "0.88rem", lineHeight: 1.5, color: "#1e293b" }}>
                  {selectedTicket.problem}
                </div>
              </div>

              {/* Section 3: Technician & Cost Info */}
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "14px 16px",
                  marginBottom: 16,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    marginBottom: 10,
                    color: "#0f172a",
                    borderBottom: "1px solid #e2e8f0",
                    paddingBottom: 6,
                  }}
                >
                  3. การดำเนินการของช่างและค่าใช้จ่าย
                </div>
                <div className="job-sheet-grid" style={{ marginBottom: 10 }}>
                  <div>
                    <strong>รูปแบบการซ่อม:</strong>{" "}
                    {REPAIR_TYPE_LABELS[selectedTicket.repair_type || "internal"]}
                  </div>
                  <div>
                    <strong>ช่างผู้รับผิดชอบ:</strong>{" "}
                    {selectedTicket.technician_name || "...................................................."}
                  </div>
                  <div>
                    <strong>ศูนย์บริการ/ร้านซ่อม:</strong> {selectedTicket.vendor_name || "-"}
                  </div>
                  <div>
                    <strong>ค่าใช้จ่ายในการซ่อม:</strong>{" "}
                    {Number(selectedTicket.repair_cost) > 0
                      ? `${Number(selectedTicket.repair_cost).toLocaleString()} บาท`
                      : "0 บาท"}
                  </div>
                </div>
                <div style={{ fontSize: "0.86rem", marginBottom: 6 }}>
                  <strong>อะไหล่ที่เปลี่ยน:</strong> {selectedTicket.parts_used || "-"}
                </div>
                <div style={{ fontSize: "0.86rem" }}>
                  <strong>บันทึกผลการซ่อม:</strong>{" "}
                  {selectedTicket.technician_note ||
                    "...................................................................................................................."}
                </div>
              </div>

              {/* Section 4: Before / After Photos if present */}
              {(selectedTicket.before_image_url || selectedTicket.after_image_url) && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                    marginBottom: 16,
                  }}
                >
                  {selectedTicket.before_image_url && (
                    <div
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        padding: 10,
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, marginBottom: 6 }}>
                        รูปถ่ายก่อนซ่อม (Before)
                      </div>
                      <img
                        src={selectedTicket.before_image_url}
                        alt="Before"
                        style={{ maxHeight: 150, maxWidth: "100%", objectFit: "contain" }}
                      />
                    </div>
                  )}
                  {selectedTicket.after_image_url && (
                    <div
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        padding: 10,
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: "0.78rem", fontWeight: 700, marginBottom: 6 }}>
                        รูปถ่ายหลังซ่อมเสร็จ (After)
                      </div>
                      <img
                        src={selectedTicket.after_image_url}
                        alt="After"
                        style={{ maxHeight: 150, maxWidth: "100%", objectFit: "contain" }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Section 5: Signatures */}
              <div className="job-sheet-sign-grid">
                <div>
                  <div style={{ marginBottom: 28 }}>ลงชื่อ ....................................................</div>
                  <div style={{ fontWeight: 600 }}>({selectedTicket.reporter_name})</div>
                  <div style={{ color: "#64748b", fontSize: "0.76rem" }}>ผู้แจ้งซ่อม</div>
                </div>
                <div>
                  <div style={{ marginBottom: 28 }}>ลงชื่อ ....................................................</div>
                  <div style={{ fontWeight: 600 }}>
                    ({selectedTicket.technician_name || "............................................"})
                  </div>
                  <div style={{ color: "#64748b", fontSize: "0.76rem" }}>ช่างผู้ดำเนินการซ่อม</div>
                </div>
                <div>
                  <div style={{ marginBottom: 28 }}>ลงชื่อ ....................................................</div>
                  <div style={{ fontWeight: 600 }}>(....................................................)</div>
                  <div style={{ color: "#64748b", fontSize: "0.76rem" }}>ผู้ตรวจรับงาน / อนุมัติ</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: Photo Lightbox Preview                                       */}
      {/* ===================================================================== */}
      {lightboxImage && (
        <div
          className="modal-overlay no-print"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="modal-content"
            style={{ maxWidth: 680, textAlign: "center", padding: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ marginBottom: 12 }}>
              <h3 className="modal-title" style={{ margin: 0, fontSize: "0.98rem" }}>
                {lightboxImage.title}
              </h3>
              <button
                type="button"
                className="action-btn-link"
                onClick={() => setLightboxImage(null)}
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={lightboxImage.url}
              alt={lightboxImage.title}
              style={{
                maxWidth: "100%",
                maxHeight: "72vh",
                borderRadius: 10,
                objectFit: "contain",
                border: "1px solid #e2e8f0",
              }}
            />
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 5: สมุดประวัติการซ่อมประจำครุภัณฑ์ (Asset Repair Logbook)       */}
      {/* ===================================================================== */}
      {logbookAssetCode && (() => {
        const assetTickets = tickets.filter((t) => t.asset_code === logbookAssetCode);
        const matchedAsset = assetsList.find((a) => a.asset_code === logbookAssetCode);
        const assetName =
          matchedAsset?.name || assetTickets[0]?.asset_name || "ครุภัณฑ์ในระบบ";
        const assetLocation =
          matchedAsset?.rooms?.room_name || assetTickets[0]?.location || "ไม่ระบุสถานที่";
        const totalRepairs = assetTickets.length;
        const totalAssetCost = assetTickets.reduce(
          (sum, t) => sum + (Number(t.repair_cost) || 0),
          0
        );
        const hasUnrepairable = assetTickets.some((t) => t.status === "unrepairable");
        const isLemonAsset = totalRepairs >= 3 || totalAssetCost >= 5000 || hasUnrepairable;

        return (
          <div
            className="modal-overlay no-print"
            onClick={() => setLogbookAssetCode(null)}
          >
            <div
              className="modal-content"
              style={{ maxWidth: 680, maxHeight: "92vh", overflowY: "auto" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      backgroundColor: isLemonAsset ? "#fef2f2" : "#e0f2fe",
                      color: isLemonAsset ? "#dc2626" : "#0284c7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h3 className="modal-title" style={{ margin: 0 }}>
                      สมุดประวัติการซ่อมประจำครุภัณฑ์ (Asset Repair Logbook)
                    </h3>
                    <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
                      รหัส:{" "}
                      <strong style={{ fontFamily: "monospace", color: "#059669" }}>
                        {logbookAssetCode}
                      </strong>{" "}
                      — {assetName} ({assetLocation})
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="action-btn-link"
                  onClick={() => setLogbookAssetCode(null)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Summary KPI Boxes for this Asset */}
              <div className="logbook-summary-grid">
                <div className="logbook-stat-box">
                  <div className="logbook-stat-label">จำนวนครั้งที่ส่งซ่อมสะสม</div>
                  <div
                    className="logbook-stat-val"
                    style={{ color: totalRepairs >= 3 ? "#dc2626" : "#0f172a" }}
                  >
                    {totalRepairs} ครั้ง
                  </div>
                </div>
                <div className="logbook-stat-box">
                  <div className="logbook-stat-label">ค่าใช้จ่ายซ่อมสะสมรวม</div>
                  <div
                    className="logbook-stat-val"
                    style={{ color: totalAssetCost >= 5000 ? "#dc2626" : "#7c3aed" }}
                  >
                    {totalAssetCost.toLocaleString()} บาท
                  </div>
                </div>
                <div className="logbook-stat-box">
                  <div className="logbook-stat-label">การประเมินความคุ้มค่า</div>
                  <div
                    className="logbook-stat-val"
                    style={{
                      fontSize: "0.95rem",
                      color: isLemonAsset ? "#dc2626" : "#059669",
                      marginTop: 6,
                    }}
                  >
                    {isLemonAsset ? "⚠️ ซ่อมบ่อย / ค่าซ่อมสูง" : "✅ อยู่ในเกณฑ์ปกติ"}
                  </div>
                </div>
              </div>

              {/* Replacement / Lemon Alert Banner */}
              {isLemonAsset && (
                <div className="lemon-alert-banner">
                  <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 2 }}>
                      แจ้งเตือนวิเคราะห์ความคุ้มค่า: ครุภัณฑ์รายการนี้อาจไม่คุ้มค่าในการซ่อมบำรุงต่อ
                    </div>
                    <div style={{ fontSize: "0.78rem", lineHeight: 1.45 }}>
                      เนื่องจากมีประวัติส่งซ่อมสะสม {totalRepairs} ครั้ง หรือมีค่าใช้จ่ายซ่อมสะสมรวม{" "}
                      {totalAssetCost.toLocaleString()} บาท ขอแนะนำให้เจ้าหน้าที่พัสดุพิจารณา{" "}
                      <strong>ตั้งงบประมาณจัดซื้อทดแทน หรือดำเนินการแทงจำหน่าย</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Chronological Ticket History for this Asset */}
              <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 10, color: "#0f291e" }}>
                รายการประวัติการซ่อมทั้งหมด ({assetTickets.length} รายการ)
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {assetTickets.map((item) => {
                  const sla = getSlaInfo(item);
                  return (
                    <div
                      key={item.id}
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: 10,
                        padding: "12px 14px",
                        backgroundColor: "#f8fafc",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 8,
                          marginBottom: 6,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontWeight: 800,
                              color: "#0284c7",
                              fontSize: "0.86rem",
                            }}
                          >
                            {item.repair_no}
                          </span>
                          <span style={{ fontSize: "0.76rem", color: "#64748b" }}>
                            วันที่แจ้ง: {new Date(item.created_at).toLocaleDateString("th-TH")}
                          </span>
                          <span className={`sla-badge ${sla.type}`}>{sla.label}</span>
                        </div>
                        <div style={{ fontWeight: 700, color: "#7c3aed", fontSize: "0.84rem" }}>
                          {Number(item.repair_cost) > 0
                            ? `${Number(item.repair_cost).toLocaleString()} บาท`
                            : "ไม่มีค่าใช้จ่าย"}
                        </div>
                      </div>

                      <div style={{ fontSize: "0.84rem", color: "#1e293b", marginBottom: 4 }}>
                        <strong>อาการเสีย:</strong> {item.problem}
                      </div>

                      {item.parts_used && (
                        <div style={{ fontSize: "0.78rem", color: "#475569", marginBottom: 2 }}>
                          <strong>อะไหล่ที่เปลี่ยน:</strong> {item.parts_used}
                        </div>
                      )}

                      {item.technician_note && (
                        <div style={{ fontSize: "0.78rem", color: "#0369a1" }}>
                          <strong>บันทึกช่าง ({item.technician_name || "ช่าง"}):</strong>{" "}
                          {item.technician_note}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="form-actions" style={{ marginTop: 18 }}>
                <Link
                  to={`/asset/${encodeURIComponent(logbookAssetCode)}`}
                  className="btn btn-outline-white"
                  style={{ borderColor: "#cbd5e1", color: "#0f291e" }}
                >
                  ดูข้อมูลทะเบียนครุภัณฑ์นี้
                </Link>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setLogbookAssetCode(null)}
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
