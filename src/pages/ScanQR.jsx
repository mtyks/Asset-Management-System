import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";

const SCANNER_ELEMENT_ID = "qr-reader";

export default function ScanQR() {
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const [error, setError] = useState(null);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 240 },
        (decodedText) => {
          handleScanResult(decodedText);
        },
        () => {
          /* เรียกทุกเฟรมที่สแกนไม่เจอ - ไม่ต้องทำอะไร ไม่ใช่ error จริง */
        }
      )
      .catch((err) => {
        setError("เปิดกล้องไม่สำเร็จ กรุณาอนุญาตการใช้กล้อง หรือใช้การกรอกรหัสด้วยมือด้านล่าง (" + err + ")");
      });

    return () => {
      scanner.stop().catch(() => {});
      scanner.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleScanResult(decodedText) {
    // decodedText คือ URL เต็ม เช่น https://yourapp.com/asset/A-XXXX
    // หรือถ้าพี่พิมพ์ QR แบบเก่าที่เก็บแค่รหัส ก็อ่านรหัสได้ตรงๆ เช่นกัน
    try {
      const url = new URL(decodedText);
      const parts = url.pathname.split("/").filter(Boolean);
      const code = parts[parts.length - 1];
      navigate(`/asset/${code}`);
    } catch {
      navigate(`/asset/${decodedText}`);
    }
  }

  function handleManualSubmit(e) {
    e.preventDefault();
    if (manualCode.trim()) navigate(`/asset/${manualCode.trim()}`);
  }

  return (
    <div className="page scan-page">
      <h1>สแกน QR ครุภัณฑ์</h1>
      <div id={SCANNER_ELEMENT_ID} className="qr-reader-box" />
      {error && <p className="form-error">{error}</p>}

      <form className="manual-code-form" onSubmit={handleManualSubmit}>
        <p>หรือกรอกรหัสครุภัณฑ์ด้วยตนเอง:</p>
        <input
          value={manualCode}
          onChange={(e) => setManualCode(e.target.value)}
          placeholder="เช่น A-20260824-1234"
        />
        <button className="btn btn-secondary" type="submit">
          ค้นหา
        </button>
      </form>
    </div>
  );
}
