import { NavLink } from "react-router";
import { ClipboardList, PlusCircle, Briefcase, BarChart3 } from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";

const adminLinks = [
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/orders/new", label: "New Order", icon: PlusCircle },
  { to: "/kpi", label: "KPI", icon: BarChart3 },
];

const managerLinks = [
  { to: "/orders", label: "Orders", icon: ClipboardList },
  { to: "/kpi", label: "KPI", icon: BarChart3 },
];

const technicianLinks = [{ to: "/jobs", label: "My Jobs", icon: Briefcase }];

export default function SideNav() {
  const role = useAuthStore((s) => s.user?.role);
  const links =
    role === "technician"
      ? technicianLinks
      : role === "manager"
        ? managerLinks
        : adminLinks;

  return (
    <nav className="flex flex-col gap-1 p-3 w-full">
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/orders"}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )
          }
        >
          <Icon className="size-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
