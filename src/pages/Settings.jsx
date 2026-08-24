import React, { useState } from "react";
import { Settings as SettingsIcon, Save, Database, Shield, Building, Globe } from "lucide-react";

export default function Settings() {
  const [orgName, setOrgName] = useState("กองเทคโนโลยีสารสนเทศและพัสดุ");
  const [budgetYear, setBudgetYear] = useState("2569");
  const [autoCodePrefix, setAutoCodePrefix] = useState("DEMO-2569-");
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="page-container">
      <div className="page-heading-row">
        <div className="page-title-group">
          <h1>ตั้งค่าระบบ</h1>
          <p className="page-subtitle">
            จัดการข้อมูลหน่วยงาน ปีงบประมาณ รูปแบบการสร้างรหัส และการเชื่อมต่อ
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "720px" }}>
        {saved && (
          <div
            style={{
              backgroundColor: "#ecfdf5",
              border: "1px solid #a7f3d0",
              color: "#059669",
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "0.88rem",
            }}
          >
            ✓ บันทึกการตั้งค่าระบบเรียบร้อยแล้ว
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="form-card">
            <h3 style={{ margin: "0 0 16px", fontSize: "1.05rem", fontWeight: 700 }}>
              ข้อมูลหน่วยงานและปีงบประมาณ
            </h3>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>ชื่อหน่วยงาน / องค์กร</label>
              <input
                type="text"
                className="form-control"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label>ปีงบประมาณปัจจุบัน</label>
              <select
                className="form-control"
                value={budgetYear}
                onChange={(e) => setBudgetYear(e.target.value)}
              >
                <option value="2569">2569 (ปัจจุบัน)</option>
                <option value="2568">2568</option>
                <option value="2567">2567</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label>คำนำหน้ารหัสครุภัณฑ์อัตโนมัติ (Code Prefix)</label>
              <input
                type="text"
                className="form-control"
                value={autoCodePrefix}
                onChange={(e) => setAutoCodePrefix(e.target.value)}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                <Save size={16} />
                <span>บันทึกการเปลี่ยนแปลง</span>
              </button>
            </div>
          </div>
        </form>

        <div className="form-card">
          <h3 style={{ margin: "0 0 16px", fontSize: "1.05rem", fontWeight: 700 }}>
            สถานะการเชื่อมต่อฐานข้อมูล (Database)
          </h3>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px",
              backgroundColor: "#f8fafc",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: "#10b981",
                }}
              />
              <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>Supabase PostgreSQL</span>
            </div>
            <span style={{ fontSize: "0.8rem", color: "#059669", fontWeight: 600 }}>
              พร้อมใช้งาน (Active)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
