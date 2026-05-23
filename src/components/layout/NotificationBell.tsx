import { Bell, X, Trash2 } from "lucide-react";
import { useNavigate } from "react-router";
import {
  useMyNotifications,
  useMarkAllRead,
  useClearAllNotifications,
  useClearNotification,
} from "@/api/notifications";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { useAuthStore } from "@/stores/auth";
import type { InAppNotification } from "@/types/api";

export default function NotificationBell() {
  const { data: notifications = [] } = useMyNotifications();
  const markAllRead = useMarkAllRead();
  const clearAll = useClearAllNotifications();
  const clearOne = useClearNotification();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  function getOrderPath(notif: InAppNotification) {
    if (user?.role === "technician") return `/jobs/${notif.order_id}`;
    return `/orders/${notif.order_id}`;
  }

  function handleOpenChange(open: boolean) {
    if (open && unreadCount > 0) {
      markAllRead.mutate();
    }
  }

  function handleNotifClick(notif: InAppNotification) {
    navigate(getOrderPath(notif));
  }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] flex items-center justify-center"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-1.5">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.preventDefault();
                clearAll.mutate();
              }}
            >
              <Trash2 className="size-3 mr-1" />
              Clear all
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No notifications
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`group flex items-start gap-2 px-3 py-2.5 border-b last:border-0 cursor-pointer hover:bg-accent transition-colors ${
                  notif.is_read ? "bg-background" : "bg-muted/50"
                }`}
                onClick={() => handleNotifClick(notif)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-primary">
                      {notif.order_no}
                    </span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDate(notif.created_at)}
                    </span>
                  </div>
                  <p className="text-xs text-foreground leading-snug line-clamp-2 mt-0.5">
                    {notif.message}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-5 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive mt-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearOne.mutate(notif.id);
                  }}
                >
                  <X className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
