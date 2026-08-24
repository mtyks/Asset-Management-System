import React, { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Download, Printer } from "lucide-react";

/**
 * แสดง QR Code ของครุภัณฑ์
 * รองรับทั้ง prop value/assetCode/code และ caption/assetName/name
 */
export default function QRCodeDisplay({
  value,
  assetCode,
  code,
  caption,
  assetName,
  name,
  size = 220,
}) {
  const canvasRef = useRef(null);
  const actualCode = String(value || assetCode || code || "").trim();
  const actualName = String(caption || assetName || name || "").trim();

  // สร้าง URL เต็มเพื่อให้กล้องมือถือทั่วไปสแกนแล้วเปิดหน้าเว็บได้ทันที
  const scanUrl = actualCode
    ? `${window.location.origin}/asset/${encodeURIComponent(actualCode)}`
    : window.location.href;

  useEffect(() => {
    if (canvasRef.current && actualCode) {
      QRCode.toCanvas(
        canvasRef.current,
        scanUrl,
        {
          width: size,
          margin: 2,
          color: {
            dark: "#0b1329",
            light: "#ffffff",
          },
        },
        (err) => {
          if (err) console.error("[QRCodeDisplay] สร้าง QR ไม่สำเร็จ:", err);
        }
      );
    }
  }, [scanUrl, size, actualCode]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `QR-${actualCode || "asset"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handlePrint = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>สติ๊กเกอร์ QR Code - ${actualCode}</title>
          <style>
            body {
              text-align: center;
              font-family: 'Sarabun', 'Prompt', sans-serif;
              padding: 24px;
              margin: 0;
            }
            .qr-card {
              display: inline-block;
              border: 2px solid #0f172a;
              border-radius: 12px;
              padding: 16px 20px;
            }
            .qr-code-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 8px;
              color: #0f172a;
            }
            .qr-code-meta {
              font-size: 14px;
              color: #334155;
              margin-top: 8px;
              font-family: monospace;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="qr-card">
            <div class="qr-code-title">${actualName || "ครุภัณฑ์"}</div>
            <img src="${dataUrl}" style="width: 200px; height: 200px;" />
            <div class="qr-code-meta">${actualCode}</div>
          </div>
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!actualCode) {
    return <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>ไม่มีรหัสครุภัณฑ์สำหรับสร้าง QR</div>;
  }

  return (
    <div className="qr-display" style={{ textAlign: "center" }}>
      <div style={{ display: "inline-block", padding: 12, backgroundColor: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
        <canvas ref={canvasRef} style={{ display: "block" }} />
      </div>
      <p className="qr-code-label" style={{ marginTop: 10, fontWeight: 700, fontFamily: "monospace", fontSize: "0.95rem", color: "#0f172a" }}>
        {actualCode}
      </p>
      <div className="qr-actions" style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 8 }}>
        <button type="button" className="btn btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 10px" }} onClick={handleDownload}>
          <Download size={14} />
          <span>ดาวน์โหลด PNG</span>
        </button>
        <button type="button" className="btn btn-secondary" style={{ fontSize: "0.8rem", padding: "6px 10px" }} onClick={handlePrint}>
          <Printer size={14} />
          <span>พิมพ์สติ๊กเกอร์</span>
        </button>
      </div>
    </div>
  );
}
