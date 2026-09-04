# Multi-stage build: frontend (Vite) + backend (TypeScript/Sails) → single Node
# image that serves the SPA and API from one process on port 1337.

# --- frontend build -----------------------------------------------------------
FROM node:20-bookworm-slim AS frontend-build

WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- backend build ------------------------------------------------------------
FROM node:20-bookworm-slim AS backend-build

WORKDIR /build/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build

# --- production runtime -------------------------------------------------------
FROM node:20-bookworm-slim AS production

# curl: entrypoint waits for Ollama and pulls the model on first boot.
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# Production dependencies only (@duckdb/node-api ships prebuilt native binaries).
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev

COPY --from=backend-build /build/backend/dist ./dist
# Backend serves the SPA from ../../../frontend/dist relative to dist/config/.
COPY --from=frontend-build /build/frontend/dist /app/frontend/dist

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p data/uploads

EXPOSE 1337

ENTRYPOINT ["/entrypoint.sh"]
