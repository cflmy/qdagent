#!/usr/bin/env python3
"""Thin bridge: run Marqdo entrypoints and return structured data.

Marqdo gap: GAP-02 / GAP-03 / GAP-05 — see doc/gaps/01-marqdo-hard-limits.md
Business logic lives in 求道-*.mq.md / lib/run.mq.md / db/index.mq.md.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent


def marqdo_bin() -> str:
    return os.environ.get("MARQDO_BIN") or shutil.which("marqdo") or "marqdo"


def run_mq(script: str, env: dict[str, str] | None = None, timeout: float = 60) -> str:
    cmd = [marqdo_bin(), "run", script]
    full = os.environ.copy()
    full.setdefault("MARQDO_EXT", str(Path.home() / ".marqdo" / "ext"))
    if env:
        full.update({k: str(v) for k, v in env.items() if v is not None})
    full.setdefault("QDAGENT_DATA", str(REPO / "data"))
    proc = subprocess.run(
        cmd,
        cwd=str(REPO),
        env=full,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "").strip() or f"exit {proc.returncode}"
        raise RuntimeError(f"marqdo run {script}: {err[:800]}")
    return (proc.stdout or "").strip()


def run_mq_json(script: str, env: dict[str, str] | None = None) -> dict | list:
    out = run_mq(script, env=env)
    lines = [ln for ln in out.splitlines() if ln.strip()]
    if not lines:
        return {}
    raw = lines[-1]
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return json.loads(out)


def capture(
    *,
    title: str,
    task: str,
    result: str,
    slug: str = "",
    surface: str = "web",
    session_id: str = "",
) -> dict:
    path = run_mq(
        "求道-捕捉.mq.md",
        {
            "QDAGENT_TITLE": title,
            "QDAGENT_TASK": task,
            "QDAGENT_RESULT": result,
            "QDAGENT_SLUG": slug or "",
            "QDAGENT_SURFACE": surface,
            "QDAGENT_SESSION_ID": session_id or "",
        },
    )
    # last line is path
    path = path.splitlines()[-1].strip()
    name = Path(path).name
    slug_out = name[: -len(".mq.md")] if name.endswith(".mq.md") else Path(path).stem
    return {"ok": True, "slug": slug_out, "path": path}


def sync_runs() -> dict:
    root = run_mq("求道-同步.mq.md").splitlines()[-1].strip()
    return {"ok": True, "root": root}


def list_recent(limit: int = 20) -> list:
    data = run_mq_json("求道-列出.mq.md", {"QDAGENT_LIMIT": str(limit)})
    if isinstance(data, dict) and "runs" in data:
        return data["runs"]
    if isinstance(data, list):
        return data
    return []


def search(query: str, top_k: int = 5) -> list:
    """Marqdo exports recent rows; filter here (GAP-05)."""
    q = (query or "").strip()
    if not q:
        return []
    data = run_mq_json("求道-搜索.mq.md", {"QDAGENT_TOP_K": str(max(top_k, 50))})
    rows = []
    if isinstance(data, dict):
        rows = data.get("runs") or data.get("hits") or []
    elif isinstance(data, list):
        rows = data
    hits = []
    q_low = q.lower()
    terms = [t for t in re.split(r"\s+", q_low) if t]
    for row in rows:
        body = str(row.get("body") or "")
        title = str(row.get("title") or "")
        slug = str(row.get("slug") or "")
        low = (title + "\n" + body).lower()
        score = 0.0
        for t in terms:
            if t in title.lower():
                score += 3.0
            score += low.count(t) * 0.5
        if score <= 0 and q_low not in low:
            continue
        if score <= 0:
            score = 1.0
        idx = low.find(terms[0] if terms else q_low)
        if idx < 0:
            idx = 0
        start = max(0, idx - 80)
        excerpt = body[start : start + 400]
        hits.append(
            {
                "slug": slug,
                "title": title,
                "path": str(REPO / "data" / "runs" / f"{slug}.mq.md"),
                "excerpt": excerpt,
                "score": round(score, 3),
                "hint": "Open full .mq.md via qd_get_run — excerpts are evidence only",
            }
        )
    hits.sort(key=lambda x: x["score"], reverse=True)
    return hits[:top_k]


def get_run_body(slug: str) -> dict | None:
    slug = slug[: -len(".mq.md")] if slug.endswith(".mq.md") else slug
    if slug.endswith(".mq"):
        slug = slug[:-3]
    path = REPO / "data" / "runs" / f"{slug}.mq.md"
    # Prefer QDAGENT_DATA
    root = Path(os.environ.get("QDAGENT_DATA") or (REPO / "data"))
    path = root / "runs" / f"{slug}.mq.md"
    if not path.is_file():
        return None
    return {
        "slug": slug,
        "path": str(path),
        "body": path.read_text(encoding="utf-8", errors="replace"),
    }


if __name__ == "__main__":
    action = (sys.argv[1] if len(sys.argv) > 1 else "help").strip()
    if action == "capture":
        print(
            json.dumps(
                capture(title="bridge", task="t", result="r", surface="cli"),
                ensure_ascii=False,
            )
        )
    elif action == "list":
        print(json.dumps(list_recent(5), ensure_ascii=False, indent=2))
    elif action == "search":
        q = sys.argv[2] if len(sys.argv) > 2 else "求道"
        print(json.dumps(search(q), ensure_ascii=False, indent=2))
    elif action == "sync":
        print(json.dumps(sync_runs(), ensure_ascii=False))
    else:
        print("usage: mq_bridge.py capture|list|search|sync", file=sys.stderr)
        sys.exit(2)
