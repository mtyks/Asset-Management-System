import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { listAssets } from "../lib/queries";
import {
  QrCode,
  Camera,
  Search,
  AlertCircle,
  Upload,
  RefreshCw,
  ArrowRight,
  Package,
  CheckCircle,
  CameraOff,
} from "lucide-react";

const SCANNER_ELEMENT_ID = "qr-reader-viewport";

export default function ScanQR() {
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState(null);
  const [manualCode, setManualCode] = useState("");
  const [recentAssets, setRecentAssets] = useState([]);
  const [fileScanning, setFileScanning] = useState(false);

  useEffect(() => {
    listAssets()
      .then((data) => setRecentAssets((data || []).slice(0, 6)))
      .catch(() => {});
  }, []);

  const handleScanResult = (decodedText) => {
    if (!decodedText) return;
    stopCamera();

    // หาก QR Code เป็น URL หรือ path
    try {
      if (decodedText.startsWith("http://") || decodedText.startsWith("https://")) {
        const url = new URL(decodedText);
        const parts = url.pathname.split("/").filter(Boolean);
        const code = parts[parts.length - 1];
        navigate(`/asset/${code}`);
        return;
      }
    } catch {}

    // รหัสตรงๆ
    navigate(`/asset/${encodeURIComponent(decodedText.trim())}`);
  };

  const startCamera = async () => {
    setError(null);
    try {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {}
      }

      const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleScanResult(decodedText);
        },
        () => {} // ignore frame parse errors
      );

      setCameraActive(true);
    } catch (err) {
      console.warn("Camera start error:", err);
      setCameraActive(false);
      setError(
        "ไม่สามารถเปิดกล้องได้ (กรุณาอนุญาตสิทธิ์การเข้าถึงกล้อง หรือใช้วิธีอัปโหลดรูป / ค้นหารหัสแทน)"
      );
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.warn("Stop scanner error:", err);
      }
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().catch(() => {});
          }
        } catch {}
      }
    };
  }, []);

  // สแกน QR Code จากไฟล์รูปภาพ
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileScanning(true);
    setError(null);

    try {
      const html5QrCode = new Html5Qrcode("qr-file-scanner-temp");
      const decodedText = await html5QrCode.scanFile(file, true);
      handleScanResult(decodedText);
    } catch (err) {
      setError("ไม่พบ QR Code ในรูปภาพที่เลือก กรุณาลองใหม่อีกครั้ง");
    } finally {
      setFileScanning(false);
      e.target.value = "";
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.trim()) {
      navigate(`/asset/${encodeURIComponent(manualCode.trim())}`);
    }
  };

  return (
    <div className="page-container" style={{ maxWidth: 680 }}>
      {/* Hidden element for file scanning */}
      <div id="qr-file-scanner-temp" style={{ display: "none" }} />

      {/* Header */}
      <div className="page-heading-row" style={{ textAlign: "center", justifyContent: "center" }}>
        <div className="page-title-group">
          <h1>ตรวจนับ / สแกน QR ครุภัณฑ์</h1>
          <p className="page-subtitle">
            สแกนสติ๊กเกอร์ QR Code ด้วยกล้อง อัปโหลดรูปภาพ หรือค้นหาด้วยรหัสครุภัณฑ์
          </p>
        </div>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            padding: "12px 16px",
            borderRadius: "8px",
            fontSize: "0.88rem",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Camera Viewfinder Card */}
      <div className="form-card" style={{ padding: 24, textAlign: "center", marginBottom: 20 }}>
        <div
          id={SCANNER_ELEMENT_ID}
          style={{
            width: "100%",
            maxWidth: 360,
            minHeight: cameraActive ? 260 : 0,
            margin: "0 auto",
            borderRadius: 12,
            overflow: "hidden",
            backgroundColor: cameraActive ? "#062e24" : "transparent",
          }}
        />

        {!cameraActive ? (
          <div
            style={{
              padding: "36px 20px",
              backgroundColor: "#f6faf8",
              border: "2px dashed #a7f3d0",
              borderRadius: 12,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                backgroundColor: "#ecfdf5",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Camera size={30} />
            </div>
            <div>
              <h3 style={{ margin: "0 0 6px", fontSize: "1.1rem", fontWeight: 700, color: "#0f291e" }}>
                เปิดกล้องสแกน QR Code
              </h3>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#52796f" }}>
                ส่องกล้องไปที่ป้ายสติ๊กเกอร์ QR Code บนตัวครุภัณฑ์
              </p>
            </div>
            <button className="btn btn-primary" onClick={startCamera} style={{ marginTop: 6 }}>
              <Camera size={16} />
              <span>เริ่มเปิดกล้องสแกน</span>
            </button>
          </div>
        ) : (
          <div style={{ marginTop: 14 }}>
            <button className="btn btn-secondary" onClick={stopCamera}>
              <CameraOff size={16} />
              <span>ปิดกล้อง</span>
            </button>
          </div>
        )}

        {/* Action: Upload Image Option */}
        <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid #e2ece6" }}>
          <label
            className="btn btn-outline-white"
            style={{ display: "inline-flex", cursor: "pointer", fontSize: "0.85rem" }}
          >
            <Upload size={15} />
            <span>{fileScanning ? "กำลังอ่านรูปภาพ..." : "เลือกรูปภาพ QR จากเครื่อง"}</span>
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handleImageUpload}
              disabled={fileScanning}
            />
          </label>
        </div>
      </div>

      {/* 2. Manual Code Search Card */}
      <div className="form-card" style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: "1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: 8, color: "#0f291e" }}>
          <Search size={18} color="#059669" />
          <span>ค้นหาด้วยรหัสครุภัณฑ์โดยตรง</span>
        </h3>
        <p style={{ fontSize: "0.85rem", color: "#52796f", margin: "0 0 16px" }}>
          หากกล้องไม่สามารถสแกนได้ สามารถพิมพ์รหัสครุภัณฑ์เพื่อเข้าดูรายละเอียดได้ทันที
        </p>

        <form onSubmit={handleManualSubmit} style={{ display: "flex", gap: 10 }}>
          <input
            type="text"
            className="form-control"
            placeholder="เช่น A-2569-4469 หรือพิมพ์รหัสครุภัณฑ์"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary" style={{ whiteSpace: "nowrap" }}>
            <Search size={16} />
            <span>ค้นหา</span>
          </button>
        </form>
      </div>

      {/* 3. Quick Test Click List */}
      {recentAssets.length > 0 && (
        <div className="form-card" style={{ padding: 20 }}>
          <h4 style={{ margin: "0 0 12px", fontSize: "0.9rem", color: "#3b6354" }}>
            หรือคลิกทดสอบดูครุภัณฑ์ล่าสุดในระบบ:
          </h4>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {recentAssets.map((asset) => {
              const code = asset.asset_code || asset.code;
              return (
                <Link
                  key={asset.asset_code}
                  to={`/asset/${encodeURIComponent(code)}`}
                  style={{
                    padding: "6px 12px",
                    backgroundColor: "#f0fdf4",
                    border: "1px solid #d1fae5",
                    borderRadius: 6,
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#064e3b",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    textDecoration: "none",
                  }}
                >
                  <Package size={14} color="#059669" />
                  <span>{code} ({asset.name})</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
