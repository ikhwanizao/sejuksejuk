# API reference

Paths below are relative to `/api/`, with trailing slashes. Protected requests use `Authorization: Bearer <access>`. JSON is standard; file uploads use multipart form data. Running OpenAPI and Swagger endpoints are `/api/schema/` and `/api/docs/`.

## Authentication and reference data

| Method | Path | Behavior |
| --- | --- | --- |
| POST | auth/login/ | Public; username/password returns access and refresh. |
| POST | auth/refresh/ | Public; refresh returns a new access token. |
| GET | auth/me/ | Current identity, role, branch. |
| GET | auth/users/?role=technician | Admin/manager; optional role filter; array. |
| GET | service-types/ | Authenticated; paginated list. |
| GET | service-types/{id}/ | Authenticated; single type. |

Default page-number pagination returns `{count, next, previous, results}`, 20 rows per page. No page-size query override is configured; the client's page_size=100 does not guarantee 100 results. Custom views such as users and notifications return arrays.

## Orders

| Method | Path | Access / behavior |
| --- | --- | --- |
| GET | orders/ | Authenticated; role-filtered paginated summaries. |
| GET | orders/{id}/ | Role-filtered detail with events. |
| POST | orders/ | Admin; create. |
| PUT/PATCH | orders/{id}/ | Admin; editable fields, not status. |
| DELETE | orders/{id}/ | Disabled for every role; HTTP 405. |
| POST | orders/{id}/assign/ | Admin; technician_id; assign/reassign before job done. |
| POST | orders/{id}/start/ | Assigned technician; assigned -> in_progress. |
| POST | orders/{id}/complete/ | Assigned technician; report plus job_done; returns order detail, HTTP 201. |
| POST | orders/{id}/review/ | Admin/manager; job_done -> reviewed. |
| POST | orders/{id}/close/ | Admin/manager; reviewed -> closed. |

Filters: status, assigned_technician, service_type, created_after, created_before, has_payment, search, ordering, page. Date filters accept datetimes. Search covers order number, customer name/phone. Ordering supports created_at, status, quoted_price; prefix `-` for descending. Default is -created_at.

Example create payload:

```json
{
  "customer_name": "Example Customer",
  "customer_phone": "0123456789",
  "customer_address": "Example service address",
  "problem_description": "Unit is not cooling",
  "service_type_id": null,
  "quoted_price": "150.00",
  "admin_notes": "Call before arriving"
}
```

The server sets creator and generates the order number. Create/update responses use their respective serializer fields, not full detail. Fetch detail for nested data, status, and events. Decimal model fields normally serialize as strings.

Completion payload:

```json
{
  "work_done": "Cleaned filters and inspected unit",
  "extra_charges": "20.00",
  "remarks": "Advised on maintenance"
}
```

Final amount is quoted price plus extra charges. Negative extras, duplicate reports, and invalid transitions are rejected. Reassignment preserves assigned/in_progress status. There is no dedicated unassign endpoint.

## Reports, files, payments

| Method | Path | Behavior |
| --- | --- | --- |
| GET | orders/{order_id}/report/ | Report, attachments, optional payment; restricted to visible orders; 404 if absent or hidden. |
| GET | reports/{report_id}/attachments/ | Array of attachments; restricted to visible orders. |
| POST | reports/{report_id}/attachments/ | Multipart file; HTTP 201. |
| DELETE | reports/{report_id}/attachments/{attachment_id}/ | Delete file/record, HTTP 204; blocked after review/closure. |
| POST | reports/{report_id}/payment/ | One payment per report; HTTP 201. |

These require authentication but do not all enforce order ownership; see [known limitations](architecture.md#known-limitations).

Files: six/report, 50 MiB/file. Types: image/jpeg, image/png, image/webp, video/mp4, video/quicktime, video/x-msvideo, application/pdf. Response fields include id, file, file_url, inferred kind, uploaded_at.

Payment accepts JSON `{"amount":"170.00","method":"cash"}` or multipart amount/method/optional receipt_photo. Methods: cash, transfer, card, ewallet. This records receipt of money; it does not perform a transfer or change order status.

## Notifications

| Method | Path | Behavior |
| --- | --- | --- |
| GET | orders/{id}/notifications/ | WhatsApp records; technicians must be assigned. |
| GET | notifications/inbox/ | Current user's newest 50 records. |
| POST | notifications/inbox/mark-read/ | Marks owned unread records; returns marked_read. |
| DELETE | notifications/inbox/clear/ | Deletes owned records; returns deleted. |
| DELETE | notifications/inbox/{id}/ | Deletes owned record; HTTP 204. |

WhatsApp records expose recipient, message, deep link, and notification status. Inbox rows include order ID/number and read state. Links do not establish delivery.

## KPI

Admin/manager GET endpoints: kpi/summary/, kpi/technicians/, kpi/leaderboard/.

Parameters: period=week|month|today, or both start/end as YYYY-MM-DD. Leaderboard also accepts metric=jobs|amount. Summary returns period/bounds and total_jobs/total_amount. Other responses wrap rows in technicians or leaderboard; ranks appear in leaderboard rows. Amounts are JSON numbers.

Completed-job queries use report completion dates and enforce order branch scope. Today still covers seven days. Read [KPI semantics](architecture.md#kpi-semantics).

## AI

Admin/manager `POST ai/query/` accepts:

```json
{"question":"How many jobs were completed this week?","conversation_id":1}
```

Omit conversation_id to start a new conversation. Questions must be 3-500 characters; throttle is 30/minute. Response: conversation_id, answer, sources (tool name, arguments, result). Conversations must belong to the requester, otherwise 404. Tools receive server-controlled caller identity and enforce order branch scope. Completed-job metrics use report completion dates; open-job counts use creation dates.

`GET ai/conversations/{id}/` returns an owned conversation with stored messages. Database messages do not restore process-local agent context after restart. Mock returns fixed text with no sources. Provider errors may appear as answer text with HTTP 200.

## Errors

Bodies vary between field-keyed validation lists and explicit detail messages; a custom DRF exception handler is installed. Typical statuses: 400 validation/transitions, 401 authentication, 403 permissions, 404 absent/queryset-hidden resources, 429 AI throttle. Inspect actual response fields rather than assuming all failures have detail.
