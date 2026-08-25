import { useEffect, useRef } from "react";
import QRCode from "qrcode";

/**
 * แสดง QR Code ของครุภัณฑ์ชิ้นหนึ่ง โดย encode เป็น URL เต็ม
 * (ไม่ใช่แค่รหัส) เพื่อให้กล้องมือถือทั่วไปสแกนแล้วเปิดหน้าเว็บได้ทันที
 * แม้ไม่ได้เปิดผ่านแอปสแกนของระบบเราเอง
 */
export default function QRCodeDisplay({ assetCode, assetName, size = 220 }) {
  const canvasRef = useRef(null);
  const scanUrl = `${window.location.origin}/asset/${assetCode}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, scanUrl, { width: size, margin: 1 }, (err) => {
        if (err) console.error("[QRCodeDisplay] สร้าง QR ไม่สำเร็จ:", err);
      });
    }
  }, [scanUrl, size]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = `QR-${assetCode}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handlePrint = () => {
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head><title>QR ${assetCode}</title></head>
        <body style="text-align:center; font-family: sans-serif; padding: 24px;">
          <img src="${dataUrl}" />
          <p style="font-size:14px; margin-top:8px;">${assetName || ""}<br/>${assetCode}</p>
          <script>window.onload = () => window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="qr-display">
      <canvas ref={canvasRef} />
      <p className="qr-code-label">{assetCode}</p>
      <div className="qr-actions">
        <button className="btn btn-secondary" onClick={handleDownload}>
          ดาวน์โหลด PNG
        </button>
        <button className="btn btn-secondary" onClick={handlePrint}>
          พิมพ์
        </button>
      </div>
    </div>
  );
}
