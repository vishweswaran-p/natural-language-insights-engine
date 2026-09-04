# API reference

Base URL: `http://localhost:1337`

All JSON responses use `Content-Type: application/json`. Errors return:

```json
{ "error": { "code": "ERROR_CODE", "message": "Human-readable message." } }
```

Long-running work (upload, questions) returns **202 Accepted** immediately. Poll the resource until it reaches a terminal status.

---

## Health

### `GET /health`

Liveness check.

**Response** `200`

```json
{ "status": "ok" }
```

---

## Datasets

### `GET /api/datasets`

List datasets, newest first.

**Response** `200`

```json
{
  "data": [
    {
      "id": "uuid",
      "filename": "sales.csv",
      "fileSizeBytes": 12345,
      "mimeType": "text/csv",
      "status": "READY",
      "metadata": { "...": "profiler output when READY" },
      "errorMessage": null,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

**Dataset status:** `PROCESSING` | `READY` | `FAILED`



### `GET /api/datasets/:id`

Fetch one dataset.

**Response** `200` — dataset object (same shape as above).

**Response** `404` — `DATASET_NOT_FOUND`

### `POST /api/datasets`

Upload a CSV and start ingestion.

**Request:** `multipart/form-data` with field `file` (`.csv` only, max 200 MB).

**Response** `202`

```json
{
  "dataset": { "...": "status PROCESSING" },
  "job": { "...": "INGESTION job" }
}
```

Poll `GET /api/datasets/:id` until `status` is `READY` or `FAILED`.

---

## Questions

### `GET /api/questions`

List questions, newest first.

**Response** `200`

```json
{ "data": [ { "...": "question object" } ] }
```



### `GET /api/questions/:id`

Fetch one question and its answer (when ready).

**Question status:** `PROCESSING` | `ANSWERED` | `REFUSED` | `FAILED`

- `ANSWERED` — includes `answer` (columns, rows, summary), `generatedSql`, and `usage`
- `REFUSED` — includes `refusalReason` (unanswerable or blocked by guardrail)
- `FAILED` — includes `errorMessage`

**Response** `404` — `QUESTION_NOT_FOUND`



### `POST /api/questions`

Ask a question against a **READY** dataset.

**Request body**

```json
{
  "datasetId": "uuid",
  "question": "What is the total revenue by country?"
}
```

**Response** `202`

```json
{
  "question": { "...": "status PROCESSING" },
  "job": { "...": "QUERY job" }
}
```

Poll `GET /api/questions/:id` until status is terminal.

**Response** `409` — dataset not ready (`DATASET_NOT_READY`)

---

## Jobs

### `GET /api/jobs/:id`

Fetch job status (optional; dataset/question endpoints are usually enough).

**Job status:** `QUEUED` | `RUNNING` | `COMPLETED` | `FAILED`

**Job type:** `INGESTION` | `QUERY`

**Response** `404` — `JOB_NOT_FOUND`

---

## LLM settings

Runtime provider selection (also available in the UI under **LLM**). Changes apply to new questions without restarting Docker. API keys are stored in memory for the session only.

### `GET /api/settings/llm`

**Response** `200`

```json
{
  "provider": "local",
  "model": "qwen2.5-coder:1.5b",
  "openaiApiKeyConfigured": true
}
```



### `PUT /api/settings/llm`

**Request body**

```json
{
  "provider": "openai",
  "openaiApiKey": "sk-..."
}
```

- `provider`: `local` (Ollama) or `openai`
- `openaiApiKey`: required when switching to OpenAI unless a key is already configured

**Response** `200` — same shape as GET.

**Response** `400` — `OPENAI_API_KEY_REQUIRED` or `INVALID_PROVIDER`

---

## Quick example

```bash
# Upload
curl -F "file=@data.csv;type=text/csv" http://localhost:1337/api/datasets

# Wait for READY
curl http://localhost:1337/api/datasets/<dataset-id>

# Ask
curl -X POST http://localhost:1337/api/questions \
  -H 'Content-Type: application/json' \
  -d '{"datasetId":"<dataset-id>","question":"What is the total revenue by country?"}'

# Wait for ANSWERED, REFUSED, or FAILED
curl http://localhost:1337/api/questions/<question-id>
```

