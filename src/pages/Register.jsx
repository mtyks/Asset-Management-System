import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import {
  ShieldCheck,
  Mail,
  User,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Delete,
  RotateCcw,
  Lock,
  ChevronLeft,
} from "lucide-react";

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");

  // Passcode state: 6 digits
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [activeStep, setActiveStep] = useState("set"); // 'set' | 'confirm'

  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Keypad definitions like a phone lock screen
  const KEYPAD_BUTTONS = [
    { num: "1", sub: "" },
    { num: "2", sub: "ABC" },
    { num: "3", sub: "DEF" },
    { num: "4", sub: "GHI" },
    { num: "5", sub: "JKL" },
    { num: "6", sub: "MNO" },
    { num: "7", sub: "PQRS" },
    { num: "8", sub: "TUV" },
    { num: "9", sub: "WXYZ" },
    { num: "clear", label: "ล้าง" },
    { num: "0", sub: "+" },
    { num: "backspace", label: "⌫" },
  ];

  // Handle Keypad Press
  const handleKeypadPress = (key) => {
    setError(null);
    if (key === "clear") {
      if (activeStep === "set") {
        setPasscode("");
      } else {
        setConfirmPasscode("");
      }
      return;
    }

    if (key === "backspace") {
      if (activeStep === "set") {
        setPasscode((prev) => prev.slice(0, -1));
      } else {
        setConfirmPasscode((prev) => prev.slice(0, -1));
      }
      return;
    }

    // Number pressed
    if (activeStep === "set") {
      if (passcode.length < 6) {
        const next = passcode + key;
        setPasscode(next);
        if (next.length === 6) {
          // Auto switch to confirm step after short delay
          setTimeout(() => {
            setActiveStep("confirm");
          }, 250);
        }
      }
    } else {
      if (confirmPasscode.length < 6) {
        const next = confirmPasscode + key;
        setConfirmPasscode(next);
      }
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
  }, [activeStep, passcode, confirmPasscode]);

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("กรุณากรอกอีเมลผู้ใช้งาน");
      return;
    }

    if (passcode.length !== 6) {
      setError("กรุณากำหนดรหัส Passcode ให้ครบ 6 หลัก");
      setActiveStep("set");
      return;
    }

    if (confirmPasscode.length !== 6) {
      setError("กรุณายืนยันรหัส Passcode ให้ครบ 6 หลัก");
      setActiveStep("confirm");
      return;
    }

    if (passcode !== confirmPasscode) {
      setError("รหัส Passcode ยืนยันไม่ตรงกับรหัสที่ตั้งไว้ กรุณาลองใหม่อีกครั้ง");
      setConfirmPasscode("");
      setActiveStep("confirm");
      return;
    }

    setSubmitting(true);
    try {
      const res = await signUp(email.trim(), passcode, {
        full_name: fullName.trim() || "ผู้ใช้งานใหม่",
      });

      if (res?.error) {
        throw res.error;
      }

      setSuccessMessage(res?.warning || "สมัครสมาชิกสำเร็จ! กำลังนำท่านเข้าสู่ระบบ...");
      setTimeout(() => {
        navigate("/", { replace: true });
      }, 1800);
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("Failed to fetch") || msg.includes("fetch failed")) {
        setError("ไม่สามารถเชื่อมต่อฐานข้อมูลได้ (โปรเจกต์ Supabase อาจอยู่ในสถานะ Pause)");
      } else {
        setError(msg || "เกิดข้อผิดพลาดในการสมัครสมาชิก กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isPasscodeComplete = passcode.length === 6;
  const isConfirmComplete = confirmPasscode.length === 6;
  const isPasscodeMatched = isPasscodeComplete && isConfirmComplete && passcode === confirmPasscode;

  return (
    <div className="passcode-register-container">
      <div className="passcode-card">
        {/* Top Header */}
        <div className="passcode-card-header">
          <Link to="/" className="passcode-back-link">
            <ChevronLeft size={16} />
            <span>กลับหน้าหลัก</span>
          </Link>

          <div className="passcode-icon-badge">
            <ShieldCheck size={28} />
          </div>

          <h2 className="passcode-title">สมัครสมาชิกผู้ใช้งานใหม่</h2>
          <p className="passcode-subtitle">
            กำหนดอีเมลและรหัส Passcode 6 หลักเพื่อเข้าใช้งานระบบ
          </p>
        </div>

        {error && (
          <div className="form-error-banner" style={{ margin: "0 0 16px" }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div
            style={{
              backgroundColor: "#ecfdf5",
              color: "#065f46",
              border: "1px solid #a7f3d0",
              borderRadius: "10px",
              padding: "14px",
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: "0.88rem",
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={20} color="#059669" style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* User Email & Name Inputs */}
          <div className="form-group" style={{ marginBottom: 12 }}>
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

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e3a2f" }}>
              ชื่อ - นามสกุล (Full Name)
            </label>
            <div style={{ position: "relative" }}>
              <User
                size={16}
                color="#64748b"
                style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
              />
              <input
                type="text"
                className="form-control"
                placeholder="เช่น สมศรี พูนสุข"
                style={{ paddingLeft: 36, height: 40 }}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          </div>

          {/* Passcode Lock Screen Section */}
          <div className="passcode-screen-box">
            {/* Step Selector Tabs */}
            <div className="passcode-step-tabs">
              <button
                type="button"
                className={`passcode-step-tab ${activeStep === "set" ? "active" : ""}`}
                onClick={() => setActiveStep("set")}
              >
                <span>1. ตั้งรหัส PIN</span>
                {isPasscodeComplete && <CheckCircle2 size={13} color="#059669" />}
              </button>
              <button
                type="button"
                className={`passcode-step-tab ${activeStep === "confirm" ? "active" : ""}`}
                onClick={() => {
                  if (isPasscodeComplete) setActiveStep("confirm");
                  else setError("กรุณากำหนดรหัส PIN ขั้นตอนที่ 1 ให้ครบ 6 หลักก่อน");
                }}
              >
                <span>2. ยืนยันรหัส PIN</span>
                {isPasscodeMatched && <CheckCircle2 size={13} color="#059669" />}
              </button>
            </div>

            {/* Instruction Prompt */}
            <div className="passcode-prompt-text">
              {activeStep === "set" ? (
                <>
                  <Lock size={14} />
                  <span>กดรหัส Passcode 6 หลัก</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={14} />
                  <span>กดรหัส Passcode อีกครั้งเพื่อยืนยัน</span>
                </>
              )}
            </div>

            {/* 6 Dots Indicator */}
            <div className="passcode-dots-row">
              {Array.from({ length: 6 }).map((_, idx) => {
                const currentVal = activeStep === "set" ? passcode : confirmPasscode;
                const isFilled = idx < currentVal.length;
                return (
                  <div
                    key={idx}
                    className={`passcode-dot ${isFilled ? "filled" : ""} ${
                      isPasscodeMatched && activeStep === "confirm" ? "matched" : ""
                    }`}
                  />
                );
              })}
            </div>

            {/* Match feedback text */}
            {activeStep === "confirm" && isConfirmComplete && (
              <div
                style={{
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: isPasscodeMatched ? "#059669" : "#dc2626",
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {isPasscodeMatched ? (
                  <>
                    <CheckCircle2 size={15} />
                    <span>รหัส Passcode ตรงกันถูกต้อง</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={15} />
                    <span>รหัสไม่ตรงกัน กรุณากดใหม่</span>
                  </>
                )}
              </div>
            )}

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
                    {btn.sub && <span className="keypad-sub">{btn.sub}</span>}
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
            disabled={submitting || !email.trim() || !isPasscodeMatched}
          >
            <span>{submitting ? "กำลังบันทึก..." : "ยืนยันการสมัครสมาชิก"}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        {/* Footer Login Link */}
        <div className="passcode-card-footer">
          <span>มีบัญชีผู้ใช้งานอยู่แล้ว?</span>{" "}
          <Link to="/login" className="passcode-login-link">
            เข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  );
}
