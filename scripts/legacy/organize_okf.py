#!/usr/bin/env python3
"""OKF-style note promotion for qdagent.

Ops (argv[1] or env QDAGENT_OKF_OP):
  organize — LLM-merge recent runs into data/kb/concepts/notes/*.md
  list     — list concept notes under concepts/
  get      — read one concept by slug

Env:
  QDAGENT_DATA, QDAGENT_OKF_IN, QDAGENT_OKF_OUT

organize input JSON:
  {
    "mode": "incremental"|"full",
    "query": "求道",
    "limit": 20,
    "rows": [{slug,title,summary,body?}...],
    "hits": [{path,excerpt,score}...],
    "llm_api_key": "...",
    "llm_base_url": "https://api.openai.com/v1",
    "llm_model": "gpt-4o-mini",
    "run_catalog": true
  }
"""
from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


STATE_NAME = "organize-state.json"


def emit(obj: dict[str, Any], out_path: str) -> None:
    text = json.dumps(obj, ensure_ascii=False, indent=2)
    if out_path:
        Path(out_path).parent.mkdir(parents=True, exist_ok=True)
        Path(out_path).write_text(text + "\n", encoding="utf-8")
    else:
        sys.stdout.write(text + "\n")


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def slugify(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"[^\w\u4e00-\u9fff\-]+", "-", s, flags=re.UNICODE)
    s = re.sub(r"-+", "-", s).strip("-")
    if not s:
        s = "note"
    return s[:64]


def load_state(kb: Path) -> dict[str, Any]:
    p = kb / STATE_NAME
    if not p.is_file():
        return {"last_slug": "", "last_at": "", "seen_slugs": []}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {"last_slug": "", "last_at": "", "seen_slugs": []}


