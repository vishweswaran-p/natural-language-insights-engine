# Natural Language Insights Engine

Upload a CSV dataset and ask plain-English analytical questions. Questions are
answered by an LLM that generates SQL, which is validated by a read-only
guardrail and executed against the uploaded data with DuckDB; the resulting rows
are then summarized back in natural language.

> **Status:** end-to-end and working. CSV upload → asynchronous profiling
> (schema + statistics) → natural-language querying (LLM SQL → guardrail →
> execution → summary) → a React UI covering datasets, asking questions, and a
> question history.

## Highlights

- **Asynchronous by design.** Uploads and questions return `202 Accepted`
immediately and are processed by a background worker through a PostgreSQL job
queue (with retries and stale-job recovery). The same queue/worker serves both
ingestion and query jobs.
- **Swappable LLM provider.** The application depends only on an `LlmProvider`
port; a single OpenAI-compatible adapter serves both hosted **OpenAI** and a
local **Ollama** model. Switching is an environment change — no code edits.
- **Safe SQL execution.** LLM-generated SQL passes an application-level guardrail
that allows only a single read-only `SELECT`/`WITH` statement and blocks writes,
DDL, and file/system access before it ever reaches the query engine.
- **Cost & observability.** Every question records its provider, model, token
counts, estimated cost, and latency.
- **Large-file friendly storage.** During ingestion DuckDB profiles the CSV and
materializes a columnar Parquet copy (`data.parquet`). Queries prefer Parquet for
faster repeated scans; datasets ingested before this change fall back to CSV.
- **Ports & Adapters.** Business logic is framework-agnostic; PostgreSQL, DuckDB,
the filesystem, and the LLM are all adapters behind ports and can be swapped.

## Tech stack

- **Backend:** Node.js, TypeScript, Sails.js (thin HTTP runtime), PostgreSQL, DuckDB
- **Frontend:** React, TypeScript, Vite (no extra runtime dependencies)
- **Infrastructure:** Docker Compose (PostgreSQL + Ollama by default; optional full-stack app image via a Compose profile)

## Prerequisites

- **Docker** (recommended — runs everything with one command)
- **Node.js >= 20** (only if developing on the host without Docker)

## Docker setup

`docker-compose.yml` always defines **PostgreSQL** and **Ollama**. The
**application container** is optional — it sits behind the Compose profile `full`
so local development does not build or start the app image unless you ask for it.

| Goal | Command | What runs |
| ---- | ------- | --------- |
| **Quick start** (reviewers, demo) | `npm run docker:up` | Postgres + Ollama + **built app image** on port 1337 |
| **Local development** (hot reload) | `npm run db:up` | Postgres + Ollama only; app runs on the host |

Equivalent raw Compose commands:

```bash
# Infra only (default — no app image build)
docker compose up -d

# Full stack (builds Dockerfile → app container)
docker compose --profile full up --build
```

### How the app image is built (`Dockerfile`)

The Dockerfile is a **multi-stage build** that produces one production image:

1. **frontend-build** — `npm ci` + `vite build` → static SPA in `frontend/dist`
2. **backend-build** — `npm ci` + `tsc` → compiled API in `backend/dist`
3. **production** — production `npm ci` for backend, copies both build outputs into a slim Node 20 image

At runtime, `docker/entrypoint.sh`:

- waits for Ollama and pulls the configured model (when `LLM_PROVIDER=local`)
- starts `node dist/app.js` — Sails serves the API **and** the built frontend on port **1337**

Uploads persist in the `insights-uploads` Docker volume (`backend/data/uploads`).

### Quick start (Docker — recommended for reviewers)

One command builds the app image and starts PostgreSQL, Ollama, and the API +
in-process worker. On first boot the entrypoint pulls the Ollama model — this can
take a few minutes.

```bash
npm run docker:up
# or: docker compose --profile full up --build
```

Open **`http://localhost:1337`** for the UI and API (same origin).

Optional: copy `.env.example` to `.env` in the repo root to override settings
(e.g. `LLM_PROVIDER=openai` and `OPENAI_API_KEY=sk-...`).

```bash
cp .env.example .env   # edit as needed
npm run docker:up
```

Stop and remove the full stack:

```bash
npm run docker:down
```

## Local development (on the host)

For active development with hot reload, start **only** Postgres and Ollama in
Docker. A plain `docker compose up` does **not** build or run the app container.

```bash
# 1. Start PostgreSQL + Ollama only
npm run db:up

# 2. Install dependencies and configure the backend
npm run setup
cp backend/.env.example backend/.env   # DATABASE_URL matches compose port 5435

# 3. (Local LLM only) pull the model once if not already present
docker compose exec ollama ollama pull qwen2.5-coder:1.5b

# 4. Build and start (or use dev servers below)
npm start
```

Stop infra when done: `npm run db:down`

Open **`http://localhost:1337`** for the UI; the API is on the same origin under
`/api`.

### Frontend development (hot reload)

For active frontend work, run the two dev servers instead. The Vite dev server
(port 5173) proxies `/api` to the backend:

