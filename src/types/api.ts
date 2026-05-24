// ─── Pagination ────────────────────────────────────────────────────────────
export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ─── Auth / Users ───────────────────────────────────────────────────────────
export type Role = "admin" | "technician" | "manager";

export interface Branch {
  id: number;
  name: string;
  code: string;
  address: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: Role;
  branch: Branch | null;
  is_active: boolean;
  date_joined: string;
}

// ─── Service Types ──────────────────────────────────────────────────────────
export interface ServiceType {
  id: number;
  name: string;
  default_price: string;
}

// ─── Orders ─────────────────────────────────────────────────────────────────
export type OrderStatus =
  | "new"
  | "assigned"
  | "in_progress"
  | "job_done"
  | "reviewed"
  | "closed";

export interface OrderEvent {
  id: number;
  event_type: "status_change" | "rescheduled" | "note";
  from_status: string | null;
  to_status: string | null;
  actor: Pick<User, "id" | "username" | "first_name" | "last_name">;
  note: string | null;
  at: string;
}

export interface Order {
  id: number;
  order_no: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  problem_description: string;
  service_type: ServiceType | null;
  quoted_price: string;
  admin_notes: string;
  status: OrderStatus;
  assigned_technician: Pick<
    User,
    "id" | "username" | "first_name" | "last_name"
  > | null;
  created_by: Pick<User, "id" | "username"> | null;
  created_at: string;
  updated_at: string;
  events: OrderEvent[];
}

export interface OrderCreatePayload {
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  problem_description: string;
  service_type_id: number | null;
  quoted_price: string;
  admin_notes: string;
}

// ─── Service Reports ─────────────────────────────────────────────────────────
export type AttachmentKind = "photo" | "video" | "pdf";
export type PaymentMethod = "cash" | "transfer" | "card" | "ewallet";

export interface ServiceAttachment {
  id: number;
  file: string;
  file_url: string;
  kind: AttachmentKind;
  uploaded_at: string;
}

export interface Payment {
  id: number;
  amount: string;
  method: PaymentMethod;
  receipt_photo: string | null;
  captured_at: string;
}

export interface ServiceReport {
  id: number;
  order_id: number;
  work_done: string;
  extra_charges: string;
  final_amount: string;
  remarks: string;
  technician_id: number;
  completed_at: string;
  attachments: ServiceAttachment[];
  payment: Payment | null;
}

export interface ServiceReportCreatePayload {
  work_done: string;
  extra_charges?: string;
  remarks?: string;
}

export interface PaymentCreatePayload {
  amount: string;
  method: PaymentMethod;
  receipt_photo?: File;
}

// ─── KPI ─────────────────────────────────────────────────────────────────────
export type KpiPeriod = "today" | "week" | "month";
export type KpiMetric = "jobs" | "amount";

export interface KpiRange {
  period?: KpiPeriod;
  start?: string;
  end?: string;
}

export interface KpiSummary {
  period: string;
  start: string;
  end: string;
  total_jobs: number;
  total_amount: string;
}

export interface KpiTechnicianRow {
  technician_id: number;
  technician_name: string;
  jobs_completed: number;
  total_amount: string;
  reschedule_count: number;
}

export interface KpiTechniciansResponse {
  period: string;
  start: string;
  end: string;
  technicians: KpiTechnicianRow[];
}

export interface KpiLeaderboardRow extends KpiTechnicianRow {
  rank: number;
}

export interface KpiLeaderboardResponse {
  period: string;
  metric: KpiMetric;
  start: string;
  end: string;
  leaderboard: KpiLeaderboardRow[];
}

// ─── Notifications ───────────────────────────────────────────────────────────
export type NotificationChannel = "whatsapp";
export type RecipientType = "customer" | "technician" | "manager";
export type NotificationStatus = "generated" | "sent";

export interface Notification {
  id: number;
  channel: NotificationChannel;
  recipient_type: RecipientType;
  recipient_phone: string;
  message: string;
  deep_link_url: string;
  notification_status: NotificationStatus;
  created_at: string;
}

export interface InAppNotification {
  id: number;
  message: string;
  order_no: string;
  order_id: number;
  recipient_type: RecipientType;
  is_read: boolean;
  created_at: string;
}

// ─── AI Assistant ─────────────────────────────────────────────────────────────
export interface AiToolCall {
  tool: string;
  arguments: Record<string, unknown>;
  result: string | null;
}

export interface AiQueryResponse {
  conversation_id: number;
  answer: string;
  sources: AiToolCall[];
}

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
  sources?: AiToolCall[];
}
