# Legacy Python hosts (pre Marqdo 0.3.7)

Superseded by `ext/web` `代理`/`调用` and `agent.mcp_server` (see `doc/gaps/01-marqdo-hard-limits.md`).

Enable only with `QDAGENT_LEGACY_PROXY=1 ./scripts/mq.sh run index.mq.md`.

## web_search.py

Used by `lib/web_search.mq.md`. Prefer **Baidu** HTML, then 360 so.com; Bing CN is last
resort (datacenter IPs often get SEO spam). Strips chat fluff from the query before search.
Writes `data/tmp/last_web_search.json`. Set `QDAGENT_SKIP_DDG=1` to skip DDG Instant Answer.
