import { Outlet } from "react-router";
import TopBar from "./TopBar";
import SideNav from "./SideNav";
import BottomTabs from "./BottomTabs";

export default function AppShell() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop side nav */}
        <aside className="hidden md:flex w-56 shrink-0 border-r bg-muted/30">
          <SideNav />
        </aside>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          <Outlet />
        </main>
      </div>
      {/* Mobile bottom tabs */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-30">
        <BottomTabs />
      </div>
    </div>
  );
}
