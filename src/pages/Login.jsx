import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = location.state?.from?.pathname || "/";

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await signIn(email, password);
    setSubmitting(false);
    if (signInError) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้สร้างผู้ใช้ใน Supabase");
      return;
    }
    navigate(redirectTo, { replace: true });
  }

  // Demo Login Helper
  const fillDemo = () => {
    setEmail("admin@organization.go.th");
    setPassword("password123");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#f6faf8",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          border: "1px solid #e2ece6",
          boxShadow: "0 10px 25px -5px rgba(6, 46, 36, 0.08)",
          padding: "36px 28px",
        }}
      >
        {/* Brand Header without Icon */}
        <div style={{ textAlign: "center", marginBottom: 26 }}>
          <h2 style={{ margin: "0 0 6px", fontSize: "1.25rem", fontWeight: 800, color: "#0f291e", letterSpacing: "-0.01em" }}>
            ระบบบริหารจัดการครุภัณฑ์
          </h2>
          <span style={{ fontSize: "0.85rem", color: "#52796f" }}>
            เข้าสู่ระบบสำหรับเจ้าหน้าที่พัสดุ
          </span>
        </div>

        {error && <div className="form-error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>อีเมลผู้ใช้งาน</label>
            <input
              type="email"
              className="form-control"
              placeholder="name@organization.go.th"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label>รหัสผ่าน</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", height: 42, fontSize: "0.92rem", marginBottom: 14 }}
            disabled={submitting}
          >
            <span>{submitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button
            type="button"
            onClick={fillDemo}
            style={{
              fontSize: "0.78rem",
              color: "#059669",
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            ใช้ข้อมูลจำลอง (Demo Auto-fill)
          </button>
        </div>

        <div
          style={{
            marginTop: 20,
            paddingTop: 16,
            borderTop: "1px solid #e2ece6",
            textAlign: "center",
            fontSize: "0.8rem",
            color: "#52796f",
          }}
        >
          <Link to="/scan" style={{ color: "#059669", fontWeight: 600 }}>
            สแกน QR ตรวจสอบครุภัณฑ์ (ไม่ต้องเข้าสู่ระบบ)
          </Link>
        </div>
      </div>
    </div>
  );
}
