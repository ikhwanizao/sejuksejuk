import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  Upload,
  X,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  FileText,
  Film,
} from "lucide-react";
import { useOrder, useCompleteOrder } from "@/api/orders";
import {
  useReport,
  useUploadAttachment,
  useDeleteAttachment,
} from "@/api/reports";
import { useCreatePayment } from "@/api/payments";
import { useOrderNotifications } from "@/api/notifications";
import { ErrorState } from "@/components/common/ErrorState";
import { PageSkeleton } from "@/components/common/LoadingState";
import { FilePreview } from "@/components/common/FilePreview";
import { WhatsAppButton } from "@/components/common/WhatsAppButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { PaymentMethod } from "@/types/api";

const workSchema = z.object({
  work_done: z.string().min(1, "Please describe the work done"),
  extra_charges: z.string().optional(),
  remarks: z.string().optional(),
});

const paymentSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  method: z.enum(["cash", "transfer", "card", "ewallet"] as const),
});

type WorkValues = z.infer<typeof workSchema>;
type PaymentValues = z.infer<typeof paymentSchema>;
type UploadStatus = "uploading" | "uploaded" | "failed";
type UploadingFile = {
  id: string;
  name: string;
  type: string;
  status: UploadStatus;
  baseAttachmentCount: number;
  previewUrl?: string;
};

function UploadingFileIcon({ type }: { type: string }) {
  if (type.startsWith("image/")) return <ImageIcon className="size-5" />;
  if (type.startsWith("video/")) return <Film className="size-5" />;
  return <FileText className="size-5" />;
}

const MAX_FILES = 6;
const MAX_SIZE_MB = 10;
const MIN_UPLOAD_FEEDBACK_MS = 900;
const UPLOAD_RESULT_FEEDBACK_MS = 700;
const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "application/pdf",
];

