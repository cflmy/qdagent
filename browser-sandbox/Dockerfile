FROM node:22-bookworm-slim
WORKDIR /opt/browser-service
COPY .marqdo/docker-context/browser/node_modules/ ./node_modules/
RUN node node_modules/playwright-core/cli.js install-deps chromium
COPY .marqdo/docker-context/browser/chromium/ /opt/chromium/
RUN groupadd --gid 10002 browser && useradd --uid 10002 --gid 10002 --create-home browser
COPY browser-sandbox/ ./
ENV HOME=/tmp/browser-home CHROMIUM_EXECUTABLE=/opt/chromium/chrome NODE_ENV=production
USER 10002:10002
CMD ["node","server.mjs"]
