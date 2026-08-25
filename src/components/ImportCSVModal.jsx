import React, { useState } from "react";
import { importAssetsBatch } from "../lib/queries";
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  ArrowRight,
  FileText,
} from "lucide-react";

/**
 * Helper แยกแถวและคอลัมน์ CSV รองรับ Quoted string และภาษาไทย UTF-8
 */
function parseCSV(text) {
  // ลบ UTF-8 BOM ถ้ามี
  let cleanText = text.replace(/^\uFEFF/, "").trim();
  if (!cleanText) return [];

  const rows = [];
  let currentRow = [];
  let currentCell = "";
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = "";
    } else if ((char === "\r" || char === "\n") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++; // skip \n
      }
      currentRow.push(currentCell.trim());
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Smart Auto-Mapping จับคู่ชื่อคอลัมน์ภาษาไทย / อังกฤษ
 */
function mapHeaderToField(header) {
  const h = header.toLowerCase().replace(/[\s_-]/g, "");

  if (["เลขครุภัณฑ์", "รหัสครุภัณฑ์", "เลขทะเบียน", "assetcode", "code", "id", "เลขที่ครุภัณฑ์"].some((k) => h.includes(k))) {
    return "asset_code";
  }
  if (["ชื่อครุภัณฑ์", "รายการครุภัณฑ์", "ชื่อสิ่งของ", "ชื่อ", "รายการ", "name", "assetname", "itemname"].some((k) => h.includes(k))) {
    return "name";
  }
  if (["หมวดหมู่", "ประเภท", "หมวด", "category", "categorycode", "categoryname", "cat"].some((k) => h.includes(k))) {
    return "category";
  }
  if (["สถานที่", "ห้อง", "จุดประจำ", "ที่ตั้ง", "ตึก", "location", "room", "roomcode", "roomname"].some((k) => h.includes(k))) {
    return "room";
  }
  if (["สียี่ห้อ", "สี", "ยี่ห้อ", "รุ่น", "รายละเอียด", "color", "brand", "model", "spec"].some((k) => h.includes(k))) {
    return "color";
  }
  if (["สถานะ", "status", "สภาพ"].some((k) => h.includes(k))) {
    return "status";
  }
  if (["ผู้รับผิดชอบ", "ผู้ดูแล", "ผู้ครอบครอง", "ผู้ใช้", "responsibleperson", "owner", "user"].some((k) => h.includes(k))) {
    return "responsible_person";
  }
  if (["วันที่ตรวจรับ", "วันที่รับ", "วันที่ซื้อ", "วันที่ได้มา", "receiveddate", "date"].some((k) => h.includes(k))) {
    return "received_date";
  }
  if (["รูปภาพ", "ลิงก์รูป", "imageurl", "image", "photo"].some((k) => h.includes(k))) {
    return "image_url";
  }

  return null;
}

