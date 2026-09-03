# Natural Language Insights Engine

Upload a CSV dataset and ask plain-English analytical questions, answered by
executing safe, LLM-generated SQL against the uploaded data.

> **Status:** early phase. The backend supports CSV upload and dataset listing;
> profiling, natural-language querying, and the UI arrive in later phases.

## Tech stack

- **Backend:** Node.js, TypeScript, Sails.js, PostgreSQL
- **Frontend:** React, TypeScript, Vite _(added in a later phase)_

## Prerequisites

- Node.js >= 20
- Docker (for PostgreSQL)

## Setup & run

```bash
# 1. Start PostgreSQL (docker compose, host port 5435)
npm run db:up

# 2. Configure the backend
cd backend
cp .env.example .env      # DATABASE_URL already matches the compose port
npm install

# 3. Start the backend (creates the DB schema on startup)
npm run dev
```

The API is now available at `http://localhost:1337`.

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

# Upload a CSV
curl -F "file=@sales.csv;type=text/csv" http://localhost:1337/api/datasets

# List / fetch datasets
curl http://localhost:1337/api/datasets
curl http://localhost:1337/api/datasets/<id>
```

Uploads must be `.csv` and up to 200 MB. Once the UI lands in a later phase, this
is where you'll upload datasets and ask questions from the browser.

## How it's organized

A monorepo with `backend/` and `frontend/` (frontend added later). The backend
uses a lightweight Ports & Adapters (hexagonal) architecture: business logic
lives in framework-agnostic use-cases, and Sails is only a thin HTTP layer.

## Deferred to later phases

- Dataset profiling (schema + statistics via DuckDB)
- Async processing and status transitions (`PROCESSING → READY/FAILED`)
- Natural-language questions → LLM-generated SQL → query execution
- Frontend UI
- Authentication, pagination, and automated tests
