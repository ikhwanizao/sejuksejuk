# Architecture and behavior

## Source map

| Location | Responsibility |
| --- | --- |
| src/main.tsx, src/App.tsx | Bootstrap and providers. |
| src/routes/ | Authentication guards, role gates, page routes. |
| src/pages/admin/ | Orders, assignment, AI assistant. |
| src/pages/technician/ | Assigned jobs and completion wizard. |
| src/pages/kpi/ | Filters, totals, technician table, leaderboard. |
| src/components/ | Shared UI, layout, notifications, file previews. |
| src/api/ | TanStack Query hooks and mutations. |
| src/lib/api.ts | Axios, token refresh, media URL helpers. |
| src/stores/auth.ts | Persisted Zustand authentication state. |
| src/types/api.ts | Client API types. |
| Backend accounts/ | Users, branches, roles, identity. |
| Backend orders/ | Orders, service types, events, filters, transitions, seeds. |
| Backend services/ | Reports, attachments, payments. |
| Backend notifications/ | WhatsApp links and personal inbox. |
| Backend kpi/ | ORM aggregates. |
| Backend ai_assistant/ | Conversations, providers, agent, ORM tools. |
| Backend audit/ | Action recording. |
| Backend sejuksejuk/ | Settings, URL composition, exception handling, server entry points. |

## Client data and authentication

Pages use query hooks and Axios against `<VITE_API_BASE_URL>/api`. Query defaults are 30-second freshness and one retry, excluding 4xx failures. KPI uses 60 seconds; identity/reference hooks override freshness. The inbox polls every 30 seconds.

Cache keys must match in value and type. Order detail normalizes IDs to strings; some existing update invalidations use numbers, which can leave stale views.

Login obtains JWT access/refresh tokens, then the client fetches `/auth/me/`. Tokens are in localStorage, alongside persisted Zustand user/auth state under `auth-storage`. Axios attaches Bearer tokens. On a 401 it shares one refresh promise across concurrent requests and retries each request once. Refresh failure removes token keys and redirects to login. Refresh updates the standalone access key rather than synchronizing Zustand token fields.

Backend access tokens last eight hours; refresh tokens last seven days. Rotation and blacklisting are not configured. Browser route guards and API permission checks differ; hidden UI controls do not establish backend isolation.

## Data and workflow

A user has one optional branch. Orders reference a creator, service type, and assigned technician. Events record status transitions and assignment notes. Each order can have one service report; reports have attachments and at most one payment. Conversations belong to users and contain messages.

```text
new -> assigned -> in_progress -> job_done -> reviewed -> closed
```

Admins assign jobs and can reassign assigned/in-progress jobs without changing state. Only the assigned technician can start/complete; admins/managers review and close. The validator additionally permits assigned -> new, but there is no dedicated unassign endpoint.

Completion creates the report, computes final amount as quoted price plus nonnegative extra charges, records an event, and sets job_done in a transaction. Uploads/payment happen in separate requests afterward; the wizard is not atomic. Refreshing resumes photos or payment from the saved report, and Job Done detail pages offer an action to reopen the flow. Backend completion does not require attachments or payment, and review/close do not check either.

Technician order querysets contain assigned orders. Managers with a branch see orders whose creator belongs to their branch; managers without a branch see no orders. Admins see all orders. Report and attachment-list reads, KPI endpoints, and AI tools share these visibility rules.

## Files, payments, notifications

Attachment validation allows six files per report, 50 MiB each, and identifies kind using the supplied content type rather than file signatures. Backend formats include JPEG, PNG, WebP, MP4, QuickTime, AVI, and PDF; the client picker/allowlist is narrower. Responses provide file and file_url. Storage is local unless Cloudinary is configured.

Payment is record keeping, not gateway processing. Methods are cash, transfer, card, and ewallet, with an optional receipt image. Duplicate payment records are rejected; equality with the final amount is not required by transition code.

Assignment generates technician alerts; completion generates customer and manager WhatsApp notification records. Links prepare messages for manual sending, without delivery confirmation. Malaysian local phone numbers starting with 0 become 60-prefixed numbers. Completion message times explicitly use Asia/Kuala_Lumpur. Inbox records are scoped by recipient_user and limited to the latest 50. Completion catches notification errors after saving the order/report.

## KPI semantics

- Completed means job_done, reviewed, or closed.
- Completed-job date filters use report completed_at. Later review/closure/edits preserve the original completion period.
- Week is Monday through Sunday; month is month start through today.
- Today currently takes a fallback path covering today and six preceding days. AI tools implement today as a single day.
- Both start and end override period; one alone does not.
- Amount totals sum report final amounts, not captured payments.
- Technician rows include only technicians with qualifying completed jobs. Reschedules count rescheduled events against current assignees.
- Leaderboards assign sequential ranks, without shared tie ranks.
- KPI queries use the same branch scope as order reads.

Django TIME_ZONE is UTC. Range helpers use Python date.today(), so Malaysian business-day boundaries should not be assumed.

## AI assistant

The provider factory selects OpenAI, Claude, Gemini, or mock. Model identifiers are hardcoded in `ai_assistant/providers/__init__.py`; external availability has not been verified. Mock returns fixed text and calls no tools.

Five read-only ORM tools are registered: list_jobs_by_technician, count_jobs, top_technicians, get_order_summary, technician_workload. They resolve the authenticated user from server-injected configuration and query only visible orders. Model arguments cannot choose the requesting identity. Operational tool results can be passed to the configured external model provider.

Query requests require admin/manager access, accept 3-500 character questions, and are throttled to 30/minute. Conversation ownership is checked. The database stores questions, answers, and tool-call data.

The globally compiled LangGraph agent uses MemorySaver keyed by user, role, branch, and conversation ID. Context is process-local, disappears on restart, and is not shared across workers. The view loads stored history but does not pass it to the runner to restore context. Sources can include tool calls from previous retained turns. The compiled recursion limit is 12 steps, derived from MAX_TOOL_ITERATIONS=5.

## Known limitations

These are source observations, not fixes or claims of tested exploits:

- Order deletion is disabled for every API role (HTTP 405), preserving related reports, payments, and events.
- Report and attachment-list reads enforce order visibility. Attachment/payment writes block technicians acting on other assignees' orders, but still lack equivalent manager branch checks.
- Attachment deletion is blocked after review/closure; upload lacks a matching status guard, despite a source comment suggesting one.
- Assignment checks technician role, but not is_active, despite the validation error mentioning an active technician.
- Client types differ from server responses: order lists omit detail fields; create/update return their own serializer shapes; KPI amounts are numbers where some client types declare strings.
- Backend root tests.py references stale interfaces: run_query calls omit required conversation_id; tests import removed execute_tool; transition tests expect Django rather than DRF ValidationError; phone expectations predate Malaysian normalization.
- Existing schema.yml and comments may lag code. Resolve discrepancies through URL configuration, permissions, serializers, and models. Served schema annotations can also be incomplete.