def save_state(kb: Path, state: dict[str, Any]) -> None:
    (kb / STATE_NAME).write_text(
        json.dumps(state, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def parse_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    meta: dict[str, Any] = {}
    for line in parts[1].splitlines():
        line = line.strip()
        if not line or ":" not in line:
            continue
        k, v = line.split(":", 1)
        k = k.strip()
        v = v.strip().strip('"').strip("'")
        if v.startswith("[") and v.endswith("]"):
            inner = v[1:-1].strip()
            if not inner:
                meta[k] = []
            else:
                meta[k] = [x.strip().strip('"').strip("'") for x in inner.split(",")]
        else:
            meta[k] = v
    return meta, parts[2].lstrip("\n")


def write_concept(
    kb: Path,
    note: dict[str, Any],
    at: str,
) -> dict[str, Any]:
    para = (note.get("para") or "resource").strip().lower()
    if para in ("area", "areas", "para-area"):
        sub = "areas"
        tag = "para-area"
    else:
        sub = "notes"
        tag = "para-resource"
    slug = slugify(str(note.get("slug") or note.get("title") or "note"))
    title = str(note.get("title") or slug).strip() or slug
    desc = str(note.get("description") or "").strip()
    body = str(note.get("body_md") or note.get("body") or "").strip()
    sources = note.get("sources") or []
    if isinstance(sources, str):
        sources = [sources]
    sources = [str(x).strip() for x in sources if str(x).strip()]

    dest_dir = kb / "concepts" / sub
    dest_dir.mkdir(parents=True, exist_ok=True)
    path = dest_dir / f"{slug}.md"

    existing_sources: list[str] = []
    if path.is_file():
        old_meta, old_body = parse_frontmatter(path.read_text(encoding="utf-8"))
        old_src = old_meta.get("sources") or []
        if isinstance(old_src, str):
            old_src = [old_src]
        existing_sources = [str(x) for x in old_src]
        if not body and old_body.strip():
            body = old_body.strip()
        if not desc and old_meta.get("description"):
            desc = str(old_meta.get("description"))

    merged = []
    for s in existing_sources + sources:
        if s not in merged:
            merged.append(s)

    src_yaml = "[" + ", ".join(json.dumps(x, ensure_ascii=False) for x in merged[:24]) + "]"
    tags_yaml = f'["{tag}", "qdagent"]'
    fm = (
        f"---\n"
        f"type: Marqdo Note\n"
        f"title: {json.dumps(title, ensure_ascii=False)[1:-1]}\n"
        f"description: {json.dumps(desc or title, ensure_ascii=False)[1:-1]}\n"
        f"status: draft\n"
        f"tags: {tags_yaml}\n"
        f"sources: {src_yaml}\n"
        f"generated:\n"
        f"  by: qdagent/organize\n"
        f"  at: {at}\n"
        f"---\n\n"
    )
    if not body:
        body = f"# {title}\n\n（待补充）\n"
    path.write_text(fm + body.rstrip() + "\n", encoding="utf-8")
    rel = f"concepts/{sub}/{slug}.md"
    return {
        "slug": slug,
        "path": rel,
        "title": title,
        "description": desc or title,
        "para": sub,
    }


def rebuild_index(kb: Path) -> int:
    lines = [
        "---",
        "type: Marqdo Catalog",
        "title: 求道知识库",
        "description: OKF-style concept index (generated; source of truth is concepts/*.md)",
        f"generated:",
        f"  by: qdagent/organize",
        f"  at: {now_iso()}",
        "---",
        "",
        "# 求道知识库",
        "",
        "整理后的概念笔记（`type: Marqdo Note`）。原始对话在 `../runs/`，不在此覆盖。",
        "",
        "## 笔记",
        "",
    ]
    count = 0
    for sub in ("notes", "areas"):
        d = kb / "concepts" / sub
        if not d.is_dir():
            continue
        for p in sorted(d.glob("*.md")):
            meta, _ = parse_frontmatter(p.read_text(encoding="utf-8"))
            title = meta.get("title") or p.stem
            desc = meta.get("description") or ""
            rel = f"concepts/{sub}/{p.name}"
            lines.append(f"- [{title}]({rel}) — {desc}")
            count += 1
    lines.append("")
    (kb / "index.md").write_text("\n".join(lines), encoding="utf-8")
    return count


def run_catalog(data_root: Path) -> dict[str, Any]:
    kb = data_root / "kb"
    try:
        r = subprocess.run(
            ["marqdo", "catalog", str(kb), "-o", str(kb)],
            capture_output=True,
            text=True,
            timeout=60,
        )
        return {
            "ok": r.returncode == 0,
            "code": r.returncode,
            "stdout": (r.stdout or "")[:500],
            "stderr": (r.stderr or "")[:500],
        }
    except Exception as e:
        return {"ok": False, "error": str(e)}


def heuristic_notes(rows: list[dict[str, Any]], query: str) -> list[dict[str, Any]]:
    """Deterministic cluster when LLM is unavailable — still OKF-shaped."""
    groups: dict[str, list[dict[str, Any]]] = {}
    for r in rows:
        title = str(r.get("title") or "未命名").strip()
        # skip organize audit noise
        if title.startswith("笔记整理") or title.startswith("OKF 整理"):
            continue
        key = title[:40] if title else "misc"
        groups.setdefault(key, []).append(r)

    notes: list[dict[str, Any]] = []
    for title, items in list(groups.items())[:8]:
        sources = []
        bullets = []
        for r in items[:6]:
            slug = str(r.get("slug") or "")
            if slug:
                sources.append(f"runs/{slug}.mq.md")
            summ = str(r.get("summary") or "").strip()
            if summ:
                bullets.append(f"- {summ[:180]}")
            else:
                ex = row_excerpt(r, 200).replace("\n", " ")
                if ex:
                    bullets.append(f"- {ex[:180]}")
        body = f"# {title}\n\n从 {len(items)} 条原始沉淀合并（启发式，待 LLM 精炼）。\n\n" + "\n".join(bullets[:8])
        notes.append(
            {
                "slug": slugify(title),
                "title": title,
                "description": f"合并自 {len(items)} 条 runs · 主题「{query}」",
                "para": "resource",
                "body_md": body,
                "sources": sources,
            }
        )
    return notes


def chat_complete(
    api_key: str,
    base_url: str,
    model: str,
    messages: list[dict[str, str]],
) -> str:
    base = (base_url or "https://api.openai.com/v1").rstrip("/")
    url = base + "/chat/completions"
    body = json.dumps(
        {
            "model": model or "gpt-4o-mini",
            "temperature": 0.2,
            "messages": messages,
            "response_format": {"type": "json_object"},
        },
        ensure_ascii=False,
    ).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=45) as resp:
        raw = resp.read().decode("utf-8")
    data = json.loads(raw)
    return str(data["choices"][0]["message"]["content"])


def extract_json(text: str) -> dict[str, Any]:
    text = (text or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{[\s\S]*\}", text)
        if not m:
            raise
        return json.loads(m.group(0))


def row_excerpt(row: dict[str, Any], limit: int = 900) -> str:
    body = str(row.get("body") or "")
    if not body:
        body = f"{row.get('title', '')}\n{row.get('summary', '')}\n{row.get('task', '')}\n{row.get('result', '')}"
    body = body.strip()
    if len(body) > limit:
        body = body[:limit] + "…"
    return body


def select_rows(
    rows: list[dict[str, Any]],
    state: dict[str, Any],
    mode: str,
    limit: int,
) -> list[dict[str, Any]]:
    rows = list(rows or [])
    if mode == "full":
        return rows[:limit]
    seen = set(state.get("seen_slugs") or [])
    fresh = [r for r in rows if str(r.get("slug") or "") not in seen]
    if not fresh:
        # still re-organize newest window so merges improve
        return rows[: min(limit, 8)]
    return fresh[:limit]


def op_organize(data_root: Path, req: dict[str, Any]) -> dict[str, Any]:
    kb = data_root / "kb"
    (kb / "concepts" / "notes").mkdir(parents=True, exist_ok=True)
    (kb / "concepts" / "areas").mkdir(parents=True, exist_ok=True)
    (kb / "resources").mkdir(parents=True, exist_ok=True)

    mode = (req.get("mode") or "incremental").strip() or "incremental"
    query = (req.get("query") or "求道").strip() or "求道"
    limit = int(req.get("limit") or 20)
    rows = req.get("rows") or []
    hits = req.get("hits") or []
    key = (req.get("llm_api_key") or "").strip()
    base = (req.get("llm_base_url") or "https://api.openai.com/v1").strip()
    model = (req.get("llm_model") or "gpt-4o-mini").strip()
    do_catalog = bool(req.get("run_catalog", True))

    state = load_state(kb)
    window = select_rows(rows, state, mode, limit)
    at = now_iso()

    if not window:
        return {
            "ok": True,
            "mode": mode,
            "promoted": 0,
            "notes": [],
            "summary": "无新 runs 需要整理",
            "state": state,
        }

    corpus_lines = []
    for r in window:
        slug = r.get("slug") or "?"
        corpus_lines.append(
            f"### runs/{slug}.mq.md\n标题: {r.get('title')}\n摘要: {r.get('summary')}\n\n{row_excerpt(r)}\n"
        )
    hit_lines = []
    for h in (hits or [])[:12]:
        hit_lines.append(
            f"- {h.get('path') or h.get('slug')}: {str(h.get('excerpt') or '')[:240]}"
        )

    system = (
        "你是求道知识策展助手。把原始对话沉淀（runs）整理成 OKF 风格的原子笔记。"
        "必须输出严格 JSON 对象，不要 Markdown 围栏。"
        "Schema: {\"notes\":[{\"slug\":\"kebab-or-zh\",\"title\":\"短标题\","
        "\"description\":\"一句话\",\"para\":\"resource|area\","
        "\"body_md\":\"Markdown 正文\",\"sources\":[\"runs/<slug>.mq.md\"]}]}"
        "规则：合并重复主题；不要改写或删除历史 runs；facts 用中文；"
        "最多 8 条 notes；slug 稳定可复用以便 upsert；sources 必须引用窗口内的 runs。"
        f"主题关键词：{query}"
    )
    user = (
        "# 待整理 runs\n\n"
        + "\n".join(corpus_lines)
        + "\n# 检索命中\n\n"
        + ("\n".join(hit_lines) if hit_lines else "（无）")
    )

    via = "llm"
    heur_err = ""
    notes_in: list[Any] = []
    if not key:
        notes_in = heuristic_notes(window, query)
        via = "heuristic"
        heur_err = "missing llm_api_key"
        if not notes_in:
            return {
                "ok": False,
                "error": "missing llm_api_key",
                "fallback": "index",
                "mode": mode,
                "window": len(window),
            }
    else:
        try:
            content = chat_complete(key, base, model, [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ])
            parsed = extract_json(content)
            notes_in = parsed.get("notes") if isinstance(parsed, dict) else None
            if not isinstance(notes_in, list):
                raise ValueError("llm json missing notes[]")
            via = "llm"
        except Exception as e:
            notes_in = heuristic_notes(window, query)
            via = "heuristic"
            heur_err = str(e)
            if not notes_in:
                return {
                    "ok": False,
                    "error": f"llm failed: {e}",
                    "fallback": "index",
                    "mode": mode,
                    "window": len(window),
                }

    written = []
    for n in notes_in[:8]:
        if not isinstance(n, dict):
            continue
        written.append(write_concept(kb, n, at))

    total = rebuild_index(kb)
    catalog = run_catalog(data_root) if do_catalog else {"ok": False, "skipped": True}

    seen = list(state.get("seen_slugs") or [])
    for r in window:
        s = str(r.get("slug") or "")
        if s and s not in seen:
            seen.append(s)
    seen = seen[-200:]
    last_slug = str(window[0].get("slug") or state.get("last_slug") or "")
    state = {
        "last_slug": last_slug,
        "last_at": at,
        "seen_slugs": seen,
        "last_promoted": [w["slug"] for w in written],
        "via": via,
    }
    save_state(kb, state)

    summary = f"OKF 晋升 {len(written)} 条概念笔记（窗口 {len(window)} runs · via={via}）"
    out = {
        "ok": True,
        "mode": mode,
        "promoted": len(written),
        "notes": written,
        "index_count": total,
        "catalog": catalog,
        "window": len(window),
        "state": state,
        "via": via,
        "summary": summary,
    }
    if via == "heuristic":
        out["warning"] = f"llm unavailable, used heuristic: {heur_err}"
    return out


def op_list(data_root: Path) -> dict[str, Any]:
    kb = data_root / "kb"
    items = []
    for sub in ("notes", "areas"):
        d = kb / "concepts" / sub
        if not d.is_dir():
            continue
        for p in sorted(d.glob("*.md"), key=lambda x: x.stat().st_mtime, reverse=True):
            meta, body = parse_frontmatter(p.read_text(encoding="utf-8"))
            desc = meta.get("description") or ""
            if not desc:
                for line in body.splitlines():
                    t = line.strip()
                    if t and not t.startswith("#") and not t.startswith("---"):
                        desc = t[:140]
                        break
            items.append(
                {
                    "slug": p.stem,
                    "path": f"concepts/{sub}/{p.name}",
                    "title": meta.get("title") or p.stem,
                    "description": desc,
                    "para": sub,
                    "type": meta.get("type") or "Marqdo Note",
                    "status": meta.get("status") or "draft",
                    "updated": meta.get("generated") if isinstance(meta.get("generated"), str) else "",
                }
            )
    return {"ok": True, "notes": items, "count": len(items)}


def op_get(data_root: Path, req: dict[str, Any]) -> dict[str, Any]:
    slug = slugify(str(req.get("slug") or ""))
    kb = data_root / "kb"
    for sub in ("notes", "areas"):
        p = kb / "concepts" / sub / f"{slug}.md"
        if p.is_file():
            text = p.read_text(encoding="utf-8")
            meta, body = parse_frontmatter(text)
            return {
                "ok": True,
                "slug": slug,
                "path": f"concepts/{sub}/{slug}.md",
                "title": meta.get("title") or slug,
                "description": meta.get("description") or "",
                "body": text,
                "meta": meta,
                "para": sub,
            }
    return {"ok": False, "error": "note not found", "slug": slug}


def main() -> int:
    op = (sys.argv[1] if len(sys.argv) > 1 else "") or os.environ.get("QDAGENT_OKF_OP") or "organize"
    data_root = Path(os.environ.get("QDAGENT_DATA") or "data").resolve()
    in_path = (os.environ.get("QDAGENT_OKF_IN") or "").strip()
    out_path = (os.environ.get("QDAGENT_OKF_OUT") or "").strip()
    req: dict[str, Any] = {}
    if in_path and Path(in_path).is_file():
        req = json.loads(Path(in_path).read_text(encoding="utf-8"))
    elif not sys.stdin.isatty():
        raw = sys.stdin.read()
        if raw.strip():
            req = json.loads(raw)

    try:
        if op == "list":
            out = op_list(data_root)
        elif op == "get":
            out = op_get(data_root, req)
        else:
            out = op_organize(data_root, req)
    except Exception as e:
        out = {"ok": False, "error": str(e)}

    emit(out, out_path)
    return 0 if out.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
