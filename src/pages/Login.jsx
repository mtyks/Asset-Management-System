import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { Box, Lock, Mail, ArrowRight, ShieldCheck } from "lucide-react";

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
    <div className="auth-wrapper">
      <div className="auth-card-modern">
        {/* Brand Header */}
        <div className="auth-logo-header">
          <div className="sidebar-logo-icon">
            <Box size={24} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "#0f172a" }}>
              ระบบบริหารจัดการครุภัณฑ์
            </h2>
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
              เข้าสู่ระบบสำหรับเจ้าหน้าที่พัสดุ
            </span>
          </div>
        </div>

        {error && <div className="form-error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>อีเมลผู้ใช้งาน</label>
            <div style={{ position: "relative" }}>
              <input
                type="email"
                className="form-control"
                placeholder="name@organization.go.th"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
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
              color: "#2563eb",
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
            borderTop: "1px solid #e2e8f0",
            textAlign: "center",
            fontSize: "0.8rem",
            color: "#64748b",
          }}
        >
          <Link to="/scan" style={{ color: "#2563eb", fontWeight: 600 }}>
            สแกน QR ตรวจสอบครุภัณฑ์ (ไม่ต้องเข้าสู่ระบบ)
          </Link>
        </div>
      </div>
    </div>
  );
}
