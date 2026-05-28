import { Routes, Route, Navigate } from "react-router";
import { useAuthStore } from "@/stores/auth";
import { ProtectedRoute } from "./ProtectedRoute";
import { RoleGate } from "./RoleGate";

import LoginPage from "@/pages/LoginPage";
import NotFound from "@/pages/NotFound";
import Forbidden from "@/pages/Forbidden";

import AppShell from "@/components/layout/AppShell";

// Admin pages
import OrdersListPage from "@/pages/admin/OrdersListPage";
import NewOrderPage from "@/pages/admin/NewOrderPage";
import OrderDetailPage from "@/pages/admin/OrderDetailPage";

// Technician pages
import JobsListPage from "@/pages/technician/JobsListPage";
import JobDetailPage from "@/pages/technician/JobDetailPage";
import CompleteJobPage from "@/pages/technician/CompleteJobPage";

// Shared pages
import ProfilePage from "@/pages/ProfilePage";

// KPI Dashboard
import KpiDashboardPage from "@/pages/kpi/KpiDashboardPage";

// AI Assistant
import AiAssistantPage from "@/pages/admin/AiAssistantPage";

function RoleRedirect() {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "technician") return <Navigate to="/jobs" replace />;
  return <Navigate to="/kpi" replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<Forbidden />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<RoleRedirect />} />

          {/* Admin & Manager routes */}
          <Route element={<RoleGate allow={["admin", "manager"]} />}>
            <Route path="/orders" element={<OrdersListPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
          </Route>

          {/* Admin-only */}
          <Route element={<RoleGate allow={["admin"]} />}>
            <Route path="/orders/new" element={<NewOrderPage />} />
          </Route>

          {/* Technician routes */}
          <Route element={<RoleGate allow={["technician"]} />}>
            <Route path="/jobs" element={<JobsListPage />} />
            <Route path="/jobs/:id" element={<JobDetailPage />} />
            <Route path="/jobs/:id/complete" element={<CompleteJobPage />} />
          </Route>

          {/* Admin & Manager — KPI Dashboard */}
          <Route element={<RoleGate allow={["admin", "manager"]} />}>
            <Route path="/kpi" element={<KpiDashboardPage />} />
          </Route>

          {/* Admin & Manager — AI Assistant */}
          <Route element={<RoleGate allow={["admin", "manager"]} />}>
            <Route path="/ai" element={<AiAssistantPage />} />
          </Route>

          {/* Shared routes (all authenticated roles) */}
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
