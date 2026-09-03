# Natural Language Insights Engine

Upload a CSV dataset and ask plain-English analytical questions, answered by
executing safe, LLM-generated SQL against the uploaded data.

> **Status:** CSV upload, asynchronous profiling (schema + statistics via DuckDB),
> dataset listing, and a React UI for the dataset flow. Natural-language querying
> is wired next (the Ask a Question screen is a shell for now).

## Tech stack

- **Backend:** Node.js, TypeScript, Sails.js, PostgreSQL
- **Frontend:** React, TypeScript, Vite (no extra runtime dependencies)

## Prerequisites

- Node.js >= 20
- Docker (for PostgreSQL)

## Setup & run

Run everything from one server: the backend serves the built frontend and the API
from the same origin.

```bash
# 1. Start PostgreSQL (docker compose, host port 5435)
npm run db:up

# 2. Install dependencies (backend + frontend) and configure the backend
npm run setup
cp backend/.env.example backend/.env   # DATABASE_URL already matches the compose port

# 3. Build the frontend + backend and start the server
npm start
```

Open **`http://localhost:1337`** for the UI; the API is on the same origin under
`/api`. `npm start` creates the DB schema and starts the background worker
in-process, so this is the only command you need.

### Frontend development (hot reload)

For active frontend work, run the two dev servers instead. The Vite dev server
(port 5173) proxies `/api` to the backend:

```bash
npm run dev:backend    # API on http://localhost:1337
npm run dev:frontend   # UI on http://localhost:5173 (hot reload)
```

## Background worker

Dataset profiling runs as an asynchronous background job. **By default the worker
runs in-process with the API**, so `npm run dev` gives you a fully working backend
with nothing else to start.

To run it as its own process instead (e.g. to isolate or scale profiling), start
the API without the in-process worker and run the worker separately:

```bash
# Terminal 1 — API only (no in-process worker)
RUN_WORKER_IN_API=false npm run dev

# Terminal 2 — standalone worker
npm run worker
```

Both share the same PostgreSQL job queue, so multiple workers can run safely.

## Try it

```bash
# Health check
curl http://localhost:1337/health

# Upload a CSV — returns 202 with the new dataset (status PROCESSING) and a job
curl -F "file=@sales.csv;type=text/csv" http://localhost:1337/api/datasets

# Poll the ingestion job until it is COMPLETED (or FAILED)
curl http://localhost:1337/api/jobs/<jobId>

# Fetch the dataset — once READY, `metadata` holds the profiled schema + statistics
curl http://localhost:1337/api/datasets/<id>

# List all datasets
curl http://localhost:1337/api/datasets
```

Uploads must be `.csv` and up to 200 MB. Uploading is asynchronous: a dataset
starts as `PROCESSING` while the worker profiles it in the background, then moves
to `READY` (or `FAILED`). Once the UI lands in a later phase, this is where you'll
upload datasets and ask questions from the browser.

## How it's organized

A monorepo with `backend/` and `frontend/`. The backend uses a lightweight Ports &
Adapters (hexagonal) architecture: business logic lives in framework-agnostic
use-cases, and Sails is only a thin HTTP layer. The frontend is a plain React SPA
that talks to the API over `fetch`.

## Deferred to later phases

- Natural-language questions → LLM-generated SQL → query execution (UI shell exists)
- Authentication, pagination, and automated tests
