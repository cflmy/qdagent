#!/usr/bin/env python3
"""Web search helper for 求道 (legacy host).

Tries DuckDuckGo Instant Answer first; on timeout/empty falls back to
Bing CN HTML (reachable in many CN networks). Writes JSON to
data/tmp/last_web_search.json (or --out). Evidence only.
"""
from __future__ import annotations

import argparse
import html as html_lib
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def http_get(url: str, timeout: float = 8.0) -> tuple[int, str]:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.getcode() or 200, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace") if e.fp else ""
        return int(e.code), body
    except Exception as e:  # noqa: BLE001 — surface as soft failure
        return 0, str(e)


def ddg_instant(query: str, limit: int) -> dict:
    q = urllib.parse.quote(query)
    url = (
        f"https://api.duckduckgo.com/?q={q}&format=json&no_html=1&skip_disambig=1"
    )
    status, body = http_get(url, timeout=5.0)
    hits: list[dict] = []
    if status != 200 or not body.strip().startswith("{"):
        return {
            "ok": False,
            "provider": "duckduckgo",
            "http_status": status,
            "hits": [],
            "error": body[:240] if status == 0 else f"HTTP {status}",
        }
    data = json.loads(body)
    abs_text = (data.get("AbstractText") or "").strip()
    if abs_text:
        hits.append(
            {
                "title": data.get("Heading") or query,
                "url": data.get("AbstractURL") or "",
                "snippet": abs_text,
                "source": "duckduckgo",
            }
        )
    for topic in data.get("RelatedTopics") or []:
        if len(hits) >= limit:
            break
        if not isinstance(topic, dict):
            continue
        text = (topic.get("Text") or "").strip()
        if not text:
            continue
        hits.append(
            {
                "title": "related",
                "url": topic.get("FirstURL") or "",
                "snippet": text,
                "source": "duckduckgo",
            }
        )
    return {
        "ok": True,
        "provider": "duckduckgo",
        "http_status": status,
        "hits": hits[:limit],
        "query": query,
        "hint": "evidence only — verify before trusting",
        "authority": "web-evidence",
    }


def bing_cn(query: str, limit: int) -> dict:
    params = urllib.parse.urlencode(
        {"q": query, "setlang": "zh-Hans", "mkt": "zh-CN"}
    )
    url = f"https://cn.bing.com/search?{params}"
    status, body = http_get(url, timeout=12.0)
    hits: list[dict] = []
    if status != 200 or "b_algo" not in body:
        return {
            "ok": False,
            "provider": "bing-cn",
            "http_status": status,
            "hits": [],
            "error": body[:240] if status == 0 else "no b_algo results",
            "query": query,
        }
    blocks = re.findall(r'class="b_algo"[^>]*>([\s\S]*?)</li>', body)
    for block in blocks:
        if len(hits) >= limit:
            break
        m = re.search(
            r'<h2[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)</a>', block
        )
        if not m:
            continue
        href, title_html = m.group(1), m.group(2)
        p = re.search(r"<p[^>]*>([\s\S]*?)</p>", block)
        snip_html = p.group(1) if p else ""
        title = html_lib.unescape(re.sub(r"<[^>]+>", "", title_html)).strip()
        snip = html_lib.unescape(re.sub(r"<[^>]+>", "", snip_html)).strip()
        if not title:
            continue
        hits.append(
            {
                "title": title,
                "url": href,
                "snippet": snip[:500],
                "source": "bing-cn",
            }
        )
    return {
        "ok": True,
        "provider": "bing-cn",
        "http_status": status,
        "hits": hits,
        "query": query,
        "hint": "evidence only — verify before trusting",
        "authority": "web-evidence",
    }


def search(query: str, limit: int) -> dict:
    query = (query or "").strip()
    if not query:
        return {"ok": True, "provider": "none", "hits": [], "hint": "empty query"}
    limit = max(1, min(int(limit or 5), 8))
    primary = ddg_instant(query, limit)
    if primary.get("ok") and primary.get("hits"):
        return primary
    fallback = bing_cn(query, limit)
    if fallback.get("ok") and fallback.get("hits"):
        fallback["fallback_from"] = primary.get("provider")
        fallback["fallback_error"] = primary.get("error")
        return fallback
    return {
        "ok": False,
        "provider": "none",
        "hits": [],
        "query": query,
        "error": fallback.get("error") or primary.get("error") or "no hits",
        "tried": [primary.get("provider"), fallback.get("provider")],
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("query", nargs="?", default="")
    ap.add_argument("--limit", type=int, default=5)
    ap.add_argument("--out", default="")
    args = ap.parse_args()
    query = args.query or os.environ.get("QDAGENT_WEB_QUERY", "")
    limit = args.limit
    if os.environ.get("QDAGENT_WEB_LIMIT"):
        try:
            limit = int(os.environ["QDAGENT_WEB_LIMIT"])
        except ValueError:
            pass
    out = search(query, limit)
    text = json.dumps(out, ensure_ascii=False)
    out_path = args.out or os.environ.get("QDAGENT_WEB_OUT", "")
    if not out_path:
        root = Path(__file__).resolve().parents[2]
        out_path = str(root / "data" / "tmp" / "last_web_search.json")
    path = Path(out_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text + "\n", encoding="utf-8")
    print(text)
    return 0 if out.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main())
