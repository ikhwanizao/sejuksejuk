import { useNavigate } from "react-router";
import { useOrders } from "@/api/orders";
import { useAuthStore } from "@/stores/auth";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageSkeleton } from "@/components/common/LoadingState";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Order, OrderStatus } from "@/types/api";
import { MapPin, Phone } from "lucide-react";

const STATUS_GROUPS: { key: string; label: string; statuses: OrderStatus[] }[] =
  [
    { key: "todo", label: "To Do", statuses: ["assigned"] },
    { key: "inprogress", label: "In Progress", statuses: ["in_progress"] },
    {
      key: "done",
      label: "Done",
      statuses: ["job_done", "reviewed", "closed"],
    },
  ];

function JobCard({ order }: { order: Order }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(`/jobs/${order.id}`)}
      className="cursor-pointer"
    >
      <Card className="hover:bg-muted/30 transition-colors">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <span className="font-mono text-sm font-semibold text-primary">
              {order.order_no}
            </span>
            <StatusBadge status={order.status as OrderStatus} />
          </div>
          <div>
            <p className="font-medium text-sm">{order.customer_name}</p>
            <p className="text-xs text-muted-foreground">
              {order.service_type?.name ?? "—"}
            </p>
          </div>
          <div className="flex items-start gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3 mt-0.5 shrink-0" />
            <span className="line-clamp-1">{order.customer_address}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="size-3" />
            <a
              href={`tel:${order.customer_phone}`}
              className="hover:text-primary"
              onClick={(e) => e.stopPropagation()}
            >
              {order.customer_phone}
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function JobsListPage() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, isError, refetch } = useOrders({
    assigned_technician: user?.id,
  });

  if (isLoading) return <PageSkeleton rows={3} />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  const orders = data?.results ?? [];

  return (
    <div>
      <PageHeader
        title="My Jobs"
        description={`${orders.length} assigned jobs`}
      />

      <div className="space-y-6">
        {STATUS_GROUPS.map(({ key, label, statuses }) => {
          const group = orders.filter((o) =>
            statuses.includes(o.status as OrderStatus),
          );
          return (
            <div key={key}>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="font-medium text-sm">{label}</h2>
                <Badge variant="secondary" className="text-xs">
                  {group.length}
                </Badge>
              </div>
              {group.length === 0 ? (
                <p className="text-xs text-muted-foreground pl-1">
                  Nothing here.
                </p>
              ) : (
                <div className="space-y-2">
                  {group.map((order) => (
                    <JobCard key={order.id} order={order} />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {orders.length === 0 && (
          <EmptyState
            title="No jobs assigned"
            description="You don't have any active jobs right now."
          />
        )}
      </div>
    </div>
  );
}
