import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/stores/auth";
import type { Role } from "@/types/api";

interface RoleGateProps {
  allow: Role[];
}

export function RoleGate({ allow }: RoleGateProps) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to="/403" replace />;
  return <Outlet />;
}
