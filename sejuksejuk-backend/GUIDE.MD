Here is the clean, scannable, and fully formatted Markdown version of your assessment document.

---

# Programmer Assessment – Operations System + AI Challenge

## 🔖 Company Overview

- **Company:** Sejuk Sejuk Service Sdn Bhd _(fictional name)_
- **Services:** Air-conditioner installation, servicing, and repair for homes and businesses.

### Operational Context

- 5 branches nationwide
- 40+ technician teams operating in the field
- Admin staff mainly work on desktop systems
- Technicians primarily use mobile devices in the field

### Business Goal

Digitise the full service workflow:

`Order` → `Assignment` → `Service Completion` → `Manager / Accounts Review`

> This assessment simulates a simplified internal operations system used by the company.

---

## ✍️ What’s This Assessment About?

We want to understand how you:

- Build real-world business workflows
- Think in systems and data models, not just pages
- Design clean and practical interfaces
- Integrate AI capabilities into business tools
- Explain your technical decisions clearly

_Note: You may complete one or more modules. We care more about how you think and design the system than the number of modules completed._

---

## 🛠 Suggested Tech Stack

Candidates may use any stack they prefer. However, our preferred stack is:

| Layer                  | Preferred Tools                 |
| ---------------------- | ------------------------------- |
| **Front-end**          | React                           |
| **Styling**            | Tailwind CSS                    |
| **Backend / Database** | Supabase                        |
| **File Storage**       | Supabase Storage                |
| **Deployment**         | Vercel                          |
| **Login**              | Simple mock login / role switch |

### Authentication

Real authentication is not required. A simple mock login or role selector is sufficient.

**Example roles:**

- Admin
- Technician
- Manager

_You may implement a simple role switch to simulate different users. Bonus if you implement basic authentication._

---

## 🤖 AI Integration

For AI-related modules, candidates may use:

| Layer                | Preferred Tools                       |
| -------------------- | ------------------------------------- |
| **AI API**           | OpenAI / Claude / Gemini / equivalent |
| **Backend AI logic** | Node.js / Serverless function         |
| **Data retrieval**   | Supabase queries / backend functions  |

> **Data Security Note:** The AI assistant should answer questions based on system data retrieved through controlled queries. It should not rely on unrestricted access to the entire database. AI responses should be based on structured data retrieved from the system.

---

## 🧭 Simplified System Workflow

```
Admin creates an order
     ↓
Technician receives job
     ↓
Technician completes service
     ↓
System sends notification
     ↓
Manager reviews job
     ↓
Dashboard updates performance metrics

```

### ⚙️ Basic System Rules

Orders follow a simplified workflow state:

`New` → `Assigned` → `In Progress` → `Job Done` → `Reviewed` → `Closed`

- **Permissions:** Only Admin can assign technicians.
- **Ownership:** Only the assigned technician can mark a job as completed.
- **Audit:** Managers may review completed jobs. Key actions should be traceable.

_You do not need to fully enforce these rules, but your system should consider them in design._

---

## 📦 Module 1 — Admin Portal · Order Submission

**Goal:** Admin creates a service order and assigns a technician.

### Section Details

- **Form fields:**
- Order No (auto-generated)
- Customer Name
- Phone
- Address
- Problem Description
- Service Type (dropdown)
- Quoted Price
- Assigned Technician
- Admin Notes

- **Key skills:** Front-end (responsive form, clean UI) + Back-end (auto-generated ID + write to database).
- **Bonus:**
- Show order summary after submission.
- Send WhatsApp notification to technician.

---

## 🧰 Module 2 — Technician Portal · Service Job

**Goal:** Technicians view assigned jobs and record completed service.

> **Important Note:** The technician workflow should prioritize speed and simplicity for field usage. Technicians should be able to complete the job quickly using a mobile device. Candidates may implement this as a mobile-first web interface or a mobile app.

### Section Details

- **Form fields:**
- Order ID (read-only)
- Work Done
- Extra Charges
- Upload $\le$ 6 photos / video / PDF
- Final Amount (auto-calculated)
- Remarks
- Technician Name
- Timestamp

- **Optional Bonus (Payment Capture):**
- Payment Amount
- Payment Method
- Receipt Photo

