# Legacy Python hosts (pre Marqdo 0.3.7)

Superseded by `ext/web` `代理`/`调用` and `agent.mcp_server` (see `doc/gaps/01-marqdo-hard-limits.md`).

Enable only with `QDAGENT_LEGACY_PROXY=1 ./scripts/mq.sh run index.mq.md`.

## web_search.py

Still used by `lib/web_search.mq.md` for DuckDuckGo Instant Answer with Bing CN HTML fallback
(when DDG is unreachable). Invoked via `sys.exec`; writes `data/tmp/last_web_search.json`.
