# Natural Language Insights Engine

Upload an arbitrary transactional CSV, profile it asynchronously, and ask
plain-English analytical questions that are answered by executing safe,
LLM-generated SQL against the uploaded dataset.

> **Status: Phase 0 (scaffolding only).**
> This phase establishes the repository layout and a lightweight
> Ports & Adapters (Hexagonal) architecture for the backend. None of the
> product functionality (CSV upload, profiling, LLM SQL generation, query
> execution) is implemented yet — those arrive in later phases.

## Repository layout

```
.
├── backend/    # Node + TypeScript + Sails (thin HTTP/runtime layer)
└── frontend/   # React + TypeScript + Vite (added in a later step)
```

### Backend architecture (feature-based Ports & Adapters)

Feature-based hexagonal architecture (inbound/outbound adapters). Sails is only
the HTTP runtime — there are **no** Sails controllers or hand-written per-feature
route mappings; features own their routes.

- **`src/features/<feature>/`**
  - `application/` — use-cases, ports (interfaces), and domain types. No HTTP,
    no framework/ORM imports.
  - `adapters/factory.ts` — the single place that builds a use-case and (later)
    wires its outbound adapters in (plain TypeScript, no DI framework).
  - `adapters/inbound/http/routes/` — thin route adapters + `index.ts` exporting
    `getRoutes()`.
  - `adapters/outbound/` — concrete adapters implementing the ports (added when a
    use-case needs I/O; currently placeholders for `dataset`).
- **`src/shared/http/`** — a tiny framework-agnostic HTTP seam: `types.ts`
  (`RouteDefinition`, `HttpResponse`, `Ctx`), `response.ts` (`ok` / `noContent` /
  `withStatus`), and `bridge/sails.ts` (adapts route definitions to a Sails route
  map — the only touchpoint with Sails).
- **`config/routes.ts`** — the HTTP composition root: gathers each feature's
  `getRoutes()` and hands them to the Sails bridge.

Everything under `src/` stays free of Sails imports. The `health` endpoint is
implemented end-to-end in this style; the `dataset` feature currently holds the
finalized domain types and ports only.

## Local development

Prerequisites: Node.js >= 20.

### Backend

```bash
cd backend
npm install
npm run dev        # compiles TypeScript then lifts Sails
```

Then verify the health endpoint:

```bash
curl http://localhost:1337/health
# { "status": "ok" }
```

Other backend scripts: `npm run build`, `npm run start`, `npm run typecheck`.

From the repo root you can also run `npm run dev:backend` and
`npm run typecheck`.

### Frontend

Added in a later step (React + TypeScript + Vite).

## Deferred to later phases

Docker/compose, PostgreSQL, Redis, BullMQ, DuckDB, LLM providers, file
upload, migrations, dataset ingestion, authentication, request validation, and
frontend styling are intentionally **not** included in Phase 0. The HTTP layer
is kept deliberately small (a single error boundary in the Sails bridge);
middleware, auth, input/output validation, and typed error mapping are added in
later phases when a use-case actually needs them.
