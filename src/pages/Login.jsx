import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  ChevronLeft,
  AlertCircle,
  Delete,
  RotateCcw,
} from "lucide-react";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = location.state?.from?.pathname || "/dashboard";
  const targetPath = location.state?.from?.pathname || "";
  const systemTitle = targetPath.includes("maintenance")
    ? "ระบบแจ้งซ่อมและบำรุงรักษา"
    : "ระบบบริหารจัดการครุภัณฑ์";

  // Keypad definitions with numbers only
  const KEYPAD_BUTTONS = [
    { num: "1" },
    { num: "2" },
    { num: "3" },
    { num: "4" },
    { num: "5" },
    { num: "6" },
    { num: "7" },
    { num: "8" },
    { num: "9" },
    { num: "clear", label: "ล้าง" },
    { num: "0" },
    { num: "backspace", label: "⌫" },
  ];

  // Handle Keypad Press
  const handleKeypadPress = (key) => {
    setError(null);
    if (key === "clear") {
      setPasscode("");
      return;
    }

    if (key === "backspace") {
      setPasscode((prev) => prev.slice(0, -1));
      return;
    }

    if (passcode.length < 6) {
      setPasscode((prev) => prev + key);
    }
  };

  // Allow physical keyboard typing
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")
      ) {
        return;
      }

      if (e.key >= "0" && e.key <= "9") {
        handleKeypadPress(e.key);
      } else if (e.key === "Backspace") {
        handleKeypadPress("backspace");
      } else if (e.key === "Escape") {
        handleKeypadPress("clear");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [passcode]);

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("กรุณากรอกอีเมลผู้ใช้งาน");
      return;
    }

    if (passcode.length !== 6) {
      setError("กรุณากดรหัส Passcode ให้ครบ 6 หลัก");
      return;
    }

    setSubmitting(true);
    try {
      const { error: signInError } = await signIn(email.trim(), passcode);
      if (signInError) {
        setError(signInError.message || "อีเมลหรือรหัส Passcode ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง");
        setPasscode("");
        return;
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || "เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง");
      setPasscode("");
    } finally {
      setSubmitting(false);
    }
  }

  const isPasscodeComplete = passcode.length === 6;

  return (
    <div className="passcode-register-container">
      <div className="passcode-card">
        {/* Back Link */}
        <div style={{ marginBottom: 12 }}>
          <Link to="/" className="passcode-back-link">
            <ChevronLeft size={16} />
            <span>กลับหน้าหลัก</span>
          </Link>
        </div>

        {/* Brand Header */}
        <div className="passcode-card-header" style={{ marginBottom: 16 }}>
          <div className="passcode-icon-badge">
            <ShieldCheck size={28} />
          </div>
          <h2 className="passcode-title">{systemTitle}</h2>
          <p className="passcode-subtitle">
            เข้าสู่ระบบด้วยอีเมลและรหัส Passcode 6 หลัก
          </p>
        </div>

        {error && (
          <div className="form-error-banner" style={{ margin: "0 0 16px" }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Email input */}
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e3a2f" }}>
              อีเมลผู้ใช้งาน (Email) *
            </label>
            <div style={{ position: "relative" }}>
              <Mail
                size={16}
                color="#64748b"
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                type="email"
                className="form-control"
                placeholder="name@organization.go.th"
                style={{ paddingLeft: 36, height: 40 }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Passcode Lock Screen Section */}
          <div className="passcode-screen-box">
            <div className="passcode-prompt-text">
              <Lock size={14} />
              <span>กดรหัส Passcode 6 หลัก</span>
            </div>

            {/* 6 Dots Indicator */}
            <div className="passcode-dots-row">
              {Array.from({ length: 6 }).map((_, idx) => {
                const isFilled = idx < passcode.length;
                return (
                  <div
                    key={idx}
                    className={`passcode-dot ${isFilled ? "filled" : ""}`}
                  />
                );
              })}
            </div>

            {/* Phone Lock Screen Keypad */}
            <div className="phone-keypad-grid">
              {KEYPAD_BUTTONS.map((btn) => {
                if (btn.num === "clear") {
                  return (
                    <button
                      key="clear"
                      type="button"
                      className="keypad-btn action-btn"
                      onClick={() => handleKeypadPress("clear")}
                      title="ล้างรหัส"
                    >
                      <RotateCcw size={16} />
                      <span style={{ fontSize: "0.72rem", marginTop: 2 }}>ล้าง</span>
                    </button>
                  );
                }

                if (btn.num === "backspace") {
                  return (
                    <button
                      key="backspace"
                      type="button"
                      className="keypad-btn action-btn"
                      onClick={() => handleKeypadPress("backspace")}
                      title="ลบตัวเลขล่าสุด"
                    >
                      <Delete size={18} />
                    </button>
                  );
                }

                return (
                  <button
                    key={btn.num}
                    type="button"
                    className="keypad-btn number-btn"
                    onClick={() => handleKeypadPress(btn.num)}
                  >
                    <span className="keypad-num">{btn.num}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: "100%",
              height: 44,
              fontSize: "0.95rem",
              marginTop: 16,
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
            disabled={submitting || !email.trim() || !isPasscodeComplete}
          >
            <span>{submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div
          style={{
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid #e2ece6",
            textAlign: "center",
            fontSize: "0.82rem",
            color: "#52796f",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div>
            <span>ยังไม่มีบัญชีผู้ใช้งาน? </span>
            <Link to="/register" style={{ color: "#059669", fontWeight: 700, textDecoration: "none" }}>
              สมัครสมาชิกใหม่
            </Link>
          </div>
          <div>
            <Link to="/scan" style={{ color: "#64748b", textDecoration: "none", fontSize: "0.78rem" }}>
              สแกน QR ตรวจสอบครุภัณฑ์ (ไม่ต้องเข้าสู่ระบบ)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
