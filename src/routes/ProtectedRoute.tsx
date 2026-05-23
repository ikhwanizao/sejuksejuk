import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/stores/auth";

export function ProtectedRoute() {
  const { access, user } = useAuthStore();
  if (!access || !user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