```bash
npm run dev:backend    # API on http://localhost:1337
npm run dev:frontend   # UI on http://localhost:5173 (hot reload)
```

## LLM configuration

The provider is chosen at boot from environment variables. When using Docker,
set them in a root `.env` file (see `.env.example`). For host development, use
`backend/.env`. Switching is env-only.


| Variable          | Purpose                               | Default                     |
| ----------------- | ------------------------------------- | --------------------------- |
| `LLM_PROVIDER`    | `openai` (hosted) or `local` (Ollama) | `local`                     |
| `OPENAI_API_KEY`  | Required when `LLM_PROVIDER=openai`   | —                           |
| `OPENAI_BASE_URL` | OpenAI-compatible base URL            | `https://api.openai.com/v1` |
| `OPENAI_MODEL`    | Hosted model                          | `gpt-4o-mini`               |
| `OLLAMA_BASE_URL` | Local Ollama OpenAI-compatible URL    | `http://localhost:11434/v1` |
| `OLLAMA_MODEL`    | Local model                           | `qwen2.5-coder:1.5b`        |


**Local (default):** Ollama runs in Docker via `npm run db:up`. Pull a model once
with `docker compose exec ollama ollama pull qwen2.5-coder:1.5b`. Under Docker on
macOS/Windows inference is CPU-only, so a small model keeps responses fast; bump
to `qwen2.5-coder:7b` for higher-quality SQL. No API key or cost.

**Hosted:** set `LLM_PROVIDER=openai` and `OPENAI_API_KEY=...`, then restart the
backend. The app boots without a key (dataset ingestion still works); only
question answering requires it.

## API reference

All endpoints are under the same origin as the UI.


| Method & path            | Description                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------- |
| `GET /health`            | Liveness check.                                                                    |
| `POST /api/datasets`     | Upload a CSV (`multipart/form-data`, field `file`). `202` with `{ dataset, job }`. |
| `GET /api/datasets`      | List datasets (newest first).                                                      |
| `GET /api/datasets/:id`  | Get one dataset; `metadata` holds the profiled schema + statistics once `READY`.   |
| `GET /api/jobs/:id`      | Get a background job's status.                                                     |
| `POST /api/questions`    | Ask a question (`{ datasetId, question }`). `202` with `{ question, job }`.        |
| `GET /api/questions`     | List questions with their answers (newest first).                                  |
| `GET /api/questions/:id` | Get one question; poll until `status` is terminal.                                 |


Datasets move `PROCESSING → READY | FAILED`. Questions move
`PROCESSING → ANSWERED | REFUSED | FAILED` (`REFUSED` = unanswerable from the data
or rejected by the guardrail; a normal outcome, not an error).

### Try it

```bash
# Upload a CSV — returns 202 with the dataset (PROCESSING) and its job
curl -F "file=@sales.csv;type=text/csv" http://localhost:1337/api/datasets

# Poll the dataset until READY
curl http://localhost:1337/api/datasets/<id>

# Ask a question — returns 202 with the question (PROCESSING) and its job
curl -X POST http://localhost:1337/api/questions \
  -H 'Content-Type: application/json' \
  -d '{"datasetId":"<id>","question":"What is the total revenue by region?"}'

# Poll the question until ANSWERED / REFUSED / FAILED
curl http://localhost:1337/api/questions/<questionId>
```

Uploads must be `.csv` and up to 200 MB.

## Background worker

Ingestion and query answering run as asynchronous background jobs. **By default
the worker runs in-process with the API**, so `npm start` gives a fully working
backend with nothing else to start.

To run it as its own process instead (e.g. to isolate or scale processing), start
the API without the in-process worker and run the worker separately:

```bash
# Terminal 1 — API only (no in-process worker)
RUN_WORKER_IN_API=false npm run dev:backend

# Terminal 2 — standalone worker
npm --prefix backend run worker
```

Both share the same PostgreSQL job queue, so multiple workers can run safely.

## How it's organized

A monorepo with `backend/` and `frontend/`.

The backend uses a lightweight **Ports & Adapters (hexagonal)** architecture,
organized by feature (`dataset`, `question`, `health`):

```
backend/src/
  features/<feature>/
    application/   # domain models, ports (interfaces), use-cases, workers — framework-agnostic
    adapters/      # inbound (HTTP routes) + outbound (PostgreSQL, DuckDB, LLM, storage) + a factory (composition)
  shared/          # cross-cutting HTTP, persistence, runtime helpers
  composition/     # cross-feature composition roots (schema aggregation, background worker)
```

Business logic depends only on ports; Sails is just a thin HTTP layer, and
concrete adapters are wired in per-feature factories. Imports use the `@app/*`
path alias. The frontend is a plain React SPA (page-state navigation, a shared
`fetch` client, and a polling hook for question results).

## Deferred / next steps

- **Automated tests** (query engine, job processors are the priority beyond the
existing SQL guardrail suite).
- Authentication and pagination on the list endpoints.