- **Key skills:** Front-end (mobile-friendly UI, simple field workflow) + Back-end (file upload, writing service completion data).
- **Bonus:**
- Generate WhatsApp feedback message to send to the customer.
- Notify manager/accounts when the job is completed.

### Sample Data & Context

```json
{
  "orderId": "ORDER1234",
  "customerName": "Ahmad",
  "address": "No. 12, Jalan Sejuk, Shah Alam",
  "service": "Aircond cleaning",
  "assignedTechnician": "Ali",
  "status": "Pending"
}
```

- **Mock technicians:** Ali, John, Bala, Yusoff

---

## 📣 Module 3 — WhatsApp Notification Trigger

**Goal:** Send WhatsApp notification when a job is marked `Job Done`.

- **Trigger Condition:** `status = Job Done`
- **Notification Methods:** WhatsApp (preferred) — e.g., a deep-link URL with a pre-filled message.

### Sample Message

> Hi `{{Customer Name}}`,
> Job `{{Order ID}}` has been completed by Technician `{{Name}}` at `{{Time}}`. Please check and leave feedback.
> Thank you!

- **Key skill:** Back-end trigger logic + API / deep-link integration.

---

## 📊 Bonus Module — KPI Dashboard

**Goal:** Display technician performance metrics.

### Section Details

- **Example Metrics:**
- Technician Name
- Jobs Completed
- Total Amount
- Postpone / Reschedule count

- **UI Suggestions:** Card layout, leaderboard, or simple charts.
- **Assessment Focus:** Data aggregation and clear visualisation.

_You may implement metrics using weekly data (minimum). Bonus if additional views are included._

---

## 🤖 AI Module — Operations Query Window

**Goal:** Build a simple AI assistant inside the portal that allows managers to ask operational questions about service data.

### Example Questions

- _"What jobs did technician Ali complete last week?"_
- _"Which technician completed the most jobs this week?"_
- _"How many jobs were completed today?"_

### Expected System Flow

```
User question
     ↓
System interprets question/query
     ↓
Database retrieves relevant data
     ↓
AI formats the response

```

#### Example Output

> Technician Ali completed 3 jobs last week:
>
> - `ORDER1234` – Cleaning
> - `ORDER1237` – Repair
> - `ORDER1241` – Gas refill

### Assessment Focus

We want to see:

1. How AI integrates with system data
2. How queries retrieve relevant records
3. How responses are generated clearly
4. How limitations are handled

---

## ⭐ Optional Advanced AI Challenges

_Candidates may optionally implement one or more of these:_

### 1. AI Workflow Supervisor

Use AI to flag potential issues in completed jobs.

- _Example alerts:_ Final amount much higher than quoted price, or job marked done but no photos uploaded.

### 2. AI Document Understanding

Use AI to extract structured data from uploaded documents.

- _Example extracted fields:_ Customer name, service type, service details, amount, date.

### 3. AI Operational Insight

Use AI to analyze operational data.

- _Example question:_ _"Which technician might be overloaded this week?"_
- _Example output:_ _"Technician Bala completed 11 jobs this week, which is significantly higher than the team average."_

---

## 💬 Optional Self-Assessment (README)

Candidates may include a breakdown of the following in their documentation:

- Which module was easiest?
- Which module was hardest?
- What would you improve in a real production system?
- How did you use AI tools while building this project?

---

## 📬 Submission Guide

Please provide either a **Live demo** (Netlify / Vercel / Firebase) or a **ZIP file**. A **GitHub repo** is highly preferred.

### README Checklist

Your `README.md` should explain:

- What you built & your chosen tech stack
- Architecture decisions, challenges, and assumptions
- How AI was integrated & what limitations exist in your implementation
- What types of AI queries are supported

_If you only completed one module, explain your logic clearly — it helps us see your strengths._

---

## 🎨 Design & Branding

- No logo required.
- **Focus on:** Clean UI, simple UX, and practical design.
- _Treat this like a real-world internal operations tool._

### ⏱️ Estimated Effort

Candidates are not expected to complete everything. A solid implementation of **one or two modules** with a clear explanation is sufficient. A well-explained partial implementation is completely acceptable.
