import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { useAuth, ROLE_LABELS } from "../lib/AuthContext";
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
  Users,
  ShieldCheck,
  LogOut,
} from "lucide-react";

const QR_MODAL_SCANNER_ID = "maintenance-qr-reader";

const QUICK_TECHNICIANS = [
  "ทีมช่างไอทีและคอมพิวเตอร์",
  "ทีมช่างไฟฟ้าและอาคาร",
  "ช่างเทคนิคพัสดุกลาง",
];

// Helper to create clean SVG illustration data URLs for mock Before/After photos
function createMockPhotoSvg(title, subtitle, bgColor, accentColor) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
    <rect width="640" height="420" rx="16" fill="${bgColor}"/>
    <rect x="24" y="24" width="592" height="372" rx="12" fill="#ffffff" stroke="${accentColor}" stroke-width="3" stroke-dasharray="8 6"/>
    <circle cx="320" cy="155" r="52" fill="${bgColor}" stroke="${accentColor}" stroke-width="3"/>
    <text x="320" y="168" font-family="sans-serif" font-size="36" text-anchor="middle" fill="${accentColor}">📷</text>
    <text x="320" y="255" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle" fill="#0f172a">${title}</text>
    <text x="320" y="292" font-family="sans-serif" font-size="16" text-anchor="middle" fill="#475569">${subtitle}</text>
    <text x="320" y="345" font-family="monospace" font-size="13" text-anchor="middle" fill="${accentColor}">Asset Management &amp; Maintenance System</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Comprehensive Mock Data covering 12 realistic scenarios
