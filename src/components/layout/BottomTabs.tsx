import { NavLink } from "react-router";
import { ClipboardList, PlusCircle, Briefcase, BarChart3 } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";

const adminTabs = [
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/orders/new", label: "New", icon: PlusCircle },
  { to: "/kpi", label: "KPI", icon: BarChart3 },
];

const managerTabs = [
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/kpi", label: "KPI", icon: BarChart3 },
];

const technicianTabs = [{ to: "/jobs", label: "Jobs", icon: Briefcase }];

export default function BottomTabs() {
  const role = useAuthStore((s) => s.user?.role);
  const tabs =
    role === "technician"
      ? technicianTabs
      : role === "manager"
        ? managerTabs
        : adminTabs;

  return (
    <nav className="border-t bg-background flex">
      {tabs.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/orders"}
          className={({ isActive }) =>
            cn(
              "flex-1 flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors",
              isActive ? "text-primary" : "text-muted-foreground",
            )
          }
        >
          <Icon className="size-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
