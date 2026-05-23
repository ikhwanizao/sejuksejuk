import { useParams, useNavigate, Link } from "react-router";
import { toast } from "sonner";
import { ArrowLeft, MapPin, Phone, Play, ClipboardCheck } from "lucide-react";
import { format } from "date-fns";
import { useOrder, useStartOrder } from "@/api/orders";
import { useReport } from "@/api/reports";
import { useOrderNotifications } from "@/api/notifications";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ErrorState } from "@/components/common/ErrorState";
import { PageSkeleton } from "@/components/common/LoadingState";
import { WhatsAppButton } from "@/components/common/WhatsAppButton";
import { FilePreview } from "@/components/common/FilePreview";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { OrderStatus } from "@/types/api";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: order, isLoading, isError, refetch } = useOrder(id);
  const { data: report } = useReport(id);
  const { data: notifications } = useOrderNotifications(id);
  const startOrder = useStartOrder(Number(id));

  if (isLoading) return <PageSkeleton rows={3} />;
  if (isError || !order) return <ErrorState onRetry={() => refetch()} />;

  const customerNotif = notifications?.find(
    (n) => n.recipient_type === "customer",
  );

  async function handleStart() {
    try {
      await startOrder.mutateAsync();
      toast.success("Job started — good luck!");
    } catch {
      toast.error("Failed to start job");
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/jobs")}>
          <ArrowLeft className="mr-2 size-4" />
          My Jobs
        </Button>
      </div>

      <PageHeader
        title={order.order_no}
        action={<StatusBadge status={order.status as OrderStatus} />}
      />

      {/* Customer info */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            Customer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="font-medium">{order.customer_name}</p>
          <a
            href={`tel:${order.customer_phone}`}
            className="flex items-center gap-1.5 text-primary"
          >
            <Phone className="size-4" />
            {order.customer_phone}
          </a>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(order.customer_address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-1.5 text-primary"
          >
            <MapPin className="size-4 mt-0.5 shrink-0" />
            <span>{order.customer_address}</span>
          </a>
        </CardContent>
      </Card>

      {/* Service info */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            Service
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>{order.service_type?.name ?? "—"}</p>
          <p className="text-muted-foreground">{order.problem_description}</p>
          <p className="font-medium">
            Quoted: RM {parseFloat(order.quoted_price).toFixed(2)}
          </p>
        </CardContent>
      </Card>

      {/* If job is done, show report summary + WhatsApp button */}
      {order.status === "job_done" && report && (
        <Card className="mb-4 border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-700">
              Job Completed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>{report.work_done}</p>
            <Separator />
            <div className="flex justify-between font-medium">
              <span>Final amount</span>
              <span>RM {parseFloat(report.final_amount).toFixed(2)}</span>
            </div>
            {report.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {report.attachments.map((att) => (
                  <FilePreview
                    key={att.id}
                    url={att.file}
                    kind={att.kind}
                    className="h-16 w-16"
                  />
                ))}
              </div>
            )}
            {customerNotif && (
              <div className="pt-1">
                <p className="text-xs text-muted-foreground mb-1">
                  Send feedback request to customer:
                </p>
                <WhatsAppButton
                  deepLinkUrl={customerNotif.deep_link_url}
                  recipientType="customer"
                  label="Message Customer"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Completed at info */}
      {report && (
        <p className="text-xs text-muted-foreground mb-4">
          Completed{" "}
          {format(new Date(report.completed_at), "dd MMM yyyy, h:mm a")}
        </p>
      )}

      {/* Primary action button */}
      <div className="sticky bottom-20 md:static md:pt-2">
        {order.status === "assigned" && (
          <Button
            size="lg"
            className="w-full"
            onClick={handleStart}
            disabled={startOrder.isPending}
          >
            <Play className="mr-2 size-5" />
            {startOrder.isPending ? "Starting…" : "Start Job"}
          </Button>
        )}
        {order.status === "in_progress" && (
          <Button size="lg" className="w-full" asChild>
            <Link to={`/jobs/${id}/complete`}>
              <ClipboardCheck className="mr-2 size-5" />
              Complete Job
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
