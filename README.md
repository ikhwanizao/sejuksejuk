# Sejuk Sejuk Operations

An internal air-conditioner service operations application. Admins create orders and assign technicians; technicians record work, attachments, and payments; managers and admins review jobs and monitor performance.

The React frontend lives at the repository root; the Django API lives in `sejuksejuk-backend/`. This documentation was rewritten from the implementation. Live deployments and external AI model availability have not been verified.

## Documentation

- [Setup and configuration](docs/setup.md)
- [Architecture and known limitations](docs/architecture.md)
- [API reference](docs/api.md)
- [User workflows](docs/workflows.md)

## Stack

| Area | Implementation |
| --- | --- |
| Frontend | React 19, TypeScript 6, Vite 8, React Router 7 |
| UI and forms | Tailwind CSS 4, Radix/shadcn components, React Hook Form, Zod, Sonner |
| Client data | TanStack Query 5, Axios, Zustand |
| Backend | Django 6, Django REST Framework, SimpleJWT |
| Database | SQLite by default; PostgreSQL through DATABASE_URL |
| Uploads | Local files by default; optional Cloudinary |
| AI | LangGraph agent with read-only ORM tools; mock by default |

## Local quick start

Use Node.js compatible with Vite (`^20.19.0` or `>=22.12.0`) and Python 3.12+ for Django 6. These PowerShell commands start at the repository root. Copy environment templates only for new local files; preserve existing configuration.

```powershell
Copy-Item .env.example .env
# Edit .env; remove VITE_CLOUDINARY_BASE_URL for local file storage.
npm ci
npm run dev
```

In another terminal:

```powershell
cd sejuksejuk-backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
# Edit .env, including SECRET_KEY.
.\.venv\Scripts\python.exe manage.py migrate
.\.venv\Scripts\python.exe manage.py seed_all
.\.venv\Scripts\python.exe manage.py runserver
```

Open the frontend at `http://localhost:3000`. The backend runs at `http://localhost:8000`; Swagger UI is `/api/docs/` and OpenAPI is `/api/schema/`.

`seed_all` creates demo users and operational data. Use it only in development. See the setup guide for credentials, the narrower `seed_users` command, and destructive seed options.

## Lifecycle

```text
new -> assigned -> in_progress -> job_done -> reviewed -> closed
```

Admins can reassign an assigned or in-progress order without changing its status. Submitting work details marks the job done immediately; uploads and optional payment are separate requests afterward.

## Development checks

```powershell
npm run lint
npm run build
cd sejuksejuk-backend
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe -m pytest
```

Frontend regression checks run directly with Node: `node --experimental-strip-types --test tests/jobCompletion.test.ts` and `node --test tests/completionPage.test.mjs`. There is no npm test script. Backend tests include stale interfaces and expectations, detailed in the architecture guide. Documentation changes do not imply that these checks pass.
