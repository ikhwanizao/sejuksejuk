# Sejuk Sejuk Service — Operations System

---

## What I Built

A role-based web portal that digitises the full service workflow from order creation through technician completion to manager review and KPI tracking.

---

## Tech Stack

| Layer              | Choice                              | Notes                                                                    |
| ------------------ | ----------------------------------- | ------------------------------------------------------------------------ |
| **Front-end**      | React + TypeScript                  | Vite, React Router, TanStack Query                                       |
| **Styling**        | Tailwind CSS + shadcn/ui            | Component library built on Radix UI                                      |
| **Back-end**       | Django + Django REST Framework      | Python, REST API with drf-spectacular (OpenAPI docs)                     |
| **Database**       | Neon (PostgreSQL)                   | Serverless Postgres; SQLite supported for local dev                      |
| **File Storage**   | Cloudinary (with local fallback)    | Auto-detected via `CLOUDINARY_URL` env var                               |
| **AI**             | LangGraph ReAct agent               | Supports OpenAI / Claude / Gemini — switchable via `AI_PROVIDER` env var |
| **Authentication** | JWT (djangorestframework-simplejwt) | Real token-based auth, not mock                                          |

> I chose Django + Neon (PostgreSQL) because according to my research it is more suitable for the backend framework that I chose. Supabase is most suitable for Node.js ecosystem.

---

## Architecture Decisions

### Role-Based Access Control

Three roles are enforced at both the API and UI layers:

- **Admin** — create orders, assign technicians, view all data, access KPI and AI
- **Manager** — view orders, mark reviewed/closed, access KPI and AI
- **Technician** — view only their own assigned jobs, submit completion reports

Permissions are implemented as DRF permission classes (`IsAdmin`, `IsManagerOrAdmin`, `IsAssignedTechnician`) so the API is secure independently of the frontend.

### Order State Machine

Orders follow a strict workflow enforced server-side:

```
New → Assigned → In Progress → Job Done → Reviewed → Closed
```

Each transition is a dedicated API action endpoint (`/assign/`, `/start/`, `/complete/`, `/review/`, `/close/`). Invalid transitions return a 400 error. Every state change is recorded as an `OrderEvent` for a full audit trail.

### AI Agent Design

The AI assistant uses a **LangGraph ReAct agent** with a registry of five read-only ORM tools:

| Tool                      | What it does                                               |
| ------------------------- | ---------------------------------------------------------- |
| `list_jobs_by_technician` | Lists jobs completed by a named technician for a period    |
| `count_jobs`              | Counts orders for a period, optionally filtered by status  |
| `top_technicians`         | Ranks technicians by jobs completed or revenue             |
| `get_order_summary`       | Fetches full details for a specific order number           |
| `technician_workload`     | Shows all technicians' job counts and amounts for a period |

The agent never sees raw SQL and cannot write to the database. All queries are scoped through Django ORM with explicit filters. Conversation history is persisted via LangGraph's `MemorySaver` checkpointer, keyed by `conversation_id`, so the assistant can maintain context across multiple turns.

### WhatsApp Notifications

When a job is marked `Job Done`, the system generates WhatsApp deep-link URLs for three recipients: the customer (feedback request), the technician (confirmation), and the manager (job-done alert). These are stored as `Notification` records and surfaced in the UI as one-tap WhatsApp buttons. No paid API is required — the deep-link approach works universally.

### File Uploads

Technicians can upload up to 6 files (photos, video, PDF) per job completion. Files are stored on Cloudinary in production and fall back to local filesystem in development. The attachment kind (`photo`, `video`, `pdf`) is inferred from the MIME type on the server.

---

## How AI Was Integrated

**Flow:**

```
User types a question
     ↓
Django view receives request, loads or creates a Conversation record
     ↓
LangGraph ReAct agent processes the question
     ↓
Agent decides which tool(s) to call based on the question
     ↓
Tools execute read-only Django ORM queries
     ↓
Agent formats a natural language response from the tool results
     ↓
Response + tool call sources returned to the frontend
```

**What the AI can answer:**

- "What jobs did technician Ali complete this week?"
- "Which technician completed the most jobs this month?"
- "How many jobs are in progress right now?"
- "Show me the details for order ORD-000042"
- "Who has the highest revenue this week?"
- "How many jobs were completed today?"

**Limitations:**

- If multiple technicians completed the same number of jobs in a week, the AI assistant will only mention one of them instead of all tied technicians when asked "Who did the most jobs this week?"
- A user can only be assigned to one branch, so with the current design no user can view all orders and services across different branches from a single account.

---

## Challenges & Assumptions

**Hardest module: AI integration.** Getting the LangGraph agent to reliably choose the right tool, handle ambiguous technician names (e.g. "Ali" matching multiple users), and return clean structured responses took the most iteration. The main challenge was designing tool schemas that are narrow enough to be safe but flexible enough to cover natural language variations.

**Easiest module: KPI Dashboard.** The data aggregation was straightforward as we only need to query the numbers of data for the dashboard.

**Assumptions made:**

- "This week" means the current calendar week (Monday to Sunday).
- Only jobs with status `job_done`, `reviewed`, or `closed` count as "completed" for KPI and AI queries.
- The WhatsApp deep-link is sufficient for notification delivery — no real SMS/WhatsApp Business API integration.
- A single branch deployment was assumed; branch filtering exists in the data model but is not surfaced in the UI.

**What I would improve in a real production system:**

- Replace MemorySaver with a persistent LangGraph checkpointer (e.g. PostgreSQL-backed) so conversation history survives server restarts.
- Add a proper WhatsApp Business API integration instead of deep-links, so notifications are actually delivered rather than requiring manual user action.
- Implement refresh token rotation and session expiry policies.
- Add background job processing (Celery + Redis) for notification delivery and file processing instead of doing it inline in request handlers.
- Add an AI Workflow Supervisor that flags anomalies automatically — e.g. when final amount exceeds quoted price by more than 20%, or when a job is marked done with no photos uploaded.
- Write integration tests for the order state machine transitions and permission checks.

---

## How I Used AI Tools While Building This

Claude (Anthropic) was used throughout the project in the following ways:

- **Scaffolding** — generating initial boilerplate for Django models, serializers, and DRF viewsets based on the data model I designed.
- **Frontend components** — drafting React component structure and shadcn/ui wiring, which I then refined for the specific UX requirements.
- **AI tool design** — iterating on the LangGraph tool schemas and system prompt to improve the agent's ability to handle ambiguous queries.
- **Debugging** — explaining Django ORM query behaviour and LangGraph message parsing edge cases.

All generated code was reviewed, tested, and adjusted. The architecture decisions (stack choice, permission model, AI agent design, state machine) were made independently.

---

## Running the Project

### Backend

```bash
cd sejuksejuk-backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then open .env and fill in your values
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Environment Variables (key ones)

| Variable         | Purpose                                 |
| ---------------- | --------------------------------------- |
| `SECRET_KEY`     | Django secret key                       |
| `DATABASE_URL`   | PostgreSQL connection string            |
| `AI_PROVIDER`    | `openai` / `claude` / `gemini` / `mock` |
| `OPENAI_API_KEY` | Required if `AI_PROVIDER=openai`        |
| `CLAUDE_API_KEY` | Required if `AI_PROVIDER=claude`        |
| `GEMINI_API_KEY` | Required if `AI_PROVIDER=gemini`        |
| `CLOUDINARY_URL` | Optional — enables cloud file storage   |