const DEFAULT_TICKETS = [
  // --- กลุ่มที่ 1: ครุภัณฑ์ซ่อมซ้ำซาก 3 ครั้ง + งบสะสมเกิน 5,000 บาท (A-2569-1001) ---
  {
    id: "mock-9",
    repair_no: "RP-2569-009",
    asset_code: "A-2569-1001",
    asset_name: "คอมพิวเตอร์ All-in-One Dell OptiPlex",
    problem: "เปิดเครื่องแล้วจอไม่ติด มีเสียง Beep Code 3 ครั้ง คาดว่าภาคจ่ายไฟเมนบอร์ดช็อต (เสียครั้งที่ 3)",
    urgency: "critical",
    location: "ห้องธุรการและสารบรรณ (ชั้น 1)",
    reporter_name: "สมศรี พูนสุข",
    reporter_contact: "081-234-5678 (ต่อ 102)",
    status: "in_progress",
    repair_type: "internal",
    technician_name: "ทีมช่างไอทีและคอมพิวเตอร์",
    vendor_name: "",
    expected_date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10), // Overdue 2 days!
    repair_cost: 2500,
    parts_used: "ชุด IC ภาคจ่ายไฟ Mainboard และ RAM DDR4 8GB",
    technician_note: "ตรวจพบคาปาซิเตอร์บวมและชิปจ่ายไฟช็อต กำลังรออะไหล่เปลี่ยนและทดสอบความเสถียร",
    before_image_url: createMockPhotoSvg(
      "รูปก่อนซ่อม: RP-2569-009",
      "เมนบอร์ดช็อต มีเสียงเตือน Beep 3 ครั้ง (A-2569-1001)",
      "#fef2f2",
      "#dc2626"
    ),
    after_image_url: "",
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    completed_at: null,
  },
  {
    id: "mock-5",
    repair_no: "RP-2569-005",
    asset_code: "A-2569-1001",
    asset_name: "คอมพิวเตอร์ All-in-One Dell OptiPlex",
    problem: "เครื่องดับเองขณะใช้งานและมีกลิ่นไหม้จากหม้อแปลง Power Supply ด้านหลัง",
    urgency: "urgent",
    location: "ห้องธุรการและสารบรรณ (ชั้น 1)",
    reporter_name: "สมศรี พูนสุข",
    reporter_contact: "081-234-5678 (ต่อ 102)",
    status: "completed",
    repair_type: "external",
    technician_name: "ทีมช่างไอทีและคอมพิวเตอร์",
    vendor_name: "ร้านไอที เซอร์วิส เซ็นเตอร์",
    expected_date: new Date(Date.now() - 86400000 * 14).toISOString().slice(0, 10),
    repair_cost: 2400,
    parts_used: "อะแดปเตอร์และชุด Power Supply แท้ Dell 180W",
    technician_note: "เปลี่ยนชุดจ่ายไฟใหม่ ทดสอบเปิดใช้งานต่อเนื่อง 6 ชม. ผ่านเรียบร้อย",
    before_image_url: "",
    after_image_url: createMockPhotoSvg(
      "รูปหลังซ่อมเสร็จ: RP-2569-005",
      "เปลี่ยนชุด Power Supply 180W เรียบร้อย (A-2569-1001)",
      "#ecfdf5",
      "#059669"
    ),
    created_at: new Date(Date.now() - 86400000 * 18).toISOString(),
    completed_at: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
  {
    id: "mock-1",
    repair_no: "RP-2569-001",
    asset_code: "A-2569-1001",
    asset_name: "คอมพิวเตอร์ All-in-One Dell OptiPlex",
    problem: "พัดลมระบายความร้อน CPU หมุนเสียงดังมากและเครื่องค้างเมื่อเปิดโปรแกรมพร้อมกัน",
    urgency: "normal",
    location: "ห้องธุรการและสารบรรณ (ชั้น 1)",
    reporter_name: "สมศรี พูนสุข",
    reporter_contact: "081-234-5678 (ต่อ 102)",
    status: "completed",
    repair_type: "internal",
    technician_name: "ทีมช่างไอทีและคอมพิวเตอร์",
    vendor_name: "",
    expected_date: new Date(Date.now() - 86400000 * 32).toISOString().slice(0, 10),
    repair_cost: 850,
    parts_used: "พัดลม Cooling Fan + ซิลิโคนระบายความร้อน Arctic MX-4",
    technician_note: "เปลี่ยนพัดลมระบายความร้อนและทาซิลิโคนใหม่ อุณหภูมิลดลงปกติ",
    before_image_url: "",
    after_image_url: "",
    created_at: new Date(Date.now() - 86400000 * 35).toISOString(),
    completed_at: new Date(Date.now() - 86400000 * 33).toISOString(),
  },

  // --- กลุ่มที่ 2: ครุภัณฑ์ซ่อม 2 ครั้ง แต่งบสะสมทะลุ 6,300 บาท (A-2569-1003) ---
  {
    id: "mock-6",
    repair_no: "RP-2569-006",
    asset_code: "A-2569-1003",
    asset_name: "เครื่องโปรเจกเตอร์ 4K Epson",
    problem: "หลอดภาพกระพริบและขึ้นไฟแดงแจ้งเตือน Lamp Replace หลังเปิดใช้งานได้ 10 นาที",
    urgency: "critical",
    location: "ห้องประชุมใหญ่ (ชั้น 2)",
    reporter_name: "วิชัย เกียรติสกุล",
    reporter_contact: "089-876-5432 (ต่อ 201)",
    status: "waiting_parts",
    repair_type: "external",
    technician_name: "ช่างเทคนิคพัสดุกลาง",
    vendor_name: "ศูนย์บริการ Epson Authorized Service",
    expected_date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
    repair_cost: 4500,
    parts_used: "ชุดหลอดภาพโปรเจกเตอร์แท้ ELPLP97 และฟิลเตอร์กรองฝุ่น",
    technician_note: "ส่งเครื่องเข้าศูนย์ Epson รอเบิกอะไหล่หลอดภาพแท้ประมาณ 3 วันทำการ",
    before_image_url: createMockPhotoSvg(
      "รูปก่อนซ่อม: RP-2569-006",
      "ไฟแจ้งเตือน Lamp Replace บนตัวเครื่องโปรเจกเตอร์ Epson",
      "#fffbeb",
      "#d97706"
    ),
    after_image_url: "",
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    completed_at: null,
  },
  {
    id: "mock-2",
    repair_no: "RP-2569-002",
    asset_code: "A-2569-1003",
    asset_name: "เครื่องโปรเจกเตอร์ 4K Epson",
    problem: "ภาพฉายขึ้นจอมีจุดดำและสีเพี้ยนออกโทนเหลือง พัดลมท้ายเครื่องไม่หมุน",
    urgency: "urgent",
    location: "ห้องประชุมใหญ่ (ชั้น 2)",
    reporter_name: "วิชัย เกียรติสกุล",
    reporter_contact: "089-876-5432 (ต่อ 201)",
    status: "completed",
    repair_type: "external",
    technician_name: "ช่างเทคนิคพัสดุกลาง",
    vendor_name: "ศูนย์บริการ Epson Authorized Service",
    expected_date: new Date(Date.now() - 86400000 * 22).toISOString().slice(0, 10),
    repair_cost: 1800,
    parts_used: "พัดลมระบายความร้อน Blower Fan และน้ำยาทำความสะอาดชุดปริซึม",
    technician_note: "ล้างชุดออปติคอลและเปลี่ยนพัดลมระบายความร้อนใหม่",
    before_image_url: "",
    after_image_url: "",
    created_at: new Date(Date.now() - 86400000 * 26).toISOString(),
    completed_at: new Date(Date.now() - 86400000 * 23).toISOString(),
  },

  // --- กลุ่มที่ 3: งานซ่อมล่าช้า Overdue 4 วัน + ส่งเคลมประกัน (A-2569-1005) ---
  {
    id: "mock-4",
    repair_no: "RP-2569-004",
    asset_code: "A-2569-1005",
    asset_name: "เครื่องปรับอากาศ Inverter Daikin 24,000 BTU",
    problem: "แอร์ไม่เย็น มีแต่ลมธรรมดาออกมา และมีน้ำหยดลงจากรางคอยล์เย็นจำนวนมาก",
    urgency: "critical",
    location: "ห้องเซิร์ฟเวอร์และอุปกรณ์เครือข่าย",
    reporter_name: "ธนกร วงศ์สวัสดิ์",
    reporter_contact: "086-555-9191 (ต่อ 305)",
    status: "waiting_parts",
    repair_type: "warranty",
    technician_name: "ทีมช่างไฟฟ้าและอาคาร",
    vendor_name: "บริษัท สยามไดกิ้นเซลส์ จำกัด (เคลมประกันศูนย์)",
    expected_date: new Date(Date.now() - 86400000 * 4).toISOString().slice(0, 10), // Overdue 4 days!
    repair_cost: 0,
    parts_used: "แผงวงจรควบคุม Inverter PCB (อยู่ในประกันศูนย์ 5 ปี)",
    technician_note: "ช่างศูนย์เข้าตรวจเช็คแล้ว รอเบิกแผง PCB จากคลังอะไหล่กลาง (ล่าช้ากว่ากำหนด 4 วัน)",
    before_image_url: createMockPhotoSvg(
      "รูปก่อนซ่อม: RP-2569-004",
      "รหัส Error กระพริบที่หน้ากากแอร์ห้อง Server",
      "#fef2f2",
      "#dc2626"
    ),
    after_image_url: "",
    created_at: new Date(Date.now() - 86400000 * 8).toISOString(),
    completed_at: null,
  },

  // --- กลุ่มที่ 4: ซ่อมไม่ได้ / ชำรุดรอแทงจำหน่าย (Unrepairable - A-2569-1008) ---
  {
    id: "mock-7",
    repair_no: "RP-2569-007",
    asset_code: "A-2569-1008",
    asset_name: "เครื่องสำรองไฟ UPS APC Smart-UPS 1500VA",
    problem: "แบตเตอรี่บวมดันฝาเครื่อง และแผงวงจร Inverter ไหม้มีกลิ่นเหม็น ไม่สามารถเก็บไฟได้",
    urgency: "urgent",
    location: "ห้องการเงินและบัญชี (ชั้น 1)",
    reporter_name: "กมลชนก เลิศล้ำ",
    reporter_contact: "082-991-4455 (ต่อ 108)",
    status: "unrepairable",
    repair_type: "external",
    technician_name: "ทีมช่างไฟฟ้าและอาคาร",
    vendor_name: "ศูนย์บริการชไนเดอร์ อิเล็คทริค (APC)",
    expected_date: new Date(Date.now() - 86400000 * 5).toISOString().slice(0, 10),
    repair_cost: 300,
    parts_used: "ค่าบริการเปิดเครื่องตรวจสอบทางเทคนิค",
    technician_note: "หม้อแปลงหลักและบอร์ด Inverter เสียหายหนัก ประเมินค่าซ่อม 8,900 บาท สูงเกิน 70% ของเครื่องใหม่ เสนอแทงจำหน่าย",
    before_image_url: createMockPhotoSvg(
      "รูปสภาพชำรุด: RP-2569-007",
      "แผงวงจร Inverter ไหม้และแบตเตอรี่เสื่อมสภาพ (ซ่อมไม่ได้)",
      "#fef2f2",
      "#b91c1c"
    ),
    after_image_url: "",
    created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    completed_at: null,
  },

  // --- กลุ่มที่ 5: รอดำเนินการ (Pending) เพิ่งเปิดใบงานใหม่ ---
  {
    id: "mock-10",
    repair_no: "RP-2569-010",
    asset_code: "A-2569-1004",
    asset_name: "เครื่องพิมพ์เลเซอร์สีมัลติฟังก์ชัน Brother",
    problem: "กระดาษติดบริเวณชุดทำความร้อน (Fuser Unit) และเวลาสั่งพิมพ์มีเส้นดำคาดกลางหน้ากระดาษ",
    urgency: "urgent",
    location: "ห้องงานทะเบียนและวัดผล",
    reporter_name: "ณัฐพงศ์ เจริญผล",
    reporter_contact: "084-112-3344 (ต่อ 204)",
    status: "pending",
    repair_type: "internal",
    technician_name: "",
    vendor_name: "",
    expected_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    repair_cost: 0,
    parts_used: "",
    technician_note: "",
    before_image_url: createMockPhotoSvg(
      "รูปก่อนซ่อม: RP-2569-010",
      "กระดาษติดในชุดลูกยางความร้อนและมีคราบหมึกเลอะ",
      "#f0f9ff",
      "#0284c7"
    ),
    after_image_url: "",
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    completed_at: null,
  },
  {
    id: "mock-11",
    repair_no: "RP-2569-011",
    asset_code: "A-2569-1009",
    asset_name: "เก้าอี้สำนักงานเพื่อสุขภาพ Ergonomic",
    problem: "โช้คไฮดรอลิกปรับระดับความสูงทรุดตัวลงเอง และล้อเลื่อนด้านหน้าแตก 1 ล้อ",
    urgency: "normal",
    location: "ห้องพักอาจารย์ / เจ้าหน้าที่",
    reporter_name: "ปวีณา สุขสวัสดิ์",
    reporter_contact: "ต่อ 114",
    status: "pending",
    repair_type: "internal",
    technician_name: "",
    vendor_name: "",
    expected_date: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
    repair_cost: 0,
    parts_used: "",
    technician_note: "",
    before_image_url: "",
    after_image_url: "",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    completed_at: null,
  },

  // --- กลุ่มที่ 6: กำลังซ่อม (In Progress) อยู่ในกรอบเวลา SLA ---
  {
    id: "mock-8",
    repair_no: "RP-2569-008",
    asset_code: "A-2569-1006",
    asset_name: "สวิตช์เครือข่าย Cisco Catalyst 24-Port PoE",
    problem: "พอร์ต LAN ช่องที่ 1–8 ไม่จ่ายไฟ PoE ให้กับจุดกระจายสัญญาณ Wi-Fi Access Point",
    urgency: "critical",
    location: "ตู้ Rack สื่อสาร ชั้น 3",
    reporter_name: "อภิชาติ สายชล",
    reporter_contact: "089-443-2211 (ฝ่ายไอที)",
    status: "in_progress",
    repair_type: "warranty",
    technician_name: "ทีมช่างไอทีและคอมพิวเตอร์",
    vendor_name: "ศูนย์บริการ Synnex (Cisco Warranty)",
    expected_date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    repair_cost: 0,
    parts_used: "ส่งเคลมเปลี่ยนโมดูลจ่ายไฟ PoE ภายใต้ประกัน",
    technician_note: "นำสวิตช์สำรองไปติดตั้งแทนชั่วคราวแล้ว อยู่ระหว่างรอรับเครื่องเคลมกลับ",
    before_image_url: "",
    after_image_url: "",
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    completed_at: null,
  },

  // --- กลุ่มที่ 7: ซ่อมเสร็จสิ้นแล้ว (Completed) พร้อมรูปก่อน-หลังซ่อม ---
  {
    id: "mock-3",
    repair_no: "RP-2569-003",
    asset_code: "A-2569-1002",
    asset_name: "โต๊ะทำงานผู้บริหารไม้สัก 180 ซม.",
    problem: "รางลิ้นชักด้านขวาหลุดและลูกปืนแตก ไม่สามารถเลื่อนเปิด-ปิดลิ้นชักเก็บเอกสารได้",
    urgency: "normal",
    location: "ห้องผู้อำนวยการ (ชั้น 2)",
    reporter_name: "สุดาพร มั่นคง",
    reporter_contact: "ต่อ 105",
    status: "completed",
    repair_type: "internal",
    technician_name: "ทีมช่างไฟฟ้าและอาคาร",
    vendor_name: "",
    expected_date: new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10),
    repair_cost: 350,
    parts_used: "ชุดรางเลื่อนลูกปืนรับน้ำหนัก 2 ชั้น ขนาด 16 นิ้ว 1 คู่",
    technician_note: "ถอดรางเดิมที่ชำรุดออก เปลี่ยนรางเลื่อนลูกปืนชุดใหม่และตั้งระดับลิ้นชักเรียบร้อย",
    before_image_url: createMockPhotoSvg(
      "รูปก่อนซ่อม: RP-2569-003",
      "รางลิ้นชักหลุดและลูกปืนแตก (A-2569-1002)",
      "#fffbeb",
      "#d97706"
    ),
    after_image_url: createMockPhotoSvg(
      "รูปหลังซ่อมเสร็จ: RP-2569-003",
      "เปลี่ยนรางลูกปืนใหม่ 16 นิ้ว ใช้งานได้ปกติ",
      "#ecfdf5",
      "#059669"
    ),
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    completed_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "mock-12",
    repair_no: "RP-2569-012",
    asset_code: "A-2569-1007",
    asset_name: "เครื่องสแกนเอกสารความเร็วสูง Fujitsu fi-8170",
    problem: "ดึงกระดาษซ้อนกันหลายแผ่นเวลาสแกนเอกสารจำนวนมาก ลูกยางฟีดกระดาษเสื่อมสภาพ",
    urgency: "normal",
    location: "ห้องสารบรรณกลาง",
    reporter_name: "มนัสนันท์ ใจดี",
    reporter_contact: "085-778-9900 (ต่อ 103)",
    status: "completed",
    repair_type: "internal",
    technician_name: "ช่างเทคนิคพัสดุกลาง",
    vendor_name: "",
    expected_date: new Date(Date.now() - 86400000 * 6).toISOString().slice(0, 10),
    repair_cost: 950,
    parts_used: "ชุดลูกยางดึงกระดาษ Pick Roller & Brake Roller แท้",
    technician_note: "เปลี่ยนชุดลูกยางดึงกระดาษและทำความสะอาดหัวอ่าน Optical Sensor ทดสอบสแกน 100 แผ่นผ่านปกติ",
    before_image_url: "",
    after_image_url: "",
    created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
    completed_at: new Date(Date.now() - 86400000 * 6).toISOString(),
  },

  // --- กลุ่มที่ 8: ยกเลิกคำขอ (Cancelled) ---
  {
    id: "mock-13",
    repair_no: "RP-2569-013",
    asset_code: "A-2569-1010",
    asset_name: "จอภาพไร้ขอบ LG UltraFine IPS 27 นิ้ว",
    problem: "หน้าจอขึ้น No Signal เข้าใจว่าจอภาพเสีย",
    urgency: "normal",
    location: "ห้องปฏิบัติการคอมพิวเตอร์ 1",
    reporter_name: "ชญานิศ รัตนโชติ",
    reporter_contact: "ต่อ 210",
    status: "cancelled",
    repair_type: "internal",
    technician_name: "ทีมช่างไอทีและคอมพิวเตอร์",
    vendor_name: "",
    expected_date: null,
    repair_cost: 0,
    parts_used: "-",
    technician_note: "ตรวจสอบเบื้องต้นพบว่าสาย HDMI ด้านหลังหลวม เสียบใหม่แล้วใช้งานได้ปกติ จึงขอยกเลิกใบแจ้งซ่อม",
    before_image_url: "",
    after_image_url: "",
    created_at: new Date(Date.now() - 86400000 * 4).toISOString(),
    completed_at: null,
  },
];

