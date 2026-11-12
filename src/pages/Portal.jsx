import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, ROLE_LABELS } from "../lib/AuthContext";
import {
  Package,
  Wrench,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  LogOut,
  User,
  Lock,
  Users,
  Check,
  X,
  Cloud,
} from "lucide-react";

export default function Portal() {
  const {
    user,
    userRole,
    usersList,
    isUsersCloudSynced,
    refreshUsersList,
    updateUserRoleAndStatus,
    deleteUserByEmail,
    signOut,
  } = useAuth();
  const navigate = useNavigate();
  const [showUserMgmtModal, setShowUserMgmtModal] = useState(false);

  const isAdmin = Boolean(user && userRole === "admin");
  const isEmployeeOnly = Boolean(user && userRole === "employee");
  const pendingUsersCount = (usersList || []).filter(
    (u) => u.approval_status === "pending"
  ).length;

  // Handle entering systems: redirect to login if not authenticated
  const handleEnterSystem = (destination) => {
    if (user) {
      if (destination === "/dashboard" && isEmployeeOnly) {
        alert(
          "จำกัดสิทธิ์การเข้าถึง: ระบบบริหารจัดการทะเบียนครุภัณฑ์เปิดให้เฉพาะ 'แอดมิน (Admin)' และ 'ช่างเทคนิค (Technician)' เท่านั้น"
        );
        return;
      }
      navigate(destination);
    } else {
      navigate("/login", { state: { from: { pathname: destination } } });
    }
  };

  return (
    <div className="portal-container">
      {/* Top Navigation Bar */}
      <header className="portal-topbar">
        <div className="portal-topbar-inner">
          <div className="portal-brand">
            <div className="portal-brand-badge">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="portal-brand-title">ระบบบริการและบริหารจัดการองค์กร</div>
              <div className="portal-brand-sub">Enterprise Management & Service Portal</div>
            </div>
          </div>

          <div className="portal-topbar-right">
            <div className="budget-year-badge">
              <Calendar size={13} style={{ color: "#64748b" }} />
              <span>ปีงบประมาณ 2569</span>
            </div>

            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: "0.82rem",
                    color: "#064e3b",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <User size={14} color="#059669" />
                  <span>{user.user_metadata?.full_name || user.email}</span>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 999,
                      backgroundColor:
                        user.role === "admin"
                          ? "#ecfdf5"
                          : user.role === "technician"
                          ? "#e0f2fe"
                          : "#f3e8ff",
                      color:
                        user.role === "admin"
                          ? "#059669"
                          : user.role === "technician"
                          ? "#0284c7"
                          : "#6d28d9",
                      border: "1px solid rgba(15, 23, 42, 0.08)",
                    }}
                  >
                    {ROLE_LABELS[user.role] || ROLE_LABELS.employee}
                  </span>
                </span>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      refreshUsersList?.();
                      setShowUserMgmtModal(true);
                    }}
                    className="btn btn-outline-white"
                    style={{
                      fontSize: "0.78rem",
                      padding: "5px 12px",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      borderColor: pendingUsersCount > 0 ? "#f59e0b" : "#cbd5e1",
                      backgroundColor: pendingUsersCount > 0 ? "#fffbeb" : "#ffffff",
                      color: pendingUsersCount > 0 ? "#92400e" : "#0f172a",
                      fontWeight: 700,
                    }}
                    title="อนุมัติผู้สมัครใหม่และกำหนดสิทธิ์ผู้ใช้งาน 3 ระดับ"
                  >
                    <Users size={14} color={pendingUsersCount > 0 ? "#d97706" : "#059669"} />
                    <span>จัดการผู้ใช้ / อนุมัติสิทธิ์</span>
                    {pendingUsersCount > 0 && (
                      <span
                        style={{
                          backgroundColor: "#dc2626",
                          color: "#fff",
                          fontSize: "0.68rem",
                          fontWeight: 800,
                          padding: "1px 6px",
                          borderRadius: 999,
                        }}
                      >
                        รออนุมัติ {pendingUsersCount}
                      </span>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={signOut}
                  className="btn btn-outline-white"
                  style={{ fontSize: "0.78rem", padding: "5px 12px", display: "flex", alignItems: "center", gap: 4 }}
                  title="ออกจากระบบ"
                >
                  <LogOut size={13} />
                  <span>ออกจากระบบ</span>
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Link
                  to="/login"
                  className="btn btn-outline-white"
                  style={{ fontSize: "0.82rem", padding: "6px 14px" }}
                >
                  เข้าสู่ระบบ
                </Link>
                <Link
                  to="/register"
                  className="btn btn-primary"
                  style={{ fontSize: "0.82rem", padding: "6px 16px" }}
                >
                  สมัครสมาชิก
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Hero & System Selection Content */}
      <main className="portal-main">
        {/* Title Group */}
        <div className="portal-hero-section">
          <div className="portal-tagline">
            <span className="portal-dot-pulse" />
            <span>ระบบศูนย์กลางงานสารสนเทศและบริหารพัสดุ</span>
          </div>
          <h1 className="portal-hero-title">
            เลือกเข้าสู่ระบบงานที่ต้องการใช้งาน
          </h1>
          <p className="portal-hero-subtitle">
            เข้าถึงระบบบริหารจัดการครุภัณฑ์และระบบแจ้งซ่อมบำรุงรักษาแบบครบวงจร สะดวกรวดเร็วและแม่นยำ
          </p>
        </div>

        {/* The 2 Master System Cards Grid */}
        <div className="portal-cards-grid">
          {/* System 1: Asset Management System */}
          <div className="portal-system-card emerald">
            <div className="portal-card-icon-box emerald">
              <Package size={36} />
            </div>

            <div className="portal-card-content">
              <div className="portal-card-category">ระบบหลักงานพัสดุ</div>
              <h2 className="portal-card-title">ระบบบริหารจัดการครุภัณฑ์</h2>
              <div className="portal-card-sub-en">Asset & Inventory Management System</div>

              <p className="portal-card-desc">
                จัดการบัญชีและทะเบียนครุภัณฑ์ ตรวจนับสินทรัพย์ด้วย QR Code ผังสถานที่ประจำตึก-ห้อง บันทึกการยืม-คืน และนำเข้า/ส่งออกรายงาน CSV
              </p>

              <div className="portal-feature-pills">
                <span className="portal-pill">
                  <CheckCircle2 size={13} />
                  <span>ตรวจนับ QR Code</span>
                </span>
                <span className="portal-pill">
                  <CheckCircle2 size={13} />
                  <span>ระบบ ยืม - คืน</span>
                </span>
                <span className="portal-pill">
                  <CheckCircle2 size={13} />
                  <span>นำเข้า / ส่งออก CSV</span>
                </span>
                <span className="portal-pill">
                  <CheckCircle2 size={13} />
                  <span>ผังอาคาร &amp; ห้อง</span>
                </span>
              </div>
            </div>

            <div className="portal-card-action">
              {isEmployeeOnly ? (
                <button
                  type="button"
                  className="portal-enter-btn emerald"
                  style={{
                    width: "100%",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#f1f5f9",
                    color: "#64748b",
                    cursor: "not-allowed",
                    boxShadow: "none",
                  }}
                  onClick={() => handleEnterSystem("/dashboard")}
                  title="เฉพาะแอดมินและช่างเทคนิคเท่านั้น"
                >
                  <Lock size={16} />
                  <span>เฉพาะแอดมิน / เจ้าหน้าที่พัสดุ</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="portal-enter-btn emerald"
                  style={{ width: "100%", border: "none", cursor: "pointer" }}
                  onClick={() => handleEnterSystem("/dashboard")}
                >
                  <span>เข้าสู่ระบบครุภัณฑ์</span>
                  <ArrowRight size={18} />
                </button>
              )}
            </div>
          </div>

          {/* System 2: Maintenance & Repair System */}
          <div className="portal-system-card teal">
            <div className="portal-card-icon-box teal">
              <Wrench size={36} />
            </div>

            <div className="portal-card-content">
              <div className="portal-card-category">ระบบบริการซ่อมบำรุง</div>
              <h2 className="portal-card-title">ระบบแจ้งซ่อมและบำรุงรักษา</h2>
              <div className="portal-card-sub-en">Maintenance & Repair Service System</div>

              <p className="portal-card-desc">
                ส่งคำขอแจ้งซ่อมครุภัณฑ์และอุปกรณ์ชำรุด ติดตามสถานะงานซ่อมแบบ Real-time บันทึกการดำเนินงานของช่าง และประเมินประวัติการซ่อมบำรุง
              </p>

              <div className="portal-feature-pills">
                <span className="portal-pill">
                  <CheckCircle2 size={13} />
                  <span>แจ้งซ่อมด่วนออนไลน์</span>
                </span>
                <span className="portal-pill">
                  <CheckCircle2 size={13} />
                  <span>ติดตามสถานะงานซ่อม</span>
                </span>
                <span className="portal-pill">
                  <CheckCircle2 size={13} />
                  <span>ประวัติการบำรุงรักษา</span>
                </span>
                <span className="portal-pill">
                  <CheckCircle2 size={13} />
                  <span>มอบหมายงานช่าง</span>
                </span>
              </div>
            </div>

            <div className="portal-card-action">
              <button
                type="button"
                className="portal-enter-btn teal"
                style={{ width: "100%", border: "none", cursor: "pointer" }}
                onClick={() => handleEnterSystem("/maintenance")}
              >
                <span>เข้าสู่ระบบแจ้งซ่อม</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="portal-footer">
        <p>© 2569 ระบบบริหารจัดการครุภัณฑ์และบริการซ่อมบำรุงองค์กร สงวนลิขสิทธิ์</p>
      </footer>

      {/* Admin User Approval & 3-Role Permission Management Modal */}
      {showUserMgmtModal && isAdmin && (
        <div
          className="modal-overlay"
          onClick={() => setShowUserMgmtModal(false)}
        >
          <div
            className="modal-content"
            style={{ maxWidth: "760px", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    backgroundColor: "#fef3c7",
                    color: "#b45309",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Users size={20} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <h3 className="modal-title" style={{ margin: 0 }}>
                      จัดการผู้ใช้งานและอนุมัติสิทธิ์ (Admin Role Management)
                    </h3>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 999,
                        backgroundColor: isUsersCloudSynced ? "#ecfdf5" : "#f1f5f9",
                        color: isUsersCloudSynced ? "#059669" : "#475569",
                      }}
                    >
                      <Cloud size={12} />
                      {isUsersCloudSynced
                        ? "ซิงค์ตาราง app_users บน Supabase แล้ว"
                        : "ซิงค์อัตโนมัติ (Local + Supabase Auth)"}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    อนุมัติผู้สมัครใหม่และกำหนดสิทธิ์การใช้งาน 3 ระดับ: แอดมิน / ช่าง / พนักงาน
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="action-btn-link"
                onClick={() => setShowUserMgmtModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 14,
                fontSize: "0.79rem",
                color: "#334155",
                lineHeight: 1.5,
              }}
            >
              <strong>สรุปขอบเขตสิทธิ์ทั้ง 3 ระดับ:</strong>
              <div style={{ marginTop: 4, display: "grid", gap: 3 }}>
                <div>
                  • <strong>แอดมิน (Admin):</strong> เข้าได้ทั้ง 2 ระบบ อนุมัติผู้สมัครใหม่ กำหนดสิทธิ์ อัปเดตสถานะงานซ่อม และลบใบงานได้
                </div>
                <div>
                  • <strong>ช่าง (Technician):</strong> เข้าได้ทั้ง 2 ระบบ รับงานซ่อม อัปเดตสถานะ บันทึกค่าซ่อม/อะไหล่/รูปหลังซ่อม (ลบใบงานไม่ได้)
                </div>
                <div>
                  • <strong>พนักงาน (Employee):</strong> เข้าได้เฉพาะระบบแจ้งซ่อม สแกน QR ติดตามสถานะ และยกเลิกได้เฉพาะใบงานที่รอดำเนินการ
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {(usersList || []).map((u) => {
                const isPending = u.approval_status === "pending";
                const isSuspended = u.approval_status === "suspended";
                const isSelf =
                  (u.email || "").toLowerCase() ===
                  (user?.email || "").toLowerCase();

                return (
                  <div
                    key={u.id || u.email}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                      padding: "12px 14px",
                      borderRadius: 10,
                      border: `1px solid ${
                        isPending
                          ? "#fde68a"
                          : isSuspended
                          ? "#fecaca"
                          : "#e2e8f0"
                      }`,
                      backgroundColor: isPending
                        ? "#fffbeb"
                        : isSuspended
                        ? "#fef2f2"
                        : "#ffffff",
                    }}
                  >
                    <div style={{ minWidth: 210, flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <strong style={{ fontSize: "0.9rem", color: "#0f172a" }}>
                          {u.full_name || "ไม่ระบุชื่อ"}
                        </strong>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 999,
                            backgroundColor: isPending
                              ? "#fef3c7"
                              : isSuspended
                              ? "#fee2e2"
                              : "#dcfce7",
                            color: isPending
                              ? "#b45309"
                              : isSuspended
                              ? "#b91c1c"
                              : "#15803d",
                          }}
                        >
                          {isPending
                            ? "รออนุมัติ"
                            : isSuspended
                            ? "ระงับสิทธิ์"
                            : "อนุมัติแล้ว"}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "0.76rem",
                          color: "#64748b",
                          marginTop: 2,
                        }}
                      >
                        อีเมล: {u.email} | รหัสเข้าใช้งาน:{" "}
                        <code
                          style={{
                            backgroundColor: "#f1f5f9",
                            padding: "1px 5px",
                            borderRadius: 4,
                            color: "#0f172a",
                            fontWeight: 700,
                          }}
                        >
                          {u.passcode}
                        </code>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <select
                        className="form-control"
                        style={{
                          width: "auto",
                          minWidth: 135,
                          padding: "5px 10px",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                        }}
                        value={u.role || "employee"}
                        onChange={(e) =>
                          updateUserRoleAndStatus(u.email, {
                            role: e.target.value,
                          })
                        }
                      >
                        <option value="employee">สิทธิ์: พนักงาน</option>
                        <option value="technician">สิทธิ์: ช่าง</option>
                        <option value="admin">สิทธิ์: แอดมิน</option>
                      </select>

                      {isPending ? (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{
                            padding: "5px 12px",
                            fontSize: "0.78rem",
                            backgroundColor: "#059669",
                          }}
                          onClick={() =>
                            updateUserRoleAndStatus(u.email, {
                              approval_status: "approved",
                            })
                          }
                        >
                          <Check size={14} />
                          <span>อนุมัติใช้งาน</span>
                        </button>
                      ) : (
                        !isSelf && (
                          <button
                            type="button"
                            className="action-btn-link"
                            style={{ fontSize: "0.76rem" }}
                            onClick={() =>
                              updateUserRoleAndStatus(u.email, {
                                approval_status: isSuspended
                                  ? "approved"
                                  : "suspended",
                              })
                            }
                          >
                            {isSuspended ? "คืนสิทธิ์ใช้งาน" : "ระงับสิทธิ์"}
                          </button>
                        )
                      )}

                      {!isSelf && (
                        <button
                          type="button"
                          className="action-btn-link danger"
                          style={{ fontSize: "0.76rem" }}
                          onClick={() => {
                            if (
                              window.confirm(
                                `ยืนยันการลบบัญชีผู้ใช้ ${u.full_name} (${u.email})?`
                              )
                            ) {
                              deleteUserByEmail(u.email);
                            }
                          }}
                        >
                          ลบ
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="form-actions" style={{ marginTop: 18 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowUserMgmtModal(false)}
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
