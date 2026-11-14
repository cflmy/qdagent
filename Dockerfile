FROM node:22-bookworm-slim AS frontend-build
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

FROM golang:1.26-bookworm AS server-build
WORKDIR /build/server
COPY server/go.mod server/go.sum ./
COPY .marqdo/go-vendor/ ./vendor/
COPY server/ ./
RUN CGO_ENABLED=1 go build -mod=vendor -buildvcs=false -trimpath -ldflags="-s -w" -o /out/qdagent ./cmd/qdagent

FROM python:3.12-slim@sha256:6b25cbe6577518889d553cdd5a5da97d259348d8f6e45b527dd731caaba27a07
RUN apt-get update && apt-get install -y --no-install-recommends nodejs npm sqlite3 git curl build-essential pkg-config ca-certificates libgcc-s1 libreoffice-writer libreoffice-impress fonts-noto-cjk && rm -rf /var/lib/apt/lists/*
RUN groupadd --gid 10001 qdagent && useradd --uid 10001 --gid 10001 --create-home qdagent
WORKDIR /app
COPY .marqdo/docker-context/bin/marqdo /usr/local/bin/marqdo
COPY --from=server-build /out/qdagent /usr/local/bin/qdagent
COPY --from=frontend-build --chown=10001:10001 /build/frontend/dist /app/frontend/dist
COPY --chown=10001:10001 lib/ /app/lib/
COPY --chown=10001:10001 ext/ /app/ext/
COPY --chown=10001:10001 pages/ /app/pages/
COPY --chown=10001:10001 worker/provider.py /app/worker/provider.py
COPY --chown=10001:10001 kb/ /app/kb/
RUN mkdir -p /app/data /app/.secrets && chown 10001:10001 /app /app/data /app/.secrets && chmod 0755 /usr/local/bin/marqdo /usr/local/bin/qdagent
ENV HOME=/home/qdagent QDAGENT_ROOT=/app QDAGENT_FRONTEND=/app/frontend/dist MARQDO_LIB=/app/lib MARQDO_EXT=/app/ext MARQDO_EXT_NO_DOWNLOAD=1 PYTHONDONTWRITEBYTECODE=1 XDG_CACHE_HOME=/app/data/cache PIP_CACHE_DIR=/app/data/cache/pip npm_config_cache=/app/data/cache/npm
USER 10001:10001
EXPOSE 7964
HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=3 CMD ["qdagent","--healthcheck"]
ENTRYPOINT ["qdagent"]
