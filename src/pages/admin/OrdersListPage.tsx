import { useState } from "react";
import { Link } from "react-router";
import { PlusCircle } from "lucide-react";
import { useOrders } from "@/api/orders";
import { useServiceTypes } from "@/api/serviceTypes";
import { useTechnicians } from "@/api/users";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageSkeleton } from "@/components/common/LoadingState";
import { PaginationBar } from "@/components/common/PaginationBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import type { OrderStatus } from "@/types/api";
import { format } from "date-fns";
import { useAuthStore } from "@/stores/auth";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "job_done", label: "Job Done" },
  { value: "reviewed", label: "Reviewed" },
  { value: "closed", label: "Closed" },
];

export default function OrdersListPage() {
  const role = useAuthStore((s) => s.user?.role);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [technicianId, setTechnicianId] = useState("all");
  const [serviceTypeId, setServiceTypeId] = useState("all");
  const [hasPayment, setHasPayment] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useOrders({
    search: search || undefined,
    status: status === "all" ? undefined : (status as OrderStatus),
    assigned_technician:
      technicianId === "all" ? undefined : Number(technicianId),
    service_type: serviceTypeId === "all" ? undefined : Number(serviceTypeId),
    has_payment: hasPayment === "all" ? undefined : hasPayment === "true",
    page,
  });

  const { data: serviceTypes } = useServiceTypes();
  const { data: technicians } = useTechnicians();

  if (isLoading) return <PageSkeleton />;
  if (isError) return <ErrorState onRetry={() => refetch()} />;

  const orders = data?.results ?? [];

  return (
    <div>
      <PageHeader
        title="Orders"
        description={`${data?.count ?? 0} total orders`}
        action={
          role === "admin" ? (
            <Button asChild>
              <Link to="/orders/new">
                <PlusCircle className="mr-2 size-4" />
                New Order
              </Link>
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Input
          placeholder="Search order, customer, phone…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="h-9 w-full sm:w-64"
        />
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {serviceTypes && serviceTypes.length > 0 && (
          <Select
            value={serviceTypeId}
            onValueChange={(v) => {
              setServiceTypeId(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Service type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {serviceTypes.map((st) => (
                <SelectItem key={st.id} value={String(st.id)}>
                  {st.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {technicians && technicians.length > 0 && (
          <Select
            value={technicianId}
            onValueChange={(v) => {
              setTechnicianId(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Technician" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All technicians</SelectItem>
              {technicians.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.first_name || t.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={hasPayment}
          onValueChange={(v) => {
            setHasPayment(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payments</SelectItem>
            <SelectItem value="true">Paid</SelectItem>
            <SelectItem value="false">Unpaid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order No</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Technician</TableHead>
              <TableHead className="text-right">Quoted</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <EmptyState
                    title="No orders found"
                    description="Try adjusting your filters."
                  />
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => window.location.assign(`/orders/${order.id}`)}
                >
                  <TableCell className="font-mono text-sm font-medium text-primary">
                    {order.order_no}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">
                      {order.customer_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {order.customer_phone}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {order.service_type?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.status as OrderStatus} />
                  </TableCell>
                  <TableCell className="text-sm">
                    {order.assigned_technician ? (
                      order.assigned_technician.first_name ||
                      order.assigned_technician.username
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    RM {parseFloat(order.quoted_price).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(order.created_at), "dd MMM yyyy")}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {orders.length === 0 ? (
          <EmptyState
            title="No orders found"
            description="Try adjusting your filters."
          />
        ) : (
          orders.map((order) => (
            <Link key={order.id} to={`/orders/${order.id}`}>
              <Card className="hover:bg-muted/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-sm font-semibold text-primary">
                        {order.order_no}
                      </p>
                      <p className="font-medium text-sm mt-0.5">
                        {order.customer_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.customer_phone}
                      </p>
                    </div>
                    <StatusBadge status={order.status as OrderStatus} />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{order.service_type?.name ?? "—"}</span>
                    <span>RM {parseFloat(order.quoted_price).toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>

      <PaginationBar
        page={page}
        count={data?.count ?? 0}
        onPageChange={setPage}
      />
    </div>
  );
}
