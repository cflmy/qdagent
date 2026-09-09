#!/usr/bin/env python3
"""Web search helper for 求道 (legacy host).

Provider order (this network):
  1. Baidu HTML — reliable for zh queries
  2. 360 so.com HTML — fallback
  3. Bing CN HTML — last resort (often SEO-spam from datacenter IPs)
  4. DuckDuckGo Instant Answer — optional, often unreachable

Writes JSON to data/tmp/last_web_search.json (or --out / QDAGENT_WEB_OUT).
Evidence only.
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
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)


def http_get(url: str, timeout: float = 15.0) -> tuple[int, str]:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": UA,
            "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.getcode() or 200, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace") if e.fp else ""
        return int(e.code), body
    except Exception as e:  # noqa: BLE001
        return 0, str(e)


def focus_query(query: str) -> str:
    """Strip chat fluff so engines rank the substance (e.g. 百香果)."""
    q = (query or "").strip()
    if not q:
        return q
    patterns = [
        r"你(现在)?(能|可以)?不能?",
        r"联网(搜索|检索)?(一下)?",
        r"(请)?(帮(助)?我|帮忙)",
        r"(帮我)?(搜索|检索|查)(一下)?",
        r"帮助我",
        r"一下",
    ]
    for p in patterns:
        q = re.sub(p, " ", q)
    q = re.sub(r"[？?！!。．]+", " ", q)
    q = re.sub(r"\s+", " ", q).strip()
    # If fluff removal emptied the string, keep original.
    return q or query.strip()


def _strip_tags(s: str) -> str:
    return html_lib.unescape(re.sub(r"<[^>]+>", "", s or "")).strip()


def baidu(query: str, limit: int) -> dict:
    params = urllib.parse.urlencode({"wd": query, "rn": max(limit, 8)})
    url = f"https://www.baidu.com/s?{params}"
    status, body = http_get(url, timeout=18.0)
    if status != 200 or "百度" not in body[:800] and "baidu" not in body[:800].lower():
        # still try parse if large body
        if status != 200 or len(body) < 500:
            return {
                "ok": False,
                "provider": "baidu",
                "http_status": status,
                "hits": [],
                "error": body[:240] if status == 0 else f"HTTP {status}",
                "query": query,
            }
    hits: list[dict] = []
    # Modern + classic Baidu result titles
    h3s = re.findall(
        r"<h3[^>]*>\s*<a[^>]+href=\"([^\"]+)\"[^>]*>([\s\S]*?)</a>\s*</h3>",
        body,
        flags=re.I,
    )
    abstracts = re.findall(
        r'class="(?:c-abstract|content-right_\w+|span-list_[^"]*)"[^>]*>([\s\S]*?)</(?:span|div)>',
        body,
        flags=re.I,
    )
    for i, (href, title_html) in enumerate(h3s):
        if len(hits) >= limit:
            break
        title = _strip_tags(title_html)
        if not title or title in ("百度首页", "登录"):
            continue
        snip = _strip_tags(abstracts[i]) if i < len(abstracts) else ""
        hits.append(
            {
                "title": title,
                "url": href,
                "snippet": snip[:500],
                "source": "baidu",
            }
        )
    return {
        "ok": bool(hits),
        "provider": "baidu",
        "http_status": status,
        "hits": hits,
        "query": query,
        "hint": "evidence only — verify before trusting",
        "authority": "web-evidence",
        "error": None if hits else "parsed zero hits",
    }


def so360(query: str, limit: int) -> dict:
    params = urllib.parse.urlencode({"q": query})
    url = f"https://www.so.com/s?{params}"
    status, body = http_get(url, timeout=18.0)
    if status != 200 or len(body) < 500:
        return {
            "ok": False,
            "provider": "so360",
            "http_status": status,
            "hits": [],
            "error": body[:240] if status == 0 else f"HTTP {status}",
            "query": query,
        }
    hits: list[dict] = []
    h3s = re.findall(
        r"<h3[^>]*>\s*<a[^>]+href=\"([^\"]+)\"[^>]*>([\s\S]*?)</a>",
        body,
        flags=re.I,
    )
    for href, title_html in h3s:
        if len(hits) >= limit:
            break
        title = _strip_tags(title_html)
        if not title:
            continue
        # skip nav chrome
        if title in ("360搜索", "首页"):
            continue
        hits.append(
            {
                "title": title,
                "url": href,
                "snippet": "",
                "source": "so360",
            }
        )
    return {
        "ok": bool(hits),
        "provider": "so360",
        "http_status": status,
        "hits": hits,
        "query": query,
        "hint": "evidence only — verify before trusting",
        "authority": "web-evidence",
        "error": None if hits else "parsed zero hits",
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
        title = _strip_tags(title_html)
        snip = _strip_tags(snip_html)
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
        "ok": bool(hits),
        "provider": "bing-cn",
        "http_status": status,
        "hits": hits,
        "query": query,
        "hint": "evidence only — verify before trusting",
        "authority": "web-evidence",
        "error": None if hits else "parsed zero hits",
    }


def ddg_instant(query: str, limit: int) -> dict:
    q = urllib.parse.quote(query)
    url = (
        f"https://api.duckduckgo.com/?q={q}&format=json&no_html=1&skip_disambig=1"
    )
    status, body = http_get(url, timeout=3.0)
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
        "ok": bool(hits),
        "provider": "duckduckgo",
        "http_status": status,
        "hits": hits[:limit],
        "query": query,
        "hint": "evidence only — verify before trusting",
        "authority": "web-evidence",
        "error": None if hits else "empty instant answer",
    }


def _relevance_ok(query: str, hits: list[dict]) -> bool:
    """Reject provider results that ignore the query (Bing spam pattern)."""
    if not hits:
        return False
    # tokens: CJK bigrams + latin words length>=2
    q = query.lower()
    tokens = set(re.findall(r"[a-z0-9]{2,}", q))
    for i in range(len(query) - 1):
        ch = query[i : i + 2]
        if all("\u4e00" <= c <= "\u9fff" for c in ch):
            tokens.add(ch)
    if not tokens:
        return True
    matched = 0
    for h in hits[: min(3, len(hits))]:
        blob = f"{h.get('title','')} {h.get('snippet','')}".lower()
        if any(t in blob for t in tokens):
            matched += 1
    return matched >= 1


def search(query: str, limit: int) -> dict:
    raw_query = (query or "").strip()
    if not raw_query:
        return {"ok": True, "provider": "none", "hits": [], "hint": "empty query"}
    limit = max(1, min(int(limit or 5), 8))
    focused = focus_query(raw_query)
    tried: list[str] = []
    errors: list[str] = []

    for name, fn in (
        ("baidu", baidu),
        ("so360", so360),
        ("bing-cn", bing_cn),
    ):
        tried.append(name)
        out = fn(focused, limit)
        if out.get("ok") and out.get("hits") and _relevance_ok(focused, out["hits"]):
            out["raw_query"] = raw_query
            out["focused_query"] = focused
            if errors:
                out["fallback_error"] = "; ".join(errors)
            return out
        if out.get("ok") and out.get("hits"):
            errors.append(f"{name}: irrelevant hits")
        else:
            errors.append(f"{name}: {out.get('error')}")

    skip_ddg = (os.environ.get("QDAGENT_SKIP_DDG") or "").strip() in (
        "1",
        "true",
        "yes",
    )
    if not skip_ddg:
        tried.append("duckduckgo")
        ddg = ddg_instant(focused, limit)
        if ddg.get("ok") and ddg.get("hits"):
            ddg["raw_query"] = raw_query
            ddg["focused_query"] = focused
            ddg["fallback_error"] = "; ".join(errors)
            return ddg
        errors.append(f"duckduckgo: {ddg.get('error')}")

    return {
        "ok": False,
        "provider": "none",
        "hits": [],
        "query": focused,
        "raw_query": raw_query,
        "focused_query": focused,
        "error": "; ".join(errors) or "no hits",
        "tried": tried,
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