export default function CompleteJobPage() {
  "use no memo";
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orderId = Number(id);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [done, setDone] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const { data: order, isLoading, isError } = useOrder(id);
  const { data: report } = useReport(id);
  const { data: notifications } = useOrderNotifications(done ? id : undefined);

  const reportId = report?.id ?? 0;
  const completeOrder = useCompleteOrder(orderId);
  const uploadAttachment = useUploadAttachment(reportId, id);
  const deleteAttachment = useDeleteAttachment(reportId, id);
  const createPayment = useCreatePayment(reportId, orderId);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const workForm = useForm<WorkValues>({
    resolver: zodResolver(workSchema),
    defaultValues: { work_done: "", extra_charges: "0", remarks: "" },
  });

  const paymentForm = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { amount: "", method: "cash" },
  });

  const extraChargesRaw = useWatch({
    control: workForm.control,
    name: "extra_charges",
    defaultValue: "0",
  });
  const paymentMethod = useWatch({
    control: paymentForm.control,
    name: "method",
    defaultValue: "cash",
  });

  const extraCharges = parseFloat(extraChargesRaw || "0") || 0;
  const quotedPrice = parseFloat(order?.quoted_price ?? "0");
  const finalAmount = quotedPrice + extraCharges;

  const attachments = report?.attachments ?? [];
  const isUploadingAttachments = uploadingFiles.some(
    (file) => file.status === "uploading",
  );
  const visibleAttachmentLimit =
    uploadingFiles.length > 0
      ? Math.min(...uploadingFiles.map((file) => file.baseAttachmentCount))
      : attachments.length;
  const visibleAttachments = attachments.slice(0, visibleAttachmentLimit);
  const displayedAttachmentCount =
    visibleAttachments.length + uploadingFiles.length;

  const uploadPreviewUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const uploadPreviewUrls = uploadPreviewUrlsRef.current;
    return () => {
      uploadPreviewUrls.forEach((url) => URL.revokeObjectURL(url));
      uploadPreviewUrls.clear();
    };
  }, []);

  if (isLoading) return <PageSkeleton rows={3} />;
  if (isError || !order) return <ErrorState />;
  if (order.status !== "in_progress" && step === 1 && !done) {
    return <ErrorState message="This job is not currently in progress." />;
  }

  // ── Step 1: Submit work ──────────────────────────────────────────────────
  async function handleWorkSubmit(values: WorkValues) {
    try {
      await completeOrder.mutateAsync({
        work_done: values.work_done,
        extra_charges: values.extra_charges || "0",
        remarks: values.remarks || "",
      });
      toast.success("Work submitted! Now add photos.");
      setStep(2);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response
        ?.data?.detail;
      toast.error(msg ?? "Failed to submit work");
    }
  }

  // ── Step 2: Attachments ──────────────────────────────────────────────────
  function releaseUploadPreview(previewUrl?: string) {
    if (!previewUrl) return;
    URL.revokeObjectURL(previewUrl);
    uploadPreviewUrlsRef.current.delete(previewUrl);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";

    const acceptedFiles: File[] = [];

    for (const file of files) {
      if (!ALLOWED_MIME.includes(file.type)) {
        toast.error(`${file.name}: unsupported file type`);
        continue;
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        toast.error(`${file.name}: exceeds ${MAX_SIZE_MB}MB limit`);
        continue;
      }
      if (attachments.length + acceptedFiles.length >= MAX_FILES) {
        toast.error(`Maximum ${MAX_FILES} files allowed`);
        break;
      }
      acceptedFiles.push(file);
    }

    const queuedFiles = acceptedFiles.map((file, index) => {
      const previewUrl = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined;
      if (previewUrl) uploadPreviewUrlsRef.current.add(previewUrl);

      return {
        file,
        preview: {
          id: `${file.name}-${file.size}-${file.lastModified}-${Date.now()}-${index}`,
          name: file.name,
          type: file.type,
          status: "uploading" as const,
          baseAttachmentCount: attachments.length,
          previewUrl,
        },
      };
    });

    if (queuedFiles.length === 0) return;

    setUploadingFiles((current) => [
      ...current,
      ...queuedFiles.map(({ preview }) => preview),
    ]);

    for (const { file, preview } of queuedFiles) {
      const startedAt = Date.now();
      try {
        await uploadAttachment.mutateAsync(file);
        const elapsed = Date.now() - startedAt;
        const remainingFeedbackMs = Math.max(
          MIN_UPLOAD_FEEDBACK_MS - elapsed,
          0,
        );
        window.setTimeout(() => {
          setUploadingFiles((current) =>
            current.map((upload) =>
              upload.id === preview.id
                ? { ...upload, status: "uploaded" }
                : upload,
            ),
          );
          window.setTimeout(() => {
            releaseUploadPreview(preview.previewUrl);
            setUploadingFiles((current) =>
              current.filter((upload) => upload.id !== preview.id),
            );
          }, UPLOAD_RESULT_FEEDBACK_MS);
        }, remainingFeedbackMs);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
        setUploadingFiles((current) =>
          current.map((upload) =>
            upload.id === preview.id ? { ...upload, status: "failed" } : upload,
          ),
        );
        window.setTimeout(() => {
          releaseUploadPreview(preview.previewUrl);
          setUploadingFiles((current) =>
            current.filter((upload) => upload.id !== preview.id),
          );
        }, UPLOAD_RESULT_FEEDBACK_MS + 600);
      }
    }
  }

  async function handleDeleteAttachment(attId: number) {
    try {
      await deleteAttachment.mutateAsync(attId);
    } catch {
      toast.error("Failed to delete attachment");
    }
  }

  // ── Step 3: Payment ──────────────────────────────────────────────────────
  async function handlePaymentSubmit(values: PaymentValues) {
    if (!report) return;
    try {
      await createPayment.mutateAsync({
        amount: values.amount,
        method: values.method as PaymentMethod,
        receipt_photo: paymentReceipt ?? undefined,
      });
      toast.success("Payment recorded");
      setDone(true);
    } catch {
      toast.error("Failed to record payment");
    }
  }

  function skipPayment() {
    setDone(true);
  }

  // ── Done screen ──────────────────────────────────────────────────────────
  if (done) {
    const customerNotif = notifications?.find(
      (n) => n.recipient_type === "customer",
    );
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center justify-center gap-6 pt-16 text-center p-4">
        <CheckCircle2 className="size-16 text-green-600" />
        <div>
          <h2 className="text-xl font-semibold">Job Completed!</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {order.order_no} has been marked as done.
          </p>
        </div>
        {customerNotif && (
          <div className="space-y-2">
            <p className="text-sm">Send feedback request to the customer:</p>
            <WhatsAppButton
              deepLinkUrl={customerNotif.deep_link_url}
              recipientType="customer"
              label="Message Customer via WhatsApp"
            />
          </div>
        )}
        <Button variant="outline" onClick={() => navigate("/jobs")}>
          Back to My Jobs
        </Button>
      </div>
    );
  }

  const steps = [
    { n: 1, label: "Work" },
    { n: 2, label: "Photos" },
    { n: 3, label: "Payment" },
  ];

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/jobs/${id}`)}
        >
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>
      </div>

      <h1 className="text-lg font-semibold mb-1">Complete Job</h1>
      <p className="text-sm text-muted-foreground mb-5 font-mono">
        {order.order_no}
      </p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {steps.map((s, idx) => (
          <div key={s.n} className="flex items-center gap-2 flex-1">
            <div
              className={`size-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 shrink-0 ${
                step === s.n
                  ? "bg-primary text-primary-foreground border-primary"
                  : step > s.n
                    ? "bg-green-100 text-green-700 border-green-300"
                    : "bg-muted text-muted-foreground border-border"
              }`}
            >
              {step > s.n ? "✓" : s.n}
            </div>
            <span
              className={`text-xs font-medium ${
                step === s.n ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {s.label}
            </span>
            {idx < steps.length - 1 && (
              <div className="flex-1 h-px bg-border" />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Work Details ── */}
      {step === 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Work Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={workForm.handleSubmit(handleWorkSubmit)}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="work_done">Work Done *</Label>
                <Textarea
                  id="work_done"
                  rows={4}
                  placeholder="Describe everything that was done…"
                  {...workForm.register("work_done")}
                />
                {workForm.formState.errors.work_done && (
                  <p className="text-xs text-destructive">
                    {workForm.formState.errors.work_done.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="extra_charges">Extra Charges (RM)</Label>
                <Input
                  id="extra_charges"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  {...workForm.register("extra_charges")}
                />
              </div>

              <div className="rounded-md bg-muted p-3 text-sm">
                <div className="flex justify-between">
                  <span>Quoted</span>
                  <span>RM {quotedPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Extra</span>
                  <span>RM {extraCharges.toFixed(2)}</span>
                </div>
                <Separator className="my-1.5" />
                <div className="flex justify-between font-semibold">
                  <span>Final</span>
                  <span>RM {finalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  rows={2}
                  {...workForm.register("remarks")}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={completeOrder.isPending}
              >
                {completeOrder.isPending ? "Submitting…" : "Next: Add Photos"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Attachments ── */}
      {step === 2 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Photos / Documents
              <span className="text-muted-foreground font-normal text-sm ml-2">
                ({displayedAttachmentCount}/{MAX_FILES})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {visibleAttachments.map((att) => (
                <div key={att.id} className="relative">
                  <FilePreview
                    url={att.file_url}
                    kind={att.kind}
                    className="h-20 w-20"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeleteAttachment(att.id)}
                    className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full size-5 flex items-center justify-center"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}

              {uploadingFiles.map((file) => (
                <div
                  key={file.id}
                  className={`uploading-attachment-tile relative h-20 w-20 overflow-hidden rounded-md border bg-muted text-primary ${
                    file.status === "failed"
                      ? "border-destructive/40 bg-destructive/5 text-destructive"
                      : file.status === "uploaded"
                        ? "border-green-300 bg-green-50 text-green-700"
                        : "border-primary/30 bg-primary/5"
                  }`}
                  aria-live="polite"
                >
                  {file.previewUrl ? (
                    <img
                      src={file.previewUrl}
                      alt=""
                      className="size-full object-cover opacity-70 transition duration-300"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <UploadingFileIcon type={file.type} />
                    </div>
                  )}
                  <div
                    className={`absolute inset-0 z-20 flex flex-col items-center justify-center gap-1 text-xs font-medium text-white ${
                      file.status === "failed"
                        ? "bg-destructive/75"
                        : file.status === "uploaded"
                          ? "bg-green-600/70"
                          : "bg-black/45"
                    }`}
                  >
                    {file.status === "uploading" && (
                      <Loader2 className="size-5 animate-spin" />
                    )}
                    {file.status === "uploaded" && (
                      <CheckCircle2 className="size-5" />
                    )}
                    {file.status === "failed" && <X className="size-5" />}
                    <span>
                      {file.status === "uploading"
                        ? "Uploading"
                        : file.status === "uploaded"
                          ? "Uploaded"
                          : "Failed"}
                    </span>
                  </div>
                </div>
              ))}

              {!isUploadingAttachments &&
                displayedAttachmentCount < MAX_FILES && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-20 w-20 rounded-md border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <Upload className="size-5" />
                    <span className="text-xs">Add</span>
                  </button>
                )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/mp4,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            <p className="text-xs text-muted-foreground">
              Accepted: images, MP4 video, PDF · Max {MAX_SIZE_MB}MB each · Up
              to {MAX_FILES} files
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={attachments.length === 0}
                onClick={() => {
                  if (attachments.length === 0) {
                    toast.error("Please add at least one photo");
                    return;
                  }
                  setStep(3);
                }}
              >
                Next: Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Payment ── */}
      {step === 3 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payment (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={paymentForm.handleSubmit(handlePaymentSubmit)}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount Received (RM)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={finalAmount.toFixed(2)}
                  {...paymentForm.register("amount")}
                />
                {paymentForm.formState.errors.amount && (
                  <p className="text-xs text-destructive">
                    {paymentForm.formState.errors.amount.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) =>
                    paymentForm.setValue("method", v as PaymentMethod)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="transfer">Bank Transfer</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="ewallet">E-Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="receipt">Receipt Photo (optional)</Label>
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setPaymentReceipt(e.target.files?.[0] ?? null)
                  }
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep(2)}
                  type="button"
                >
                  Back
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  type="button"
                  onClick={skipPayment}
                >
                  Skip
                </Button>
                <Button
                  className="flex-1"
                  type="submit"
                  disabled={createPayment.isPending}
                >
                  {createPayment.isPending ? "Saving…" : "Finish"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
