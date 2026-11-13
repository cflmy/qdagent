FROM python:3.12-slim@sha256:6b25cbe6577518889d553cdd5a5da97d259348d8f6e45b527dd731caaba27a07
RUN apt-get update && apt-get install -y --no-install-recommends nodejs npm sqlite3 git curl build-essential pkg-config ca-certificates libgcc-s1 libreoffice-writer libreoffice-impress fonts-noto-cjk && rm -rf /var/lib/apt/lists/*
RUN groupadd --gid 10001 qdagent && useradd --uid 10001 --gid 10001 --create-home qdagent
WORKDIR /app
COPY .marqdo/docker-context/bin/marqdo /usr/local/bin/marqdo
COPY --chown=10001:10001 .marqdo/docker-context/app/ /app/
RUN mkdir -p /app/data /app/pages/data /app/.secrets && chown 10001:10001 /app /app/data /app/pages/data /app/.secrets && chmod 0755 /usr/local/bin/marqdo
ENV HOME=/home/qdagent MARQDO_LIB=/app/lib MARQDO_EXT=/app/ext MARQDO_EXT_NO_DOWNLOAD=1 PYTHONDONTWRITEBYTECODE=1 XDG_CACHE_HOME=/app/data/cache PIP_CACHE_DIR=/app/data/cache/pip npm_config_cache=/app/data/cache/npm
USER 10001:10001
EXPOSE 7964
HEALTHCHECK --interval=20s --timeout=10s --start-period=45s --retries=3 CMD ["marqdo","call","deploy/health.mq.md","check","--fs-root","/app","--effects","network.read,process.control","--json"]
ENTRYPOINT ["marqdo","call","deploy/index.mq.md","serve","--fs-root","/app","--effects","plugin,fs.read,fs.write,process.exec,process.control,output.write,network.read,network.write,time.read,random.read,environment.read","--json"]