const REPAIR_TYPE_LABELS = {
  internal: "ซ่อมเองภายใน",
  warranty: "ส่งเคลมประกัน",
  external: "ส่งร้านซ่อมภายนอก",
};

const SLA_DAYS_MAP = {
  critical: 1,
  urgent: 3,
  normal: 7,
};

function getAutoSlaExpectedDate(urgency = "normal", baseMs = Date.now()) {
  const slaDays = SLA_DAYS_MAP[urgency] || 7;
  return new Date(baseMs + slaDays * 86400000).toISOString().slice(0, 10);
}

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
      type: "failed",
      isOverdue: false,
      days: 0,
      label: ticket.status === "unrepairable" ? "ไม่สำเร็จ (ซ่อมไม่ได้)" : "ไม่สำเร็จ (ยกเลิก)",
    };
  }

  // Active ticket: check expected_date (or auto-calculated SLA deadline by urgency) for overdue
  const effectiveExpectedDate =
    ticket.expected_date || getAutoSlaExpectedDate(ticket.urgency || "normal", createdMs);
  if (effectiveExpectedDate) {
    const expEndMs = new Date(`${effectiveExpectedDate}T23:59:59`).getTime();
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
  const navigate = useNavigate();
  const {
    user,
    userRole,
    usersList,
    isUsersCloudSynced,
    refreshUsersList,
    updateUserRoleAndStatus,
    deleteUserByEmail,
    signOut,
  } = useAuth();

  // 3-Role Permission Flags: "admin" | "technician" | "employee"
  const isAdmin = userRole === "admin";
  const isTech = userRole === "technician";
  const canUpdateTicket = isAdmin || isTech;
  const canDeleteTicket = isAdmin;
  const pendingUsersCount = (usersList || []).filter(
    (u) => u.approval_status === "pending"
  ).length;

  const [tickets, setTickets] = useState([]);
  const [assetsList, setAssetsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  // View Mode ("table" | "kanban") & Admin User Management Modal
  const [viewMode, setViewMode] = useState("table");
  const [showUserMgmtModal, setShowUserMgmtModal] = useState(false);

  // Filter, Sort & Pagination States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [repairTypeFilter, setRepairTypeFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({ key: "created_at", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, urgencyFilter, repairTypeFilter]);

  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "desc" ? "asc" : "desc" }
        : { key, direction: key === "asset_name" || key === "reporter_name" ? "asc" : "desc" }
    );
  };

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [logbookAssetCode, setLogbookAssetCode] = useState(null);
  const [expandedTicketIds, setExpandedTicketIds] = useState({});
  const [showAllCompletedKanban, setShowAllCompletedKanban] = useState(false);

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
    reporter_name: user?.user_metadata?.full_name || "",
    reporter_contact: "",
    repair_type: "internal",
    technician_name: "",
    before_image_url: "",
  });
  const [uploadingBeforeImg, setUploadingBeforeImg] = useState(false);

  useEffect(() => {
    const defaultName = user?.user_metadata?.full_name || "";
    if (defaultName) {
      setFormData((prev) =>
        prev.reporter_name ? prev : { ...prev, reporter_name: defaultName }
      );
    }
  }, [user]);

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
      expected_date: getAutoSlaExpectedDate(formData.urgency),
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
    const createdMs = ticket.created_at ? new Date(ticket.created_at).getTime() : Date.now();
    setSelectedTicket(ticket);
    setUpdateForm({
      status: ticket.status || "in_progress",
      repair_type: ticket.repair_type || "internal",
      technician_name: ticket.technician_name || "",
      vendor_name: ticket.vendor_name || "",
      expected_date:
        ticket.expected_date || getAutoSlaExpectedDate(ticket.urgency || "normal", createdMs),
      repair_cost: ticket.repair_cost || 0,
      parts_used: ticket.parts_used || "",
      technician_note: ticket.technician_note || "",
      after_image_url: ticket.after_image_url || "",
    });
    setShowUpdateModal(true);
  };

  // Handle Reporter Cancel Pending Ticket (Allowed ONLY when status === "pending")
  const handleReporterCancelTicket = async (ticket) => {
    if (ticket.status !== "pending") {
      alert("สามารถยกเลิกได้เฉพาะใบแจ้งซ่อมที่อยู่ในสถานะ 'รอดำเนินการ' เท่านั้น");
      return;
    }
    if (!window.confirm(`ยืนยันการยกเลิกคำขอแจ้งซ่อม ${ticket.repair_no}?`)) return;
    const updatedTicket = {
      ...ticket,
      status: "cancelled",
      technician_note: ticket.technician_note || "ผู้แจ้งซ่อมขอยกเลิกรายการ (ขณะรอดำเนินการ)",
    };
    const updatedList = tickets.map((t) => (t.id === ticket.id ? updatedTicket : t));
    setTickets(updatedList);
    await saveMaintenanceTicketToCloud(updatedTicket, updatedList);
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
        : statusFilter === "in_progress_group"
        ? t.status === "in_progress" || t.status === "waiting_parts"
        : statusFilter === "closed_other"
        ? t.status === "unrepairable" || t.status === "cancelled"
        : t.status === statusFilter;
    const matchUrgency = urgencyFilter === "all" || t.urgency === urgencyFilter;
    const matchRepairType =
      repairTypeFilter === "all" || (t.repair_type || "internal") === repairTypeFilter;

    return matchSearch && matchStatus && matchUrgency && matchRepairType;
  }).sort((a, b) => {
    const dir = sortConfig.direction === "asc" ? 1 : -1;
    switch (sortConfig.key) {
      case "created_at": {
        const tA = new Date(a.created_at || 0).getTime();
        const tB = new Date(b.created_at || 0).getTime();
        if (tA !== tB) return (tA - tB) * dir;
        return (a.repair_no || "").localeCompare(b.repair_no || "") * dir;
      }
      case "repair_cost": {
        const cA = Number(a.repair_cost) || 0;
        const cB = Number(b.repair_cost) || 0;
        return (cA - cB) * dir;
      }
      case "asset_name":
        return (a.asset_name || "").localeCompare(b.asset_name || "", "th") * dir;
      case "technician_name":
        return (a.technician_name || "zzz").localeCompare(b.technician_name || "zzz", "th") * dir;
      case "reporter_name":
        return (a.reporter_name || "").localeCompare(b.reporter_name || "", "th") * dir;
      case "status": {
        const slaA = getSlaInfo(a).isOverdue ? 10 : 0;
        const slaB = getSlaInfo(b).isOverdue ? 10 : 0;
        const order = {
          pending: 5,
          in_progress: 4,
          waiting_parts: 3,
          completed: 2,
          unrepairable: 1,
          cancelled: 0,
        };
        const valA = slaA + (order[a.status] ?? 0);
        const valB = slaB + (order[b.status] ?? 0);
        return (valA - valB) * dir;
      }
      default:
        return 0;
    }
  });

  // Pagination slice for Table View
  const totalItems = filteredTickets.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedTickets = filteredTickets.slice(startIndex, endIndex);

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

  // Calculate Summary Metrics & Non-Repetitive Analytical Insights
  const counts = {
    total: tickets.length,
    pending: tickets.filter((t) => t.status === "pending").length,
    in_progress: tickets.filter(
      (t) => t.status === "in_progress" || t.status === "waiting_parts"
    ).length,
    completed: tickets.filter((t) => t.status === "completed").length,
    closedOther: tickets.filter(
      (t) => t.status === "unrepairable" || t.status === "cancelled"
    ).length,
    overdue: tickets.filter((t) => getSlaInfo(t).isOverdue).length,
    criticalActive: tickets.filter(
      (t) =>
        t.urgency === "critical" &&
        t.status !== "completed" &&
        t.status !== "cancelled"
    ).length,
    totalCost: tickets.reduce((sum, t) => sum + (Number(t.repair_cost) || 0), 0),
    internalCount: tickets.filter((t) => (t.repair_type || "internal") === "internal").length,
    warrantyCount: tickets.filter((t) => t.repair_type === "warranty").length,
    externalCount: tickets.filter((t) => t.repair_type === "external").length,
    internalCost: tickets
      .filter((t) => (t.repair_type || "internal") === "internal")
      .reduce((s, t) => s + (Number(t.repair_cost) || 0), 0),
    warrantyCost: tickets
      .filter((t) => t.repair_type === "warranty")
      .reduce((s, t) => s + (Number(t.repair_cost) || 0), 0),
    externalCost: tickets
      .filter((t) => t.repair_type === "external")
      .reduce((s, t) => s + (Number(t.repair_cost) || 0), 0),
  };

  const paidTicketsCount = tickets.filter((t) => Number(t.repair_cost) > 0).length;
  const avgRepairCost =
    paidTicketsCount > 0 ? Math.round(counts.totalCost / paidTicketsCount) : 0;

  const completionRate =
    counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;
  const pendingPct = counts.total > 0 ? Math.round((counts.pending / counts.total) * 100) : 0;
  const activePct = counts.total > 0 ? Math.round((counts.in_progress / counts.total) * 100) : 0;
  const completedPct =
    counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;
  const closedOtherPct =
    counts.total > 0 ? Math.round((counts.closedOther / counts.total) * 100) : 0;

  const internalCostPct =
    counts.totalCost > 0 ? Math.round((counts.internalCost / counts.totalCost) * 100) : 0;
  const externalCostPct =
    counts.totalCost > 0 ? Math.round((counts.externalCost / counts.totalCost) * 100) : 0;

  // Average SLA resolution days for completed tickets
  const completedTicketsList = tickets.filter((t) => t.status === "completed");
  const avgRepairDays =
    completedTicketsList.length > 0
      ? (
          completedTicketsList.reduce((sum, t) => sum + getSlaInfo(t).days, 0) /
          completedTicketsList.length
        ).toFixed(1)
      : "0.0";

  // Identify unique assets that trigger the Lemon / Replacement alert, enriched with Full Name & Location
  const lemonAssetsDetails = Object.keys(assetRepairCountMap)
    .filter((code) => {
      const repCount = assetRepairCountMap[code] || 0;
      const repCost = assetRepairCostMap[code] || 0;
      const hasUnrep = tickets.some(
        (t) => t.asset_code === code && t.status === "unrepairable"
      );
      return repCount >= 3 || repCost >= 5000 || hasUnrep;
    })
    .map((code) => {
      const sampleTicket = tickets.find((t) => t.asset_code === code);
      const matchedAsset = assetsList.find((a) => a.asset_code === code);
      const fullName = matchedAsset?.name || sampleTicket?.asset_name || code;
      const room =
        matchedAsset?.rooms?.room_name || sampleTicket?.location || "";
      const repCount = assetRepairCountMap[code] || 0;
      const repCost = assetRepairCostMap[code] || 0;
      const hasUnrep = tickets.some(
        (t) => t.asset_code === code && t.status === "unrepairable"
      );
      const reasonTag = hasUnrep
        ? "ซ่อมไม่ได้"
        : repCount >= 3
        ? `ซ่อม ${repCount} ครั้ง`
        : `งบซ่อม ${repCost.toLocaleString()}฿`;

      return {
        code,
        fullName,
        room,
        reasonTag,
      };
    });

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
                Maintenance &amp; Repair Service System
              </div>
            </div>
          </div>

          <div className="maintenance-topbar-actions">
            {/* Active Logged-in Role Badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "5px 12px",
                borderRadius: 999,
                fontSize: "0.78rem",
                fontWeight: 700,
                backgroundColor: isAdmin
                  ? "#fef3c7"
                  : isTech
                  ? "#e0f2fe"
                  : "#f1f5f9",
                color: isAdmin ? "#92400e" : isTech ? "#075985" : "#334155",
                border: `1px solid ${
                  isAdmin ? "#fde68a" : isTech ? "#bae6fd" : "#cbd5e1"
                }`,
              }}
              title="สิทธิ์การใช้งานของบัญชีที่ล็อกอินอยู่ปัจจุบัน"
            >
              <ShieldCheck size={14} />
              <span>
                {user?.user_metadata?.full_name || "ผู้ใช้งาน"} ({ROLE_LABELS[userRole] || "พนักงาน"})
              </span>
            </div>

            {/* Admin Only: User Approval & Role Assignment Button */}
            {isAdmin && (
              <button
                type="button"
                className="btn btn-outline-white"
                style={{
                  fontSize: "0.82rem",
                  padding: "6px 12px",
                  position: "relative",
                  borderColor: pendingUsersCount > 0 ? "#f59e0b" : undefined,
                }}
                onClick={() => {
                  refreshUsersList?.();
                  setShowUserMgmtModal(true);
                }}
                title="อนุมัติผู้สมัครใหม่และกำหนดสิทธิ์ผู้ใช้งาน"
              >
                <Users size={15} />
                <span>จัดการผู้ใช้ / อนุมัติสิทธิ์</span>
                {pendingUsersCount > 0 && (
                  <span
                    style={{
                      marginLeft: 4,
                      backgroundColor: "#dc2626",
                      color: "#fff",
                      fontSize: "0.7rem",
                      fontWeight: 800,
                      padding: "1px 6px",
                      borderRadius: 999,
                    }}
                  >
                    รออนุมัติ {pendingUsersCount}
                  </span>
                )}
              </button>
            )}

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
              className="btn btn-outline-white"
              style={{ fontSize: "0.82rem", padding: "6px 12px" }}
              onClick={async () => {
                await signOut();
                navigate("/login");
              }}
              title="สลับบัญชีผู้ใช้งานเพื่อทดสอบสิทธิ์อื่น หรือออกจากระบบ"
            >
              <LogOut size={15} />
              <span>สลับบัญชี</span>
            </button>

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

        {/* 2. Maintenance Executive Overview (3 Non-Repetitive Analytical Panels - Refined) */}
        <div className="maint-overview-bento">
          {/* Panel 1: ภาพรวมสถานะงานซ่อม */}
          <div className="maint-bento-card">
            <div className="maint-bento-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  className="maint-bento-icon"
                  style={{ backgroundColor: "#ecfdf5", color: "#059669" }}
                >
                  <CheckCircle2 size={19} />
                </div>
                <div>
                  <div className="maint-bento-title">ภาพรวมสถานะงานซ่อม</div>
                  <div className="maint-bento-sub">สัดส่วนและสถานะใบแจ้งซ่อมปัจจุบัน</div>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    fontSize: "1.45rem",
                    fontWeight: 800,
                    color: "#0f172a",
                    lineHeight: 1,
                  }}
                >
                  {counts.total}
                </span>
                <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>
                  ใบงานทั้งหมด
                </div>
              </div>
            </div>

            {/* Modern Multi-Segment Progress Track */}
            <div className="maint-modern-progress-wrap">
              <div className="maint-modern-progress">
                {counts.completed > 0 && (
                  <div
                    className={`maint-modern-seg seg-completed ${
                      statusFilter === "completed"
                        ? "active"
                        : statusFilter !== "all"
                        ? "dimmed"
                        : ""
                    }`}
                    style={{ flex: counts.completed }}
                    onClick={() =>
                      setStatusFilter(statusFilter === "completed" ? "all" : "completed")
                    }
                    title={`เสร็จสิ้น: ${counts.completed} งาน`}
                  />
                )}
                {counts.in_progress > 0 && (
                  <div
                    className={`maint-modern-seg seg-progress ${
                      statusFilter === "in_progress_group"
                        ? "active"
                        : statusFilter !== "all"
                        ? "dimmed"
                        : ""
                    }`}
                    style={{ flex: counts.in_progress }}
                    onClick={() =>
                      setStatusFilter(
                        statusFilter === "in_progress_group" ? "all" : "in_progress_group"
                      )
                    }
                    title={`กำลังซ่อม: ${counts.in_progress} งาน`}
                  />
                )}
                {counts.pending > 0 && (
                  <div
                    className={`maint-modern-seg seg-pending ${
                      statusFilter === "pending"
                        ? "active"
                        : statusFilter !== "all"
                        ? "dimmed"
                        : ""
                    }`}
                    style={{ flex: counts.pending }}
                    onClick={() =>
                      setStatusFilter(statusFilter === "pending" ? "all" : "pending")
                    }
                    title={`รอรับเรื่อง: ${counts.pending} งาน`}
                  />
                )}
                {counts.closedOther > 0 && (
                  <div
                    className={`maint-modern-seg seg-failed ${
                      statusFilter === "closed_other"
                        ? "active"
                        : statusFilter !== "all"
                        ? "dimmed"
                        : ""
                    }`}
                    style={{ flex: counts.closedOther }}
                    onClick={() =>
                      setStatusFilter(
                        statusFilter === "closed_other" ? "all" : "closed_other"
                      )
                    }
                    title={`ไม่สำเร็จ: ${counts.closedOther} งาน`}
                  />
                )}
              </div>

              {statusFilter !== "all" && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    style={{
                      border: "none",
                      background: "#e2e8f0",
                      color: "#0f172a",
                      borderRadius: 999,
                      padding: "2px 9px",
                      fontSize: "0.69rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    แสดงทุกสถานะ ✕
                  </button>
                </div>
              )}
            </div>

            {/* 4-Column Interactive Status Breakdown Cards */}
            <div className="maint-status-grid">
              <button
                type="button"
                className={`maint-status-box completed ${
                  statusFilter === "completed" ? "active" : ""
                }`}
                onClick={() =>
                  setStatusFilter(statusFilter === "completed" ? "all" : "completed")
                }
              >
                <span className="maint-status-box-label">
                  <span className="dot" style={{ backgroundColor: "#10b981" }} />
                  เสร็จสิ้น
                </span>
                <div className="maint-status-box-num">
                  <strong>{counts.completed}</strong>
                  <span>งาน</span>
                </div>
              </button>

              <button
                type="button"
                className={`maint-status-box progress ${
                  statusFilter === "in_progress_group" ? "active" : ""
                }`}
                onClick={() =>
                  setStatusFilter(
                    statusFilter === "in_progress_group" ? "all" : "in_progress_group"
                  )
                }
              >
                <span className="maint-status-box-label">
                  <span className="dot" style={{ backgroundColor: "#0284c7" }} />
                  กำลังซ่อม
                </span>
                <div className="maint-status-box-num">
                  <strong>{counts.in_progress}</strong>
                  <span>งาน</span>
                </div>
              </button>

              <button
                type="button"
                className={`maint-status-box pending ${
                  statusFilter === "pending" ? "active" : ""
                }`}
                onClick={() =>
                  setStatusFilter(statusFilter === "pending" ? "all" : "pending")
                }
              >
                <span className="maint-status-box-label">
                  <span className="dot" style={{ backgroundColor: "#f59e0b" }} />
                  รอรับเรื่อง
                </span>
                <div className="maint-status-box-num">
                  <strong>{counts.pending}</strong>
                  <span>งาน</span>
                </div>
              </button>

              <button
                type="button"
                className={`maint-status-box failed ${
                  statusFilter === "closed_other" ? "active" : ""
                }`}
                onClick={() =>
                  setStatusFilter(
                    statusFilter === "closed_other" ? "all" : "closed_other"
                  )
                }
              >
                <span className="maint-status-box-label">
                  <span className="dot" style={{ backgroundColor: "#64748b" }} />
                  ไม่สำเร็จ
                </span>
                <div className="maint-status-box-num">
                  <strong>{counts.closedOther}</strong>
                  <span>งาน</span>
                </div>
              </button>
            </div>
          </div>

          {/* Panel 2: งบประมาณซ่อม & Mini Chart สัดส่วนค่าใช้จ่ายแต่ละช่องทาง */}
          <div className="maint-bento-card">
            <div className="maint-bento-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  className="maint-bento-icon"
                  style={{ backgroundColor: "#f3e8ff", color: "#7c3aed" }}
                >
                  <Banknote size={19} />
                </div>
                <div>
                  <div className="maint-bento-title" style={{ whiteSpace: "nowrap" }}>
                    งบและสัดส่วนค่าซ่อม
                  </div>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <span
                  style={{
                    fontSize: "1.45rem",
                    fontWeight: 800,
                    color: "#7c3aed",
                    lineHeight: 1,
                  }}
                >
                  {counts.totalCost.toLocaleString()}
                </span>
                <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 600 }}>
                  บาท (สะสมรวม)
                </div>
              </div>
            </div>

            {/* Mini Cost Distribution Bar (Fills middle area with meaningful cost ratio) */}
            <div className="maint-cost-mini-chart">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.71rem",
                  fontWeight: 700,
                  color: "#475569",
                  marginBottom: 4,
                }}
              >
                <span>ซ่อมเอง: {counts.internalCost.toLocaleString()} ฿ ({internalCostPct}%)</span>
                <span>ร้านนอก: {counts.externalCost.toLocaleString()} ฿ ({externalCostPct}%)</span>
              </div>
              <div className="dash-segmented-bar" style={{ height: 8 }}>
                <div
                  style={{
                    width: `${Math.max(counts.internalCost > 0 ? 10 : 0, internalCostPct)}%`,
                    backgroundColor: "#0284c7",
                  }}
                />
                <div
                  style={{
                    width: `${Math.max(counts.externalCost > 0 ? 10 : 0, externalCostPct)}%`,
                    backgroundColor: "#7c3aed",
                  }}
                />
              </div>
            </div>

            {/* 3 Clickable Channel Filter Buttons showing both Count & Cost */}
            <div className="maint-channel-grid">
              <button
                type="button"
                className={`maint-channel-box ${
                  repairTypeFilter === "internal" ? "active" : ""
                }`}
                onClick={() =>
                  setRepairTypeFilter(repairTypeFilter === "internal" ? "all" : "internal")
                }
              >
                <span className="maint-channel-label">ซ่อมเองภายใน</span>
                <strong className="maint-channel-val">{counts.internalCount} งาน</strong>
                <span style={{ fontSize: "0.69rem", color: "#0284c7", fontWeight: 700 }}>
                  {counts.internalCost.toLocaleString()} ฿
                </span>
              </button>

              <button
                type="button"
                className={`maint-channel-box ${
                  repairTypeFilter === "warranty" ? "active" : ""
                }`}
                onClick={() =>
                  setRepairTypeFilter(repairTypeFilter === "warranty" ? "all" : "warranty")
                }
              >
                <span className="maint-channel-label">เคลมประกันศูนย์</span>
                <strong className="maint-channel-val">{counts.warrantyCount} งาน</strong>
                <span style={{ fontSize: "0.69rem", color: "#059669", fontWeight: 700 }}>
                  {counts.warrantyCost > 0 ? `${counts.warrantyCost.toLocaleString()} ฿` : "ฟรีในประกัน"}
                </span>
              </button>

              <button
                type="button"
                className={`maint-channel-box ${
                  repairTypeFilter === "external" ? "active" : ""
                }`}
                onClick={() =>
                  setRepairTypeFilter(repairTypeFilter === "external" ? "all" : "external")
                }
              >
                <span className="maint-channel-label">ส่งร้านภายนอก</span>
                <strong className="maint-channel-val">{counts.externalCount} งาน</strong>
                <span style={{ fontSize: "0.69rem", color: "#7c3aed", fontWeight: 700 }}>
                  {counts.externalCost.toLocaleString()} ฿
                </span>
              </button>
            </div>
          </div>

          {/* Panel 3: แจ้งเตือนงานเร่งด่วน & ครุภัณฑ์ซ่อมไม่คุ้ม (Clickable SLA Buttons & Named Assets) */}
          <div className="maint-bento-card">
            <div className="maint-bento-header" style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  className="maint-bento-icon"
                  style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}
                >
                  <AlertTriangle size={19} />
                </div>
                <div>
                  <div className="maint-bento-title">เฝ้าระวัง SLA &amp; ความคุ้มค่า</div>
                  <div className="maint-bento-sub">กดปุ่มด้านล่างเพื่อกรองงานด่วนหรือดูประวัติ</div>
                </div>
              </div>
            </div>

            <div className="maint-alert-row-grid">
              <button
                type="button"
                className={`maint-alert-pill overdue ${
                  statusFilter === "overdue" ? "active" : ""
                }`}
                onClick={() =>
                  setStatusFilter(statusFilter === "overdue" ? "all" : "overdue")
                }
              >
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 800 }}>งานเกินกำหนด</div>
                  <div
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      marginTop: 2,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      textDecoration: "underline",
                    }}
                  >
                    <span>{statusFilter === "overdue" ? "กำลังกรองอยู่ ✓" : "กดเพื่อกรองดู ➔"}</span>
                  </div>
                </div>
                <span className="maint-alert-count">{counts.overdue}</span>
              </button>

              <button
                type="button"
                className={`maint-alert-pill critical ${
                  urgencyFilter === "critical" ? "active" : ""
                }`}
                onClick={() =>
                  setUrgencyFilter(urgencyFilter === "critical" ? "all" : "critical")
                }
              >
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 800 }}>ด่วนที่สุด</div>
                  <div
                    style={{
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      marginTop: 2,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      textDecoration: "underline",
                    }}
                  >
                    <span>
                      {urgencyFilter === "critical" ? "กำลังกรองอยู่ ✓" : "กดเพื่อกรองดู ➔"}
                    </span>
                  </div>
                </div>
                <span className="maint-alert-count">{counts.criticalActive}</span>
              </button>
            </div>

            {/* Lemon Assets Quick Access with Real Asset Name & Location */}
            <div className="maint-lemon-strip">
              <div
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  color: "#991b1b",
                  marginBottom: 5,
                }}
              >
                ครุภัณฑ์เข้าเกณฑ์ซ่อมไม่คุ้ม ({lemonAssetsDetails.length} เครื่อง):
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {lemonAssetsDetails.length === 0 ? (
                  <span style={{ fontSize: "0.72rem", color: "#059669", fontWeight: 600 }}>
                    ไม่มีเครื่องที่เข้าเกณฑ์เสี่ยง
                  </span>
                ) : (
                  lemonAssetsDetails.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      className="maint-lemon-item-btn"
                      onClick={() => setLogbookAssetCode(item.code)}
                      title={`${item.code} - ${item.fullName} (${item.room}) — คลิกเปิดสมุดประวัติการซ่อม`}
                    >
                      <div
                        style={{
                          minWidth: 0,
                          flex: 1,
                          textAlign: "left",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>
                          {item.fullName}
                        </span>{" "}
                        <span style={{ color: "#64748b", fontSize: "0.68rem" }}>
                          ({item.room})
                        </span>
                      </div>
                      <span className="maint-lemon-reason">{item.reasonTag} ➔</span>
                    </button>
                  ))
                )}
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
            <option value="overdue">เกินกำหนดส่งคืน (Overdue)</option>
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
              <table className="modern-table maint-compact-table">
                <thead>
                  <tr>
                    <th
                      className={`sortable-th ${sortConfig.key === "created_at" ? "sorted" : ""}`}
                      style={{ minWidth: "112px", whiteSpace: "nowrap" }}
                      onClick={() => handleSort("created_at")}
                      title="คลิกเพื่อเรียงตามวันที่แจ้ง / เลขที่ใบงาน"
                    >
                      <div className="sortable-th-inner">
                        <span>เลขที่แจ้ง / วันที่</span>
                        <span className="sort-indicator">
                          {sortConfig.key === "created_at"
                            ? sortConfig.direction === "desc"
                              ? "↓"
                              : "↑"
                            : "⇅"}
                        </span>
                      </div>
                    </th>
                    <th
                      className={`sortable-th ${sortConfig.key === "asset_name" ? "sorted" : ""}`}
                      style={{ minWidth: "170px", maxWidth: "215px" }}
                      onClick={() => handleSort("asset_name")}
                      title="คลิกเพื่อเรียงตามชื่อครุภัณฑ์"
                    >
                      <div className="sortable-th-inner">
                        <span>ครุภัณฑ์ / สถานที่</span>
                        <span className="sort-indicator">
                          {sortConfig.key === "asset_name"
                            ? sortConfig.direction === "desc"
                              ? "↓"
                              : "↑"
                            : "⇅"}
                        </span>
                      </div>
                    </th>
                    <th style={{ minWidth: "210px", maxWidth: "275px" }}>
                      อาการเสีย &amp; บันทึกการซ่อม
                    </th>
                    <th
                      className={`sortable-th ${
                        sortConfig.key === "technician_name" ? "sorted" : ""
                      }`}
                      style={{ minWidth: "135px" }}
                      onClick={() => handleSort("technician_name")}
                      title="คลิกเพื่อเรียงตามช่างผู้รับผิดชอบ"
                    >
                      <div className="sortable-th-inner">
                        <span>ช่าง / รูปแบบซ่อม</span>
                        <span className="sort-indicator">
                          {sortConfig.key === "technician_name"
                            ? sortConfig.direction === "desc"
                              ? "↓"
                              : "↑"
                            : "⇅"}
                        </span>
                      </div>
                    </th>
                    <th
                      className={`sortable-th ${sortConfig.key === "repair_cost" ? "sorted" : ""}`}
                      style={{ minWidth: "100px" }}
                      onClick={() => handleSort("repair_cost")}
                      title="คลิกเพื่อเรียงตามค่าซ่อม"
                    >
                      <div className="sortable-th-inner">
                        <span>ค่าซ่อม / อะไหล่</span>
                        <span className="sort-indicator">
                          {sortConfig.key === "repair_cost"
                            ? sortConfig.direction === "desc"
                              ? "↓"
                              : "↑"
                            : "⇅"}
                        </span>
                      </div>
                    </th>
                    <th
                      className={`sortable-th ${sortConfig.key === "status" ? "sorted" : ""}`}
                      style={{ minWidth: "120px" }}
                      onClick={() => handleSort("status")}
                      title="คลิกเพื่อเรียงตามสถานะและ SLA"
                    >
                      <div className="sortable-th-inner">
                        <span>สถานะ / SLA</span>
                        <span className="sort-indicator">
                          {sortConfig.key === "status"
                            ? sortConfig.direction === "desc"
                              ? "↓"
                              : "↑"
                            : "⇅"}
                        </span>
                      </div>
                    </th>
                    <th
                      className={`sortable-th ${
                        sortConfig.key === "reporter_name" ? "sorted" : ""
                      }`}
                      style={{ minWidth: "100px", maxWidth: "120px" }}
                      onClick={() => handleSort("reporter_name")}
                      title="คลิกเพื่อเรียงตามชื่อผู้แจ้ง"
                    >
                      <div className="sortable-th-inner">
                        <span>ผู้แจ้ง</span>
                        <span className="sort-indicator">
                          {sortConfig.key === "reporter_name"
                            ? sortConfig.direction === "desc"
                              ? "↓"
                              : "↑"
                            : "⇅"}
                        </span>
                      </div>
                    </th>
                    <th
                      className="sticky-action-col"
                      style={{ minWidth: "185px", textAlign: "right", whiteSpace: "nowrap" }}
                    >
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
                    paginatedTickets.map((t) => {
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
                      const isExpanded = Boolean(expandedTicketIds[t.id]);
                      const hasLongText =
                        (t.problem || "").length > 65 || (t.technician_note || "").length > 55;

                      return (
                        <tr key={t.id}>
                          {/* 1. Repair No + Urgency (Single-line repair_no guaranteed) */}
                          <td style={{ whiteSpace: "nowrap" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontFamily: "monospace",
                                  color: "#064e3b",
                                  whiteSpace: "nowrap",
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

                          {/* 2. Asset & Location + Clickable Repair Logbook + Full Name Tooltip */}
                          <td>
                            <div
                              style={{ fontWeight: 700, color: "#0f291e" }}
                              title={`${t.asset_name} (${t.location})`}
                            >
                              {t.asset_name}
                            </div>
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
                                      ? `ซ่อมสะสม ${repeatCount} ครั้ง`
                                      : `ประวัติซ่อม (${repeatCount})`}
                                  </span>
                                </button>
                              </div>
                            )}
                            <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: 3 }}>
                              สถานที่: {t.location}
                            </div>
                          </td>

                          {/* 3. Problem + Technician Note (Compact Clamped with Tooltip & Expand Toggle) */}
                          <td style={{ maxWidth: 275 }}>
                            <div
                              style={{
                                fontSize: "0.83rem",
                                color: "#334155",
                                lineHeight: 1.4,
                                ...(isExpanded
                                  ? {}
                                  : {
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                    }),
                              }}
                              title={t.problem}
                            >
                              {t.problem}
                            </div>
                            {t.technician_note && (
                              <div
                                style={{
                                  marginTop: 5,
                                  backgroundColor: "#f0f9ff",
                                  padding: "5px 8px",
                                  borderRadius: "6px",
                                  borderLeft: "3px solid #0284c7",
                                }}
                                title={`บันทึกช่าง: ${t.technician_note}`}
                              >
                                <div
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "#0369a1",
                                    lineHeight: 1.4,
                                    ...(isExpanded
                                      ? {}
                                      : {
                                          whiteSpace: "nowrap",
                                          overflow: "hidden",
                                          textOverflow: "ellipsis",
                                        }),
                                  }}
                                >
                                  <strong>บันทึกช่าง:</strong> {t.technician_note}
                                </div>
                              </div>
                            )}

                            {hasLongText && (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedTicketIds((prev) => ({
                                    ...prev,
                                    [t.id]: !prev[t.id],
                                  }))
                                }
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: 0,
                                  marginTop: 4,
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  color: "#0284c7",
                                  cursor: "pointer",
                                }}
                              >
                                {isExpanded ? "▲ ย่อข้อความ" : "▼ ดูรายละเอียดเต็ม"}
                              </button>
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

                          {/* 6. Status + SLA Duration / Overdue Badge */}
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-start" }}>
                              {statusBadge}
                              <span className={`sla-badge ${sla.type}`}>
                                <Timer size={11} />
                                <span>{sla.label}</span>
                              </span>
                            </div>
                          </td>

                          {/* 7. Reporter */}
                          <td style={{ maxWidth: 120 }}>
                            <div
                              style={{
                                fontSize: "0.82rem",
                                fontWeight: 600,
                                color: "#1e293b",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                              title={t.reporter_name}
                            >
                              {t.reporter_name}
                            </div>
                            <div
                              style={{
                                fontSize: "0.72rem",
                                color: "#64748b",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                              title={t.reporter_contact}
                            >
                              {t.reporter_contact}
                            </div>
                          </td>

                          {/* 8. Actions (Single line & Sticky Right guaranteed) */}
                          <td className="sticky-action-col" style={{ whiteSpace: "nowrap" }}>
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
                              {canUpdateTicket ? (
                                <>
                                  <button
                                    type="button"
                                    className="action-btn-link"
                                    onClick={() => handleOpenUpdate(t)}
                                    title="อัปเดตสถานะ / บันทึกช่าง / ค่าซ่อม"
                                    style={{ whiteSpace: "nowrap" }}
                                  >
                                    อัปเดตงาน
                                  </button>
                                  {canDeleteTicket && (
                                    <button
                                      type="button"
                                      className="action-btn-link danger"
                                      onClick={() => handleDeleteTicket(t)}
                                      title="ลบคำขอแจ้งซ่อม (เฉพาะแอดมิน)"
                                      style={{ whiteSpace: "nowrap" }}
                                    >
                                      ลบ
                                    </button>
                                  )}
                                </>
                              ) : t.status === "pending" ? (
                                <button
                                  type="button"
                                  className="action-btn-link danger"
                                  onClick={() => handleReporterCancelTicket(t)}
                                  title="พนักงานผู้แจ้งซ่อมสามารถยกเลิกได้เฉพาะใบงานที่รอดำเนินการ"
                                  style={{ whiteSpace: "nowrap" }}
                                >
                                  ยกเลิกคำขอ
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            {!loading && totalItems > 0 && (
              <div className="pagination-wrapper">
                <div className="pagination-info">
                  แสดงรายการแจ้งซ่อม <strong>{startIndex + 1}</strong> -{" "}
                  <strong>{endIndex}</strong> จากทั้งหมด{" "}
                  <strong>{totalItems.toLocaleString()}</strong> รายการ
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    flexWrap: "wrap",
                  }}
                >
                  {/* Page Size Selector */}
                  <div className="pagination-size-wrap">
                    <span>แสดง:</span>
                    <select
                      className="pagination-size-select"
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      <option value={5}>5 รายการ / หน้า</option>
                      <option value={10}>10 รายการ / หน้า</option>
                      <option value={25}>25 รายการ / หน้า</option>
                      <option value={50}>50 รายการ / หน้า</option>
                      <option value={100}>100 รายการ / หน้า</option>
                    </select>
                  </div>

                  {/* Page Navigation Buttons */}
                  <div className="pagination-controls">
                    <button
                      type="button"
                      className="pagination-btn"
                      disabled={safePage <= 1}
                      onClick={() => setCurrentPage(1)}
                      title="หน้าแรก"
                    >
                      &laquo;
                    </button>
                    <button
                      type="button"
                      className="pagination-btn"
                      disabled={safePage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      title="หน้าก่อนหน้า"
                    >
                      &lsaquo;
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === totalPages ||
                          (p >= safePage - 2 && p <= safePage + 2)
                      )
                      .map((p, idx, arr) => {
                        const prev = arr[idx - 1];
                        const showEllipsis = prev && p - prev > 1;
                        return (
                          <React.Fragment key={p}>
                            {showEllipsis && (
                              <span style={{ padding: "0 4px", color: "#94a3b8" }}>...</span>
                            )}
                            <button
                              type="button"
                              className={`pagination-btn ${p === safePage ? "active" : ""}`}
                              onClick={() => setCurrentPage(p)}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}

                    <button
                      type="button"
                      className="pagination-btn"
                      disabled={safePage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      title="หน้าถัดไป"
                    >
                      &rsaquo;
                    </button>
                    <button
                      type="button"
                      className="pagination-btn"
                      disabled={safePage >= totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                      title="หน้าสุดท้าย"
                    >
                      &raquo;
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* 4B. Kanban Board View (4 Status Columns - Redesigned for Easy Scanning) */
          (() => {
            const URGENCY_WEIGHT = { critical: 3, urgent: 2, normal: 1 };
            const sortKanbanItems = (list) =>
              [...list].sort((a, b) => {
                // 1. Overdue tickets always at the top
                const overdueA = getSlaInfo(a).isOverdue ? 1 : 0;
                const overdueB = getSlaInfo(b).isOverdue ? 1 : 0;
                if (overdueB !== overdueA) return overdueB - overdueA;

                // 2. Urgency priority: critical > urgent > normal
                const urgA = URGENCY_WEIGHT[a.urgency || "normal"] || 1;
                const urgB = URGENCY_WEIGHT[b.urgency || "normal"] || 1;
                if (urgB !== urgA) return urgB - urgA;

                // 3. Most recent timestamp
                const timeA = new Date(a.completed_at || a.created_at || 0).getTime();
                const timeB = new Date(b.completed_at || b.created_at || 0).getTime();
                return timeB - timeA;
              });

            const referenceLatestTime = Math.max(
              Date.now(),
              ...tickets.map((t) => new Date(t.completed_at || t.created_at || 0).getTime())
            );
            const SEVEN_DAYS_MS = 7 * 86400000;

            const allClosedTickets = sortKanbanItems(
              filteredTickets.filter(
                (t) =>
                  t.status === "completed" ||
                  t.status === "unrepairable" ||
                  t.status === "cancelled"
              )
            );
            const completedClosedCount = allClosedTickets.filter(
              (t) => t.status === "completed"
            ).length;
            const failedClosedCount = allClosedTickets.filter(
              (t) => t.status === "unrepairable" || t.status === "cancelled"
            ).length;

            const recentClosedTickets = allClosedTickets.filter((t) => {
              if (t.status === "unrepairable" || t.status === "cancelled") {
                return true;
              }
              const closeTime = new Date(t.completed_at || t.created_at || 0).getTime();
              return closeTime >= referenceLatestTime - SEVEN_DAYS_MS;
            });

            const shouldExpandClosed =
              showAllCompletedKanban ||
              statusFilter === "completed" ||
              statusFilter === "closed_other" ||
              statusFilter === "unrepairable" ||
              statusFilter === "cancelled";

            const displayedClosedTickets = shouldExpandClosed
              ? allClosedTickets
              : recentClosedTickets;
            const hiddenClosedCount = Math.max(
              0,
              allClosedTickets.length - recentClosedTickets.length
            );

            const columns = [
              {
                key: "pending",
                title: "1. รอดำเนินการ",
                subtitle: "รอรับเรื่อง / มอบหมายช่าง",
                dotColor: "#d97706",
                borderTop: "#f59e0b",
                bgHeader: "#fffbeb",
                badgeBg: "#fef3c7",
                badgeColor: "#92400e",
                items: sortKanbanItems(filteredTickets.filter((t) => t.status === "pending")),
              },
              {
                key: "in_progress",
                title: "2. กำลังดำเนินการซ่อม",
                subtitle: "ช่างกำลังตรวจเช็คและแก้ไข",
                dotColor: "#0284c7",
                borderTop: "#0284c7",
                bgHeader: "#e0f2fe",
                badgeBg: "#bae6fd",
                badgeColor: "#075985",
                items: sortKanbanItems(filteredTickets.filter((t) => t.status === "in_progress")),
              },
              {
                key: "waiting_parts",
                title: "3. รออะไหล่ / ส่งศูนย์",
                subtitle: "รอเบิกอะไหล่หรือส่งเคลม",
                dotColor: "#7c3aed",
                borderTop: "#8b5cf6",
                bgHeader: "#f3e8ff",
                badgeBg: "#e9d5ff",
                badgeColor: "#5b21b6",
                items: sortKanbanItems(
                  filteredTickets.filter((t) => t.status === "waiting_parts")
                ),
              },
              {
                key: "completed",
                title: "4. ซ่อมเสร็จสิ้น / ปิดงาน",
                subtitle: shouldExpandClosed
                  ? "รวมงานซ่อมเสร็จและงานไม่สำเร็จทั้งหมด"
                  : "งานซ่อมเสร็จ 7 วันล่าสุด + งานไม่สำเร็จ",
                dotColor: "#059669",
                borderTop: "#10b981",
                bgHeader: "#d1fae5",
                badgeBg: "#a7f3d0",
                badgeColor: "#065f46",
                items: displayedClosedTickets,
                totalCount: allClosedTickets.length,
                recentCount: recentClosedTickets.length,
                hiddenCount: hiddenClosedCount,
                completedCount: completedClosedCount,
                failedCount: failedClosedCount,
              },
            ];

            return (
              <div className="kanban-board-grid">
                {columns.map((col) => (
                  <div
                    key={col.key}
                    className="kanban-column"
                    style={{ borderTop: `4px solid ${col.borderTop}` }}
                  >
                    <div
                      className="kanban-column-header"
                      style={{ backgroundColor: col.bgHeader, flexDirection: "column", alignItems: "stretch", gap: 8 }}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                        <div>
                          <div className="kanban-column-title">
                            <span
                              style={{
                                width: 10,
                                height: 10,
                                borderRadius: "50%",
                                backgroundColor: col.dotColor,
                                display: "inline-block",
                                flexShrink: 0,
                              }}
                            />
                            <span>{col.title}</span>
                          </div>
                          <div
                            style={{
                              fontSize: "0.74rem",
                              color: "#475569",
                              marginLeft: 18,
                              fontWeight: 500,
                            }}
                          >
                            {col.subtitle}
                          </div>
                        </div>
                        <span
                          className="kanban-column-count"
                          style={{
                            backgroundColor: col.badgeBg,
                            color: col.badgeColor,
                            borderColor: "transparent",
                            flexShrink: 0,
                          }}
                        >
                          {col.key === "completed" && !shouldExpandClosed && col.hiddenCount > 0
                            ? `${col.items.length}/${col.totalCount} งาน`
                            : `${col.items.length} งาน`}
                        </span>
                      </div>

                      {col.key === "completed" && (
                        <div className="kanban-col-subbadges">
                          <button
                            type="button"
                            className={`kanban-subbadge success ${
                              statusFilter === "completed" ? "active" : ""
                            }`}
                            onClick={() =>
                              setStatusFilter(statusFilter === "completed" ? "all" : "completed")
                            }
                            title="คลิกเพื่อกรองเฉพาะงานที่ซ่อมเสร็จสิ้น"
                          >
                            <span className="dot" style={{ backgroundColor: "#10b981" }} />
                            <span>เสร็จสิ้น {col.completedCount}</span>
                          </button>

                          <button
                            type="button"
                            className={`kanban-subbadge failed ${
                              statusFilter === "closed_other" ? "active" : ""
                            }`}
                            onClick={() =>
                              setStatusFilter(
                                statusFilter === "closed_other" ? "all" : "closed_other"
                              )
                            }
                            title="คลิกเพื่อกรองเฉพาะงานที่ไม่สำเร็จ (ซ่อมไม่ได้ / ยกเลิก)"
                          >
                            <span className="dot" style={{ backgroundColor: "#dc2626" }} />
                            <span>ไม่สำเร็จ {col.failedCount}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="kanban-card-list">
                      {col.items.length === 0 ? (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "36px 12px",
                            color: "#94a3b8",
                            fontSize: "0.84rem",
                            border: "1px dashed #e2e8f0",
                            borderRadius: 10,
                            backgroundColor: "#ffffff",
                          }}
                        >
                          ไม่มีรายการในขั้นตอนนี้
                        </div>
                      ) : (
                        col.items.map((t) => {
                          const sla = getSlaInfo(t);
                          const repeatCount = assetRepairCountMap[t.asset_code] || 0;
                          const cumulativeAssetCost = assetRepairCostMap[t.asset_code] || 0;
                          const isLemonWarning =
                            repeatCount >= 3 ||
                            cumulativeAssetCost >= 5000 ||
                            t.status === "unrepairable";
                          const urgencyClass = `urgency-${t.urgency || "normal"}`;
                          const urgencyLabel =
                            t.urgency === "critical"
                              ? "ด่วนที่สุด"
                              : t.urgency === "urgent"
                              ? "ด่วน"
                              : "ปกติ";

                          const hasCost = Number(t.repair_cost) > 0;
                          const isWarrantyFree =
                            !hasCost &&
                            t.repair_type === "warranty" &&
                            t.status !== "pending";

                          return (
                            <div key={t.id} className={`kanban-card ${urgencyClass}`}>
                              {/* Row 1: Ticket Number + Urgency + SLA Badge */}
                              <div className="kanban-card-top">
                                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                  <span className="kanban-card-no">{t.repair_no}</span>
                                  <span
                                    style={{
                                      fontSize: "0.75rem",
                                      fontWeight: 700,
                                      padding: "2px 8px",
                                      borderRadius: 999,
                                      backgroundColor:
                                        t.urgency === "critical"
                                          ? "#fef2f2"
                                          : t.urgency === "urgent"
                                          ? "#fffbeb"
                                          : "#f1f5f9",
                                      color:
                                        t.urgency === "critical"
                                          ? "#dc2626"
                                          : t.urgency === "urgent"
                                          ? "#d97706"
                                          : "#475569",
                                    }}
                                  >
                                    {urgencyLabel}
                                  </span>
                                </div>

                                <span
                                  className={`sla-badge ${sla.type}`}
                                  style={{ fontSize: "0.74rem", padding: "3px 8px" }}
                                >
                                  <Timer size={12} />
                                  <span>{sla.label}</span>
                                </span>
                              </div>

                              {/* Row 2: Asset Name & Code + Repeat Logbook Pill */}
                              <div>
                                <div
                                  className="kanban-card-asset"
                                  title={`${t.asset_name} (${t.location})`}
                                >
                                  {t.asset_name}
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 6,
                                    flexWrap: "wrap",
                                    marginTop: 5,
                                  }}
                                >
                                  {t.asset_code && t.asset_code !== "-" ? (
                                    <Link
                                      to={`/asset/${encodeURIComponent(t.asset_code)}`}
                                      style={{
                                        fontSize: "0.8rem",
                                        fontFamily: "monospace",
                                        color: "#059669",
                                        fontWeight: 700,
                                      }}
                                    >
                                      {t.asset_code}
                                    </Link>
                                  ) : (
                                    <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                                      ไม่ระบุรหัส
                                    </span>
                                  )}

                                  {t.asset_code && t.asset_code !== "-" && (
                                    <button
                                      type="button"
                                      onClick={() => setLogbookAssetCode(t.asset_code)}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 4,
                                        fontSize: "0.73rem",
                                        padding: "2px 8px",
                                        borderRadius: 999,
                                        border: `1px solid ${
                                          isLemonWarning ? "#fecaca" : "#cbd5e1"
                                        }`,
                                        backgroundColor: isLemonWarning ? "#fef2f2" : "#f8fafc",
                                        color: isLemonWarning ? "#dc2626" : "#334155",
                                        cursor: "pointer",
                                        fontWeight: 700,
                                      }}
                                      title="คลิกดูสมุดประวัติการซ่อมของเครื่องนี้"
                                    >
                                      <BookOpen size={11} />
                                      <span>
                                        {isLemonWarning
                                          ? `ซ่อมสะสม ${repeatCount} ครั้ง`
                                          : `ประวัติ (${repeatCount})`}
                                      </span>
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Row 3: Problem Description Box (Separated outer padding from inner 2-line clamp) */}
                              <div className="kanban-card-problem" title={t.problem}>
                                <div className="kanban-card-problem-text">{t.problem}</div>
                              </div>

                              {/* Row 4: Legible Meta Info Box (Location, Repair Channel, Technician & Cost) */}
                              <div className="kanban-card-meta">
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: 8,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <span
                                    style={{
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      maxWidth: "100%",
                                      fontWeight: 500,
                                    }}
                                    title={t.location}
                                  >
                                    สถานที่: {t.location}
                                  </span>
                                  <span
                                    className={`repair-type-tag ${t.repair_type || "internal"}`}
                                    style={{ fontSize: "0.75rem", padding: "3px 8px" }}
                                  >
                                    {REPAIR_TYPE_LABELS[t.repair_type || "internal"]}
                                  </span>
                                </div>

                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: 8,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <span>
                                    ช่าง:{" "}
                                    {t.technician_name ? (
                                      <strong style={{ color: "#1e293b", fontWeight: 700 }}>
                                        {t.technician_name}
                                      </strong>
                                    ) : (
                                      <span style={{ color: "#94a3b8", fontWeight: 500 }}>
                                        - (รอมอบหมาย)
                                      </span>
                                    )}
                                  </span>

                                  {hasCost ? (
                                    <strong
                                      style={{
                                        color: "#6d28d9",
                                        backgroundColor: "#f3e8ff",
                                        padding: "2px 9px",
                                        borderRadius: 6,
                                        fontSize: "0.8rem",
                                        fontWeight: 800,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {Number(t.repair_cost).toLocaleString()} ฿
                                    </strong>
                                  ) : isWarrantyFree ? (
                                    <span
                                      style={{
                                        color: "#059669",
                                        backgroundColor: "#ecfdf5",
                                        padding: "2px 8px",
                                        borderRadius: 6,
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      เคลมฟรี
                                    </span>
                                  ) : (
                                    <span
                                      style={{
                                        color: "#94a3b8",
                                        fontSize: "0.78rem",
                                        fontWeight: 600,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      ค่าซ่อม: -
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Row 5: Responsive Non-Clipping Action Footer */}
                              <div className="kanban-card-footer">
                                {canUpdateTicket && (
                                  <select
                                    className="kanban-quick-select"
                                    value={t.status}
                                    title="เปลี่ยนสถานะใบงานด่วน (สำหรับช่างและแอดมิน)"
                                    onChange={async (e) => {
                                      const newStatus = e.target.value;
                                      const updatedTicket = {
                                        ...t,
                                        status: newStatus,
                                        completed_at:
                                          newStatus === "completed"
                                            ? new Date().toISOString()
                                            : t.completed_at,
                                      };
                                      const updatedList = tickets.map((item) =>
                                        item.id === t.id ? updatedTicket : item
                                      );
                                      setTickets(updatedList);
                                      await saveMaintenanceTicketToCloud(
                                        updatedTicket,
                                        updatedList
                                      );
                                    }}
                                  >
                                    <option value="pending">สถานะ: รอดำเนินการ</option>
                                    <option value="in_progress">สถานะ: กำลังซ่อม</option>
                                    <option value="waiting_parts">สถานะ: รออะไหล่/ส่งศูนย์</option>
                                    <option value="completed">สถานะ: ซ่อมเสร็จสิ้น</option>
                                    <option value="unrepairable">สถานะ: ซ่อมไม่ได้</option>
                                    <option value="cancelled">สถานะ: ยกเลิก</option>
                                  </select>
                                )}

                                <div
                                  className="kanban-footer-btns"
                                  style={
                                    !canUpdateTicket && t.status !== "pending"
                                      ? { gridTemplateColumns: "1fr" }
                                      : undefined
                                  }
                                >
                                  <button
                                    type="button"
                                    className="action-btn-link kanban-btn-item"
                                    style={{
                                      backgroundColor: "#f8fafc",
                                      border: "1px solid #cbd5e1",
                                      color: "#334155",
                                    }}
                                    onClick={() => handleOpenPrint(t)}
                                  >
                                    <Printer size={13} />
                                    <span>ใบงาน</span>
                                  </button>
                                  {canUpdateTicket ? (
                                    <button
                                      type="button"
                                      className="action-btn-link kanban-btn-item"
                                      onClick={() => handleOpenUpdate(t)}
                                    >
                                      <span>อัปเดตงาน</span>
                                    </button>
                                  ) : t.status === "pending" ? (
                                    <button
                                      type="button"
                                      className="action-btn-link danger kanban-btn-item"
                                      onClick={() => handleReporterCancelTicket(t)}
                                    >
                                      <span>ยกเลิกคำขอ</span>
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}

                      {/* Show All / Collapse Toggle Button for Column 4 (Completed/Closed) */}
                      {col.key === "completed" && col.totalCount > col.recentCount && (
                        <button
                          type="button"
                          className="kanban-show-more-btn"
                          onClick={() => setShowAllCompletedKanban((prev) => !prev)}
                        >
                          {showAllCompletedKanban
                            ? `ย่อแสดงเฉพาะ 7 วันล่าสุด (${col.recentCount} งาน)`
                            : `ดูทั้งหมด (${col.totalCount} งาน — มีงานเก่าอีก ${col.hiddenCount} งาน)`}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()
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
                  <label>ระดับความเร่งด่วน (กำหนดเกณฑ์ SLA อัตโนมัติ)</label>
                  <select
                    className="form-control"
                    value={formData.urgency}
                    onChange={(e) => setFormData((f) => ({ ...f, urgency: e.target.value }))}
                  >
                    <option value="normal">ปกติ (Normal) — SLA ภายใน 7 วัน</option>
                    <option value="urgent">ด่วน (Urgent) — SLA ภายใน 3 วัน</option>
                    <option value="critical">ด่วนที่สุด (Critical) — SLA ภายใน 1 วัน</option>
                  </select>
                  <div
                    style={{
                      marginTop: 5,
                      fontSize: "0.74rem",
                      color:
                        formData.urgency === "critical"
                          ? "#dc2626"
                          : formData.urgency === "urgent"
                          ? "#d97706"
                          : "#059669",
                      fontWeight: 700,
                    }}
                  >
                    กำหนดส่งคืนตามเกณฑ์ SLA อัตโนมัติ:{" "}
                    {new Date(
                      `${getAutoSlaExpectedDate(formData.urgency)}T00:00:00`
                    ).toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
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
                          : "คลิกเพื่อเลือกรูปถ่ายอาการเสีย หรือถ่ายภาพจากมือถือ"}
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
                          : "คลิกเพื่ออัปโหลดรูปหลังซ่อมเสร็จ หรือใบเสร็จค่าซ่อม"}
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
                    {isLemonAsset ? "ซ่อมบ่อย / ค่าซ่อมสูง" : "อยู่ในเกณฑ์ปกติ"}
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

      {/* ===================================================================== */}
      {/* MODAL 6: Admin User Approval & 3-Role Permission Management           */}
      {/* ===================================================================== */}
      {showUserMgmtModal && isAdmin && (
        <div
          className="modal-overlay no-print"
          onClick={() => setShowUserMgmtModal(false)}
        >
          <div
            className="modal-content"
            style={{ maxWidth: "760px", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: "#fef3c7",
                    color: "#b45309",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Users size={20} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <h3 className="modal-title" style={{ margin: 0 }}>
                      จัดการผู้ใช้งานและอนุมัติสิทธิ์ (Admin Role Management)
                    </h3>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 999,
                        backgroundColor: isUsersCloudSynced ? "#ecfdf5" : "#f1f5f9",
                        color: isUsersCloudSynced ? "#059669" : "#475569",
                      }}
                    >
                      <Cloud size={12} />
                      {isUsersCloudSynced
                        ? "ซิงค์ตาราง app_users บน Supabase แล้ว"
                        : "ซิงค์อัตโนมัติ (Local + Supabase Auth)"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    อนุมัติผู้สมัครใหม่และกำหนดสิทธิ์การใช้งาน 3 ระดับ: แอดมิน / ช่าง / พนักงาน
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="action-btn-link"
                onClick={() => setShowUserMgmtModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 14,
                fontSize: "0.79rem",
                color: "#334155",
                lineHeight: 1.5,
              }}
            >
              <strong>สรุปขอบเขตสิทธิ์ทั้ง 3 ระดับ:</strong>
              <div style={{ marginTop: 4, display: "grid", gap: 3 }}>
                <div>
                  • <strong>แอดมิน (Admin):</strong> อนุมัติผู้สมัครใหม่ กำหนดสิทธิ์ อัปเดตสถานะงานซ่อม ลบใบงาน และจัดการระบบทั้งหมด
                </div>
                <div>
                  • <strong>ช่าง (Technician):</strong> รับงานซ่อม อัปเดตสถานะ บันทึกค่าซ่อม/อะไหล่/รูปหลังซ่อม และพิมพ์ใบงาน (ลบใบงานไม่ได้)
                </div>
                <div>
                  • <strong>พนักงาน (Employee):</strong> แจ้งซ่อมครุภัณฑ์ สแกน QR ติดตามสถานะ พิมพ์ใบงาน และยกเลิกได้เฉพาะใบงานที่รอดำเนินการ
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(usersList || []).map((u) => {
                const isPending = u.approval_status === "pending";
                const isSuspended = u.approval_status === "suspended";
                const isSelf =
                  (u.email || "").toLowerCase() ===
                  (user?.email || "").toLowerCase();

                return (
                  <div
                    key={u.id || u.email}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: `1px solid ${
                        isPending
                          ? "#fde68a"
                          : isSuspended
                          ? "#fecaca"
                          : "#e2e8f0"
                      }`,
                      backgroundColor: isPending
                        ? "#fffbeb"
                        : isSuspended
                        ? "#fef2f2"
                        : "#ffffff",
                    }}
                  >
                    <div style={{ minWidth: 210, flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <strong style={{ fontSize: "0.9rem", color: "#0f172a" }}>
                          {u.full_name || "ไม่ระบุชื่อ"}
                        </strong>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 999,
                            backgroundColor: isPending
                              ? "#fef3c7"
                              : isSuspended
                              ? "#fee2e2"
                              : "#dcfce7",
                            color: isPending
                              ? "#b45309"
                              : isSuspended
                              ? "#b91c1c"
                              : "#15803d",
                          }}
                        >
                          {isPending
                            ? "รออนุมัติ"
                            : isSuspended
                            ? "ระงับสิทธิ์"
                            : "อนุมัติแล้ว"}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "0.76rem",
                          color: "#64748b",
                          marginTop: 2,
                        }}
                      >
                        อีเมล: {u.email} | รหัสเข้าใช้งาน:{" "}
                        <code
                          style={{
                            backgroundColor: "#f1f5f9",
                            padding: "1px 5px",
                            borderRadius: 4,
                            color: "#0f172a",
                            fontWeight: 700,
                          }}
                        >
                          {u.passcode}
                        </code>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <select
                        className="form-control"
                        style={{
                          width: "auto",
                          minWidth: 135,
                          padding: "5px 10px",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                        }}
                        value={u.role || "employee"}
                        onChange={(e) =>
                          updateUserRoleAndStatus(u.email, {
                            role: e.target.value,
                          })
                        }
                      >
                        <option value="employee">สิทธิ์: พนักงาน</option>
                        <option value="technician">สิทธิ์: ช่าง</option>
                        <option value="admin">สิทธิ์: แอดมิน</option>
                      </select>

                      {isPending ? (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{
                            padding: "5px 12px",
                            fontSize: "0.78rem",
                            backgroundColor: "#059669",
                          }}
                          onClick={() =>
                            updateUserRoleAndStatus(u.email, {
                              approval_status: "approved",
                            })
                          }
                        >
                          <Check size={14} />
                          <span>อนุมัติใช้งาน</span>
                        </button>
                      ) : (
                        !isSelf && (
                          <button
                            type="button"
                            className="action-btn-link"
                            style={{ fontSize: "0.76rem" }}
                            onClick={() =>
                              updateUserRoleAndStatus(u.email, {
                                approval_status: isSuspended
                                  ? "approved"
                                  : "suspended",
                              })
                            }
                          >
                            {isSuspended ? "คืนสิทธิ์ใช้งาน" : "ระงับสิทธิ์"}
                          </button>
                        )
                      )}

                      {!isSelf && (
                        <button
                          type="button"
                          className="action-btn-link danger"
                          style={{ fontSize: "0.76rem" }}
                          onClick={() => {
                            if (
                              window.confirm(
                                `ยืนยันการลบบัญชีผู้ใช้ ${u.full_name} (${u.email})?`
                              )
                            ) {
                              deleteUserByEmail(u.email);
                            }
                          }}
                        >
                          ลบ
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="form-actions" style={{ marginTop: 18 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowUserMgmtModal(false)}
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
