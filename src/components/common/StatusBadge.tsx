import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/types/api";
import { cn } from "@/lib/utils";
import { STATUS_MAP } from "@/lib/orderStatus";

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { label, className } = STATUS_MAP[status] ?? {
    label: status,
    className: "",
  };
  return (
    <Badge
      variant="outline"
      className={cn("capitalize text-xs font-medium", className)}
    >
      {label}
    </Badge>
  );
}
