import { NavLink } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export default function Navbar() {
  const { user, signOut } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-brand">ระบบจัดการครุภัณฑ์</div>
      <nav className="navbar-links">
        <NavLink to="/scan" className={({ isActive }) => (isActive ? "active" : "")}>
          สแกน QR
        </NavLink>
        {user && (
          <>
            <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
              ภาพรวม
            </NavLink>
            <NavLink to="/assets" className={({ isActive }) => (isActive ? "active" : "")}>
              ครุภัณฑ์
            </NavLink>
            <NavLink to="/locations" className={({ isActive }) => (isActive ? "active" : "")}>
              ตึก/ชั้น/ห้อง
            </NavLink>
            <NavLink to="/categories" className={({ isActive }) => (isActive ? "active" : "")}>
              ประเภท
            </NavLink>
          </>
        )}
      </nav>
      <div className="navbar-auth">
        {user ? (
          <>
            <span className="navbar-user">{user.email}</span>
            <button className="btn btn-ghost" onClick={signOut}>
              ออกจากระบบ
            </button>
          </>
        ) : (
          <NavLink to="/login" className="btn btn-ghost">
            เจ้าหน้าที่เข้าสู่ระบบ
          </NavLink>
        )}
      </div>
    </header>
  );
}
