import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  UserPlus,
  CheckCircle,
  XCircle,
  Pencil,
  CreditCard,
} from "lucide-react";
import { format } from "date-fns";
import {
  useOrder,
  useReviewOrder,
  useCloseOrder,
  useUpdateOrder,
} from "@/api/orders";
import { useReport } from "@/api/reports";
import { useCreatePayment } from "@/api/payments";
import {
  useOrderNotifications,
  useRegenerateNotifications,
} from "@/api/notifications";
import { useAuthStore } from "@/stores/auth";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ErrorState } from "@/components/common/ErrorState";
import { PageSkeleton } from "@/components/common/LoadingState";
import { EmptyState } from "@/components/common/EmptyState";
import { WhatsAppButton } from "@/components/common/WhatsAppButton";
import { FilePreview } from "@/components/common/FilePreview";
import { AssignTechnicianDialog } from "./AssignTechnicianDialog";
import { OrderForm } from "./OrderForm";
import type { OrderFormValues } from "./orderSchema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { OrderStatus, PaymentMethod } from "@/types/api";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignKey, setAssignKey] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [reviewConfirm, setReviewConfirm] = useState(false);
  const [closeConfirm, setCloseConfirm] = useState(false);

  const { data: order, isLoading, isError, refetch } = useOrder(id);
  const { data: report } = useReport(id);
  const { data: notifications } = useOrderNotifications(id);
  const regenerateNotifs = useRegenerateNotifications(Number(id));

  const reviewOrder = useReviewOrder(Number(id));
  const closeOrder = useCloseOrder(Number(id));
  const updateOrder = useUpdateOrder(Number(id));

  const reportId = report?.id ?? 0;
  const createPayment = useCreatePayment(reportId, Number(id));
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");

  const canRecordPayment =
    report && !report.payment && ["admin", "manager"].includes(role ?? "");

  async function handleRecordPayment() {
    if (!paymentAmount) {
      toast.error("Please enter an amount");
      return;
    }
    try {
      await createPayment.mutateAsync({
        amount: paymentAmount,
        method: paymentMethod,
      });
      toast.success("Payment recorded");
      setPaymentAmount("");
    } catch {
      toast.error("Failed to record payment");
    }
  }

  if (isLoading) return <PageSkeleton rows={4} />;
  if (isError || !order) return <ErrorState onRetry={() => refetch()} />;

  const canAssign =
    role === "admin" &&
    ["new", "assigned", "in_progress"].includes(order.status);
  const canReview =
    (role === "admin" || role === "manager") && order.status === "job_done";
  const canClose =
    (role === "admin" || role === "manager") && order.status === "reviewed";
  const canEdit =
    role === "admin" && !["reviewed", "closed"].includes(order.status);

  async function handleEdit(values: OrderFormValues) {
    try {
      await updateOrder.mutateAsync({
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        customer_address: values.customer_address,
        problem_description: values.problem_description,
        service_type_id:
          values.service_type_id && values.service_type_id !== "none"
            ? Number(values.service_type_id)
            : null,
        quoted_price: values.quoted_price,
        admin_notes: values.admin_notes ?? "",
      });
      toast.success("Order updated");
      setEditOpen(false);
    } catch {
      toast.error("Failed to update order");
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/orders")}>
          <ArrowLeft className="mr-2 size-4" />
          Orders
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold font-mono">
              {order.order_no}
            </h1>
            <StatusBadge status={order.status as OrderStatus} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Created {format(new Date(order.created_at), "dd MMM yyyy, h:mm a")}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="mr-2 size-4" /> Edit
            </Button>
          )}
          {canAssign && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAssignKey((k) => k + 1);
                setAssignOpen(true);
              }}
            >
              <UserPlus className="mr-2 size-4" />{" "}
              {order.assigned_technician ? "Reassign" : "Assign"}
            </Button>
          )}
          {canReview && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReviewConfirm(true)}
            >
              <CheckCircle className="mr-2 size-4" /> Mark Reviewed
            </Button>
          )}
          {canClose && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCloseConfirm(true)}
            >
              <XCircle className="mr-2 size-4" /> Close Order
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="report">Report</TabsTrigger>
          <TabsTrigger value="notifications">
            Notifications
            {notifications && notifications.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {notifications.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Customer
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-medium">{order.customer_name}</p>
                <p>{order.customer_phone}</p>
                <p className="text-muted-foreground text-xs">
                  {order.customer_address}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Service & Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>{order.service_type?.name ?? "—"}</p>
                <p className="font-medium">
                  Quoted: RM {parseFloat(order.quoted_price).toFixed(2)}
                </p>
                {report && (
                  <p className="text-green-700 font-medium">
                    Final: RM {parseFloat(report.final_amount).toFixed(2)}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {order.assigned_technician ? (
                  <p className="font-medium">
                    {order.assigned_technician.first_name
                      ? `${order.assigned_technician.first_name} ${order.assigned_technician.last_name}`
                      : order.assigned_technician.username}
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    No technician assigned
                  </p>
                )}
              </CardContent>
            </Card>

            {order.problem_description && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    Problem
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {order.problem_description}
                </CardContent>
              </Card>
            )}

            {order.admin_notes && (
              <Card className="sm:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    Admin Notes
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {order.admin_notes}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ── Timeline ── */}
        <TabsContent value="timeline">
          {order.events.length === 0 ? (
            <EmptyState title="No events yet" />
          ) : (
            <div className="relative space-y-0">
              {order.events.map((event, idx) => (
                <div key={event.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="size-2.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    {idx < order.events.length - 1 && (
                      <div className="w-px flex-1 bg-border mt-1" />
                    )}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium capitalize">
                      {event.event_type.replace("_", " ")}
                      {event.from_status && event.to_status && (
                        <span className="text-muted-foreground font-normal">
                          {" "}
                          · {event.from_status} → {event.to_status}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      by {event.actor.first_name || event.actor.username} ·{" "}
                      {format(new Date(event.at), "dd MMM yyyy, h:mm a")}
                    </p>
                    {event.note && (
                      <p className="text-xs mt-1 text-muted-foreground italic">
                        {event.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Report ── */}
        <TabsContent value="report">
          {!report ? (
            <EmptyState
              title="No service report"
              description="The technician hasn't submitted a completion report yet."
            />
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    Work Done
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>{report.work_done}</p>
                  {report.remarks && (
                    <>
                      <Separator />
                      <p className="text-muted-foreground">{report.remarks}</p>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">
                    Financials
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Quoted</span>
                    <span>RM {parseFloat(order.quoted_price).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Extra charges</span>
                    <span>
                      RM {parseFloat(report.extra_charges).toFixed(2)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Final amount</span>
                    <span>RM {parseFloat(report.final_amount).toFixed(2)}</span>
                  </div>
                  {report.payment ? (
                    <>
                      <Separator />
                      <div className="flex justify-between text-green-700">
                        <span>Paid ({report.payment.method})</span>
                        <span>
                          RM {parseFloat(report.payment.amount).toFixed(2)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <Separator />
                      <div className="flex justify-between text-amber-600 text-xs font-medium">
                        <span>Payment not recorded</span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {canRecordPayment && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <CreditCard className="size-4" />
                      Record Payment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(10rem,0.75fr)] gap-3">
                      <div className="space-y-1 min-w-0">
                        <Label className="text-xs">Amount (RM)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={parseFloat(report.final_amount).toFixed(
                            2,
                          )}
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <Label className="text-xs">Method</Label>
                        <Select
                          value={paymentMethod}
                          onValueChange={(v) =>
                            setPaymentMethod(v as PaymentMethod)
                          }
                        >
                          <SelectTrigger className="w-full min-w-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="transfer">Transfer</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="ewallet">E-Wallet</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleRecordPayment}
                      disabled={createPayment.isPending}
                    >
                      <CreditCard className="mr-2 size-4" />
                      {createPayment.isPending ? "Saving..." : "Record Payment"}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {report.attachments.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">
                      Attachments ({report.attachments.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {report.attachments.map((att) => (
                        <FilePreview
                          key={att.id}
                          url={att.file_url}
                          kind={att.kind}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Notifications ── */}
        <TabsContent value="notifications">
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  regenerateNotifs.mutate(undefined, {
                    onSuccess: () => toast.success("Notifications regenerated"),
                    onError: () => toast.error("Failed to regenerate"),
                  })
                }
                disabled={regenerateNotifs.isPending}
              >
                {regenerateNotifs.isPending ? "Regenerating…" : "Regenerate"}
              </Button>
            </div>

            {!notifications || notifications.length === 0 ? (
              <EmptyState
                title="No notifications"
                description="Notifications are generated when a technician is assigned and when the job is marked as done."
              />
            ) : (
              notifications.map((n) => (
                <Card key={n.id}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium capitalize">
                        {n.recipient_type}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                    <WhatsAppButton
                      deepLinkUrl={n.deep_link_url}
                      recipientType={n.recipient_type}
                    />
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AssignTechnicianDialog
        key={assignKey}
        orderId={order.id}
        open={assignOpen}
        onOpenChange={setAssignOpen}
        currentTechnicianId={order.assigned_technician?.id}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Order</DialogTitle>
          </DialogHeader>
          <OrderForm
            order={order}
            onSubmit={handleEdit}
            submitLabel="Update Order"
            isSubmitting={updateOrder.isPending}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={reviewConfirm}
        onOpenChange={setReviewConfirm}
        title="Mark as Reviewed?"
        description="This will move the order to Reviewed status."
        confirmLabel="Confirm"
        onConfirm={async () => {
          try {
            await reviewOrder.mutateAsync();
            toast.success("Order marked as reviewed");
          } catch {
            toast.error("Failed to review order");
          } finally {
            setReviewConfirm(false);
          }
        }}
        loading={reviewOrder.isPending}
      />

      <ConfirmDialog
        open={closeConfirm}
        onOpenChange={setCloseConfirm}
        title="Close Order?"
        description="This will permanently close the order."
        confirmLabel="Close Order"
        onConfirm={async () => {
          try {
            await closeOrder.mutateAsync();
            toast.success("Order closed");
          } catch {
            toast.error("Failed to close order");
          } finally {
            setCloseConfirm(false);
          }
        }}
        loading={closeOrder.isPending}
        destructive
      />
    </div>
  );
}
