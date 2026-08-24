import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="page-loading">กำลังตรวจสอบสิทธิ์...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