export default function ImportCSVModal({ isOpen, onClose, onSuccess }) {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState(null);

  if (!isOpen) return null;

  // ดาวน์โหลดเทมเพลตตัวอย่างไฟล์ CSV
  const handleDownloadTemplate = () => {
    const templateHeaders = [
      "เลขครุภัณฑ์",
      "ชื่อครุภัณฑ์",
      "หมวดหมู่",
      "สถานที่",
      "สี/ยี่ห้อ",
      "ผู้รับผิดชอบ",
      "สถานะ",
      "วันที่ตรวจรับ",
    ];

    const sampleData = [
      [
        "A-2569-1001",
        "คอมพิวเตอร์ All-in-One Dell OptiPlex",
        "ครุภัณฑ์คอมพิวเตอร์",
        "ห้องธุรการและสารบรรณ",
        "สีดำ-เงิน Core i7",
        "สมชาย ใจดี",
        "ใช้งานปกติ",
        "2026-01-15",
      ],
      [
        "A-2569-1002",
        "โต๊ะทำงานผู้บริหาร 180 ซม.",
        "ครุภัณฑ์สำนักงาน",
        "ห้องประชุมใหญ่",
        "ไม้สักทอง",
        "วิภา สุขสม",
        "ใช้งานปกติ",
        "2026-02-01",
      ],
      [
        "A-2569-1003",
        "เครื่องโปรเจกเตอร์ 4K Epson",
        "ครุภัณฑ์ไฟฟ้าและวิทยุ",
        "ห้องประชุมใหญ่",
        "สีขาว 7,000 Lumens",
        "กิตติกร มีพร้อม",
        "ยืมใช้งาน",
        "2026-02-10",
      ],
    ];

    const csvContent =
      "\uFEFF" +
      [
        templateHeaders.join(","),
        ...sampleData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "template_import_assets.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // อ่านไฟล์เมื่อผู้ใช้เลือกไฟล์ CSV
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    setError(null);
    setImportResult(null);
    setFileName(selected.name);
    setFile(selected);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const matrix = parseCSV(text);

        if (matrix.length < 2) {
          setError("ไฟล์ CSV ต้องมีหัวตาราง (Header) และข้อมูลอย่างน้อย 1 แถว");
          setParsedRows([]);
          return;
        }

        const rawHeaders = matrix[0];
        const fieldMapping = rawHeaders.map(mapHeaderToField);

        // ตรวจสอบว่าพบคอลัมน์หลักอย่างน้อย (asset_code หรือ name)
        const hasCode = fieldMapping.includes("asset_code");
        const hasName = fieldMapping.includes("name");

        if (!hasCode && !hasName) {
          setError(
            "ไม่พบคอลัมน์ 'เลขครุภัณฑ์' หรือ 'ชื่อครุภัณฑ์' ในไฟล์ กรุณาตรวจสอบหัวตาราง (หรือดาวน์โหลดไฟล์ตัวอย่างด้านบน)"
          );
          setParsedRows([]);
          return;
        }

        setHeaders(rawHeaders);

        // แปลงแต่ละแถวเป็น object
        const items = [];
        for (let r = 1; r < matrix.length; r++) {
          const rowData = matrix[r];
          const obj = {};
          for (let c = 0; c < rowData.length; c++) {
            const field = fieldMapping[c];
            if (field) {
              obj[field] = rowData[c];
            }
          }

          // ถ้าไม่มี asset_code ให้ auto-generate
          if (!obj.asset_code && obj.name) {
            obj.asset_code = `A-${Date.now().toString().slice(-4)}-${r}`;
          }

          if (obj.asset_code || obj.name) {
            items.push(obj);
          }
        }

        setParsedRows(items);
      } catch (err) {
        setError("ไม่สามารถอ่านไฟล์ได้: " + err.message);
        setParsedRows([]);
      }
    };

    reader.readAsText(selected, "UTF-8");
  };

  // ยืนยันการนำเข้าข้อมูล
  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;

    setImporting(true);
    setError(null);
    setProgress(0);

    try {
      const result = await importAssetsBatch(parsedRows, (pct) => {
        setProgress(pct);
      });

      setImportResult(result);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการบันทึก: " + err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: "780px" }}
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
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="modal-title" style={{ margin: 0 }}>
                นำเข้าข้อมูลครุภัณฑ์จากไฟล์ CSV
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.8rem",
                  color: "#52796f",
                }}
              >
                รองรับไฟล์ CSV ภาษาไทย UTF-8 ระบบจะจับคู่คอลัมน์และสร้างหมวดหมู่ให้อัตโนมัติ
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

        {/* Success Banner */}
        {importResult && (
          <div
            style={{
              backgroundColor: "#ecfdf5",
              border: "1px solid #a7f3d0",
              borderRadius: "10px",
              padding: "16px 20px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <CheckCircle2 size={28} color="#059669" />
            <div>
              <h4 style={{ margin: "0 0 4px", fontSize: "0.95rem", color: "#064e3b" }}>
                นำเข้าข้อมูลสำเร็จเรียบร้อย!
              </h4>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#047857" }}>
                บันทึกครุภัณฑ์ลงระบบทั้งหมด <strong>{importResult.success}</strong> รายการ
              </p>
            </div>
          </div>
        )}

        {/* Upload & Template Area */}
        {!importResult && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "14px",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <span style={{ fontSize: "0.85rem", color: "#3b6354", fontWeight: 600 }}>
                1. เลือกไฟล์ CSV ที่มีข้อมูลครุภัณฑ์:
              </span>
              <button
                type="button"
                className="btn btn-outline-white"
                style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                onClick={handleDownloadTemplate}
              >
                <Download size={14} />
                <span>ดาวน์โหลดไฟล์ตัวอย่าง (Template CSV)</span>
              </button>
            </div>

            {/* Dropzone Box */}
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "28px 20px",
                border: "2px dashed #a7f3d0",
                borderRadius: "12px",
                backgroundColor: "#f6faf8",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.15s ease",
                marginBottom: "18px",
              }}
            >
              <input
                type="file"
                accept=".csv, text/csv"
                style={{ display: "none" }}
                onChange={handleFileChange}
              />
              <Upload size={32} color="#059669" style={{ marginBottom: 8 }} />
              <span style={{ fontSize: "0.92rem", fontWeight: 700, color: "#0f291e" }}>
                {fileName ? fileName : "คลิกเพื่อเลือกไฟล์ CSV จากในเครื่อง"}
              </span>
              <span style={{ fontSize: "0.8rem", color: "#52796f", marginTop: 4 }}>
                รองรับไฟล์นามสกุล .csv (การเข้ารหัสแบบ UTF-8)
              </span>
            </label>

            {/* Preview Section */}
            {parsedRows.length > 0 && (
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "8px",
                  }}
                >
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f291e" }}>
                    2. ตัวอย่างข้อมูลที่ตรวจพบ ({parsedRows.length} รายการ):
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "#52796f" }}>
                    แสดง 5 แถวแรก
                  </span>
                </div>

                <div
                  className="table-card"
                  style={{ maxHeight: "220px", overflowY: "auto", marginBottom: "20px" }}
                >
                  <div className="table-responsive">
                    <table className="modern-table" style={{ fontSize: "0.8rem" }}>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>เลขครุภัณฑ์</th>
                          <th>ชื่อครุภัณฑ์</th>
                          <th>หมวดหมู่</th>
                          <th>สถานที่</th>
                          <th>สถานะ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.slice(0, 5).map((row, idx) => (
                          <tr key={idx}>
                            <td style={{ color: "#84a98c" }}>{idx + 1}</td>
                            <td style={{ fontFamily: "monospace", fontWeight: 700 }}>
                              {row.asset_code || "-"}
                            </td>
                            <td style={{ fontWeight: 600 }}>{row.name || "-"}</td>
                            <td>{row.category || "-"}</td>
                            <td>{row.room || "-"}</td>
                            <td>{row.status || "normal"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {importing && (
              <div style={{ marginBottom: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.82rem",
                    marginBottom: "4px",
                    color: "#064e3b",
                  }}
                >
                  <span>กำลังบันทึกข้อมูลขึ้น Supabase...</span>
                  <span>{progress}%</span>
                </div>
                <div
                  style={{
                    height: "8px",
                    backgroundColor: "#f0f7f3",
                    borderRadius: "999px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${progress}%`,
                      backgroundColor: "#059669",
                      transition: "width 0.2s ease",
                    }}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer Actions */}
        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={importing}
          >
            {importResult ? "ปิดหน้าต่าง" : "ยกเลิก"}
          </button>
          {!importResult && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirmImport}
              disabled={parsedRows.length === 0 || importing}
            >
              <Upload size={16} />
              <span>
                {importing
                  ? `กำลังนำเข้า (${progress}%)...`
                  : `ยืนยันนำเข้า (${parsedRows.length} รายการ)`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
