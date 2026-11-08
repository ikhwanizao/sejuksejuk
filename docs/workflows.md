# User workflows

## Login and routes

Sign in at `/login` with an existing account. Technicians land on `/jobs`; admins/managers land on `/kpi`. All roles can view `/profile`.

| Page | UI roles |
| --- | --- |
| /orders, /orders/:id | Admin, manager |
| /orders/new | Admin |
| /jobs, /jobs/:id, /jobs/:id/complete | Technician |
| /kpi, /ai | Admin, manager |
| /profile | All authenticated roles |

## Admin: create and assign

1. Open Orders and create an order with customer/contact details, address, problem, service type where applicable, quote, and notes.
2. Save and assign a technician. New becomes Assigned.
3. Reassign Assigned or In Progress work if needed; status remains unchanged and history records a note.
4. Monitor the order and its event timeline. Review and close completed jobs as appropriate.

The picker needs existing technician users. `seed_users` creates users but not service types; use `seed_all` for a development dataset or Django admin for reference data.

## Technician: complete a job

1. Choose an assigned job under My Jobs and start it. Assigned becomes In Progress.
2. Open Complete Job and enter work details, extra charges, and remarks.
3. Submit work details. This immediately creates the report and marks Job Done.
4. Upload supporting files. The UI requires at least one attachment before Payment, although backend completion already succeeded without one.
5. Record optional payment and receipt, or skip payment.
6. Open the customer WhatsApp button if shown, review the prepared message, and send through WhatsApp.

Final amount is quote plus extras. The client upload limit is six files, 10 MiB each (backend allows 50 MiB); use formats offered by the picker. Uploads/payment are separate requests, so later failure does not roll back completion. Refresh or reopen Add Photos / Payment on the Job Done detail page to resume from the saved report. Saved charges determine the payment amount preview. Duplicate reports/payments are rejected.

## Manager/admin: review and close

1. Open a Job Done order and inspect work, charges, evidence, optional payment, and history.
2. Mark Reviewed.
3. Close after operational review is finished.

Transitions must occur in order. Backend review/close do not require attachments or payment. Attachment deletion is blocked after review/closure. A manager with a branch sees orders whose creator belongs to that branch; other APIs have different scoping.

## KPI and AI

Choose period/custom range and ranking metric on the dashboard. Amount totals are report final amounts, not collected payments. Completed-job filtering uses report completion dates; Today currently includes seven days. Read [KPI semantics](architecture.md#kpi-semantics) before reporting figures.

Admins/managers can ask the AI about counts, technician jobs/rankings, and order details. Real providers can return tool sources; mock returns fixed text. Agent context may disappear on restart or when another worker handles the request. AI tools enforce manager branch scope; admins can query across branches.

## Notifications

The bell polls every 30 seconds. Mark read or clear personal notifications as needed. Assignment/completion actions generate notification records. WhatsApp links require manual sending and provide no delivery confirmation.
