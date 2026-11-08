# Setup and configuration

## Prerequisites

Use Node.js `^20.19.0` or `>=22.12.0` (the installed Vite engine range), Python 3.12+ for Django 6, and pip. SQLite needs no separate server. Run npm commands at the repository root and Django commands from `sejuksejuk-backend/`.

Follow the [README quick start](../README.md#local-quick-start). On macOS/Linux, replace `.\.venv\Scripts\python.exe` with `.venv/bin/python` and `Copy-Item` with `cp`. Frontend dependencies use `package-lock.json`; backend dependencies are pinned in `requirements.txt`.

## Frontend environment

Create root `.env` from `.env.example`. Vite embeds these values in the browser bundle: include public configuration only. Restart Vite after changes, or rebuild deployed assets.

| Variable | Default in code | Purpose |
| --- | --- | --- |
| VITE_API_BASE_URL | http://localhost:8000 | Backend origin; Axios appends `/api`. Omit trailing slash and `/api`. |
| VITE_MEDIA_BASE_URL | http://localhost:8000 | Prefix for relative local media URLs. |
| VITE_CLOUDINARY_BASE_URL | Unset | Optional public base such as `https://res.cloudinary.com/your-cloud`. |

Remove the template's placeholder Cloudinary variable for local storage. Absolute attachment URLs pass through unchanged; relative attachment paths can be reconstructed as Cloudinary image/video/raw URLs when configured.

## Backend environment

Create backend `.env` from its example. Settings support more variables than the example lists.

| Variable | Default | Purpose |
| --- | --- | --- |
| SECRET_KEY | Insecure development fallback | Set a private random deployment value. |
| DEBUG | True | Set False for deployment. |
| ALLOWED_HOSTS | 127.0.0.1,localhost | Comma-separated backend hostnames. |
| DATABASE_URL | SQLite at backend db.sqlite3 | Database connection URL. |
| CORS_ALLOWED_ORIGINS | http://localhost:3000,http://127.0.0.1:3000 | Comma-separated browser origins, including port. |
| AI_PROVIDER | mock | openai, claude, gemini, mock; unknown names also fall back to mock. |
| OPENAI_API_KEY | Empty | OpenAI provider credential. |
| CLAUDE_API_KEY | Empty | Claude provider credential. |
| GEMINI_API_KEY | Empty | Gemini credential; explicitly checked at initialization. |
| CLOUDINARY_URL | Empty | Cloudinary connection configuration. |
| CLOUDINARY_CLOUD_NAME | Empty | Also enables Cloudinary when nonempty. |
| CLOUDINARY_API_KEY | Empty | Cloudinary credential. |
| CLOUDINARY_API_SECRET | Empty | Cloudinary secret. |

Without Cloudinary, uploads use backend `media/`. Django's development URL helper serves media in debug mode. Production local uploads need persistent storage and separate serving. WhiteNoise serves collected static assets, not production user media.

## Demo data and accounts

`python manage.py seed_users` creates HQ and missing usernames below. Existing passwords and roles are not reset. These are source-defined development credentials, not verified live deployment accounts.

| Role | Username | Initial password |
| --- | --- | --- |
| Admin | admin | admin1234 |
| Manager | manager | manager1234 |
| Technician | ali, john, bala, yusoff | tech1234 |

`python manage.py seed_all` also creates service types and operational records. Its `--flush` option deletes orders and related records, including notifications, before seeding. Use only in disposable development databases. `seed_users` alone does not create service types.

`createsuperuser` creates Django administration access, but the custom application role defaults to technician. Set the application role explicitly for an operations admin; staff/superuser flags and application roles are separate.

## Commands

| Directory | Command | Purpose |
| --- | --- | --- |
| Root | npm run dev | Vite, configured port 3000. |
| Root | npm run lint | ESLint. |
| Root | npm run build | TypeScript build followed by Vite output to dist/. |
| Root | npm run preview | Preview built frontend locally. |
| Backend | python manage.py migrate | Apply migrations. |
| Backend | python manage.py check | Django checks. |
| Backend | python -m pytest | Tests using pytest.ini and Django settings. |

Use virtual environment Python for backend commands. Frontend regression checks use Node's built-in runner: `node --experimental-strip-types --test tests/jobCompletion.test.ts` and `node --test tests/completionPage.test.mjs` from the repository root. Some backend tests are stale; see the architecture guide.

## Deployment

1. Set frontend public environment values, run `npm ci` and `npm run build`, and publish `dist/`.
2. Configure static hosting to fall back to `index.html` for browser routes such as `/orders/1`. Vite base is `/`.
3. Configure backend secrets, DEBUG=False, hosts, CORS origins, database, and storage.
4. From the backend directory, `bash build.sh` installs dependencies, collects static files, and migrates. It does not launch a server or seed users.
5. On a compatible host, a WSGI launch command is `gunicorn sejuksejuk.wsgi:application` from the backend directory.
6. Verify login, assignment, completion, uploads, review, and API connectivity with deployment-specific accounts.

Persist database and media data. AI checkpoints are process-local and are lost on restart; multiple workers do not share them.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| API/CORS failure | Backend running, API base omits /api, actual frontend origin allowed. Vite may choose another port if 3000 is occupied. |
| Empty technician picker | Seed users; check auth/users request. The client swallows errors and returns an empty list. |
| Missing service types | Use seed_all in a demo database or create types through Django admin. |
| Login redirects | Inspect refresh response and token expiry. Refresh failure redirects to login. |
| Broken files | Remove Cloudinary placeholder for local use; inspect file_url and production media serving. |
| Generic AI answer | Mock makes no tool calls; configure a real provider and restart. Model IDs are fixed in source. |
| Unexpected KPI totals | Read calculation rules: Today currently uses seven days; completed-job filtering uses report completed_at. |
