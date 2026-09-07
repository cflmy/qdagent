# syntax=docker/dockerfile:1
# Marqdo-native qdagent — no Python.
FROM debian:bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates libssl3 \
  && rm -rf /var/lib/apt/lists/*

COPY docker/bin/marqdo /usr/local/bin/marqdo
RUN chmod +x /usr/local/bin/marqdo

# Official extensions + native plugins (web / agent / llm / …)
COPY docker/marqdo-home /root/.marqdo

WORKDIR /app
COPY index.mq.md 求道-询问.mq.md 求道-捕捉.mq.md 求道-同步.mq.md ./
COPY lib ./lib
COPY db ./db
COPY components ./components
COPY styles ./styles
COPY public ./public

ENV HOME=/root \
    MARQDO_EXT=/root/.marqdo/ext \
    QDAGENT_HOST=0.0.0.0 \
    QDAGENT_PORT=7431 \
    QDAGENT_DATA=/data

VOLUME ["/data"]
EXPOSE 7431

CMD ["marqdo", "run", "index.mq.md"]
