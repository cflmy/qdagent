#!/usr/bin/env python3
"""qdagent OpenAI-compatible /v1 thick gateway (audit + context inject).

Listens on QDAGENT_V1_HOST:QDAGENT_V1_PORT (default 127.0.0.1:7433).
Marqdo app.proxy mounts /v1 → this process (strip /v1 → /models, /chat/completions).

Auth: Authorization Bearer == QDAGENT_API_KEY (default qdagent-local).
Every chat.completions call auto-writes data/runs/api-*.mq.md + sqlite + kb git.
"""
from __future__ import annotations

import json
import os
import re
import sqlite3
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

HOST = os.environ.get("QDAGENT_V1_HOST", "127.0.0.1")
PORT = int(os.environ.get("QDAGENT_V1_PORT", "7433"))
API_KEY = (os.environ.get("QDAGENT_API_KEY") or "qdagent-local").strip()
DATA = Path(os.environ.get("QDAGENT_DATA") or "data").resolve()
REPO = Path(__file__).resolve().parent.parent
TIMEOUT = float(os.environ.get("QDAGENT_V1_TIMEOUT", "180"))
MAX_HISTORY = int(os.environ.get("QDAGENT_V1_MAX_HISTORY", "24"))
CORPUS_LIMIT = int(os.environ.get("QDAGENT_V1_CORPUS_LIMIT", "5"))

_org_lock = threading.Lock()
_org_last = 0.0
_org_count = 0


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def new_slug() -> str:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    return f"api-{stamp}-{int(time.time() * 1000) % 1000:03d}"


def load_settings() -> dict[str, str]:
    db = DATA / "qdagent.db"
    out = {
        "llm_api_key": "",
        "llm_base_url": "https://api.openai.com/v1",
        "llm_model": "gpt-4o-mini",
    }
    if not db.is_file():
        return out
    try:
        con = sqlite3.connect(str(db))
        con.row_factory = sqlite3.Row
        row = con.execute(
            "select llm_api_key, llm_base_url, llm_model from settings limit 1"
        ).fetchone()
        con.close()
        if row:
            out["llm_api_key"] = (row["llm_api_key"] or "").strip()
            out["llm_base_url"] = (row["llm_base_url"] or out["llm_base_url"]).strip()
            out["llm_model"] = (row["llm_model"] or out["llm_model"]).strip()
    except Exception:
        pass
    if not out["llm_api_key"]:
        out["llm_api_key"] = (
            os.environ.get("OPENAI_API_KEY")
            or os.environ.get("MARQDO_LLM_API_KEY")
            or ""
        ).strip()
    if os.environ.get("OPENAI_BASE_URL"):
        out["llm_base_url"] = os.environ["OPENAI_BASE_URL"].strip()
    if os.environ.get("OPENAI_MODEL"):
        out["llm_model"] = os.environ["OPENAI_MODEL"].strip()
    return out


def read_profile() -> str:
    p = DATA / "kb" / "用户画像.mq.md"
    if not p.is_file():
        return "（尚无用户画像）"
    text = p.read_text(encoding="utf-8", errors="replace")
    if len(text) > 2400:
        return text[:2400] + "\n…"
    return text


def tokenize(q: str) -> list[str]:
    parts = re.findall(r"[\u4e00-\u9fff]{2,}|[A-Za-z0-9_]{2,}", q or "")
    return [p.lower() for p in parts][:12]


def corpus_hits(query: str, limit: int = CORPUS_LIMIT) -> list[dict[str, Any]]:
    runs = DATA / "runs"
    if not runs.is_dir():
        return []
    toks = tokenize(query)
    if not toks:
        return []
    scored: list[tuple[float, Path, str]] = []
    for path in sorted(runs.glob("*.mq.md"), key=lambda p: p.stat().st_mtime, reverse=True)[
        :80
    ]:
        try:
            body = path.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        low = body.lower()
        score = sum(1.0 for t in toks if t in low)
        if score <= 0:
            continue
        excerpt = body.strip().replace("\r", "")
        if len(excerpt) > 400:
            excerpt = excerpt[:400] + "…"
        scored.append((score, path, excerpt))
    scored.sort(key=lambda x: (-x[0], -x[1].stat().st_mtime))
    hits = []
    for score, path, excerpt in scored[:limit]:
        hits.append(
            {
                "path": f"runs/{path.name}",
                "score": score,
                "excerpt": excerpt,
            }
        )
    return hits


def message_text(msg: dict[str, Any]) -> str:
    c = msg.get("content")
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        parts = []
        for part in c:
            if isinstance(part, dict) and part.get("type") == "text":
                parts.append(str(part.get("text") or ""))
            elif isinstance(part, str):
                parts.append(part)
        return "\n".join(parts)
    return str(c or "")


def last_user_text(messages: list[dict[str, Any]]) -> str:
    for m in reversed(messages or []):
        if (m.get("role") or "") == "user":
            t = message_text(m).strip()
            if t:
                return t
    return ""


def build_system(profile: str, hits: list[dict[str, Any]]) -> str:
    lines = [
        "你是求道助手（经 OpenAI 兼容网关调用）。",
        "回答简洁；笔记证据仅供参考（evidence only）。",
        "本请求会由服务端自动沉淀到 data/runs（只追加）。",
        "",
        "## 用户画像",
        profile or "（空）",
        "",
        "## 笔记证据（evidence only）",
    ]
    if not hits:
        lines.append("（无命中）")
    else:
        for i, h in enumerate(hits, 1):
            lines.append(
                f"{i}. {h.get('path')} score={h.get('score')}\n{h.get('excerpt')}"
            )
    return "\n".join(lines)


def join_url(base: str, path: str) -> str:
    b = (base or "").rstrip("/")
    p = path if path.startswith("/") else "/" + path
    if b.endswith("/v1") and p.startswith("/v1/"):
        p = p[3:]
    return b + p


def write_run_file(
    slug: str,
    title: str,
    task: str,
    result: str,
    *,
    status: str = "ok",
    model: str = "",
) -> Path:
    runs = DATA / "runs"
    runs.mkdir(parents=True, exist_ok=True)
    path = runs / f"{slug}.mq.md"
    fm = [
        "---",
        f"title: {title}",
        f"description: qdagent run {slug}",
        "surface: api",
        f"status: {status}",
    ]
    if model:
        fm.append(f"model: {model}")
    fm.append(f"updated: {now_iso()}")
    fm.append("---")
    body = (
        "\n".join(fm)
        + "\n\n# 任务\n\n"
        + (task or "")
        + "\n\n# 结果\n\n"
        + (result or "")
        + "\n"
    )
    path.write_text(body, encoding="utf-8")
    return path


def insert_run_row(slug: str, title: str, summary: str, body: str) -> None:
    db = DATA / "qdagent.db"
    if not db.is_file():
        return
    try:
        con = sqlite3.connect(str(db))
        cols = [r[1] for r in con.execute("pragma table_info(runs)").fetchall()]
        con.execute("delete from runs where slug=?", (slug,))
        fields = ["slug", "title", "summary", "body"]
        vals: list[Any] = [slug, title, summary[:140], body]
        if "created_at" in cols:
            fields.append("created_at")
            vals.append(now_iso())
        placeholders = ",".join("?" for _ in fields)
        con.execute(
            f"insert into runs ({','.join(fields)}) values ({placeholders})",
            vals,
        )
        con.commit()
        con.close()
    except Exception as e:
        print(f"[v1-gw] sqlite insert failed: {e}", file=sys.stderr)


def kb_git_commit(message: str) -> None:
    script = REPO / "scripts" / "legacy" / "kb_git.py"
    if not script.is_file():
        return
    env = os.environ.copy()
    env["QDAGENT_DATA"] = str(DATA)
    out = DATA / "tmp" / "last_kb_git.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    env["QDAGENT_KB_GIT_OUT"] = str(out)
    env["QDAGENT_KB_GIT_MSG"] = message
    try:
        subprocess.run(
            ["python3", str(script), "commit"],
            cwd=str(REPO),
            env=env,
            capture_output=True,
            text=True,
            timeout=30,
        )
    except Exception as e:
        print(f"[v1-gw] kb_git failed: {e}", file=sys.stderr)


def maybe_organize_async() -> None:
    global _org_last, _org_count
    with _org_lock:
        _org_count += 1
        now = time.time()
        if _org_count < 3 and (now - _org_last) < 90:
            return
        _org_count = 0
        _org_last = now

    def _run() -> None:
        try:
            script = REPO / "scripts" / "legacy" / "organize_okf.py"
            if not script.is_file():
                return
            # best-effort: load recent rows without LLM key → heuristic
            con = sqlite3.connect(str(DATA / "qdagent.db"))
            con.row_factory = sqlite3.Row
            rows = [
                dict(r)
                for r in con.execute(
                    "select slug,title,summary,body from runs order by id desc limit 16"
                )
            ]
            con.close()
            req = {
                "mode": "incremental",
                "query": "求道",
                "limit": 16,
                "rows": rows,
                "hits": [],
                "llm_api_key": "",
                "run_catalog": False,
            }
            inp = DATA / "tmp" / "okf_in_v1.json"
            outp = DATA / "tmp" / "okf_out_v1.json"
            inp.write_text(json.dumps(req, ensure_ascii=False), encoding="utf-8")
            env = os.environ.copy()
            env["QDAGENT_DATA"] = str(DATA)
            env["QDAGENT_OKF_IN"] = str(inp)
            env["QDAGENT_OKF_OUT"] = str(outp)
            subprocess.run(
                ["python3", str(script), "organize"],
                cwd=str(REPO),
                env=env,
                capture_output=True,
                text=True,
                timeout=60,
            )
            kb_git_commit("organize-okf: api-gateway")
        except Exception as e:
            print(f"[v1-gw] organize async failed: {e}", file=sys.stderr)

    threading.Thread(target=_run, daemon=True).start()


def finalize_run(
    slug: str,
    user_text: str,
    assistant_text: str,
    *,
    status: str = "ok",
    model: str = "",
    error: str = "",
) -> Path:
    title = (user_text or "API 调用").strip().replace("\n", " ")[:40] or "API 调用"
    if status != "ok":
        title = f"API · {status}"
    result = assistant_text or ""
    if error:
        result = (result + "\n\n## error\n\n" + error).strip()
    result_block = f"## user\n\n{user_text}\n\n## assistant\n\n{result}\n"
    path = write_run_file(
        slug,
        title,
        user_text or "（空）",
        result_block,
        status=status,
        model=model,
    )
    body = path.read_text(encoding="utf-8")
    summary = ((user_text or "").strip()[:40] + " → " + (assistant_text or "")[:80]).strip()
    insert_run_row(slug, title, summary, body)
    kb_git_commit(f"capture: {slug}")
    maybe_organize_async()
    return path


def upstream_chat(
    settings: dict[str, str],
    payload: dict[str, Any],
    *,
    stream: bool,
) -> tuple[urllib.request.Request, str]:
    key = settings["llm_api_key"]
    if not key:
        raise RuntimeError("upstream llm_api_key missing — configure 大模型设置")
    base = settings["llm_base_url"]
    url = join_url(base, "/chat/completions")
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream" if stream else "application/json",
        },
        method="POST",
    )
    return req, url


def map_model(req_model: str, upstream_model: str) -> str:
    m = (req_model or "").strip()
    if not m or m in ("qdagent", "qdagent-fast", "qdagent-code"):
        return upstream_model
    return m


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt: str, *args: Any) -> None:
        print(f"[v1-gw] {self.address_string()} {fmt % args}", file=sys.stderr)

    def _json(self, code: int, obj: dict[str, Any], extra_headers: dict[str, str] | None = None) -> None:
        raw = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Cache-Control", "no-cache")
        if extra_headers:
            for k, v in extra_headers.items():
                self.send_header(k, v)
        self.end_headers()
        self.wfile.write(raw)

    def _auth_ok(self) -> bool:
        auth = self.headers.get("Authorization") or ""
        if auth.lower().startswith("bearer "):
            token = auth[7:].strip()
            return token == API_KEY
        # some clients send api-key header
        alt = (self.headers.get("api-key") or self.headers.get("x-api-key") or "").strip()
        return alt == API_KEY

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header(
            "Access-Control-Allow-Headers",
            "Authorization, Content-Type, api-key, x-api-key",
        )
        self.end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path.rstrip("/") or "/"
        if path in ("/health", "/v1/health"):
            self._json(200, {"ok": True, "role": "qdagent-v1", "data": str(DATA)})
            return
        if path in ("/models", "/v1/models"):
            if not self._auth_ok():
                self._json(401, {"error": {"message": "invalid api key", "type": "auth"}})
                return
            self._json(
                200,
                {
                    "object": "list",
                    "data": [
                        {
                            "id": "qdagent",
                            "object": "model",
                            "owned_by": "local",
                        },
                        {
                            "id": "qdagent-fast",
                            "object": "model",
                            "owned_by": "local",
                        },
                    ],
                },
            )
            return
        self._json(404, {"error": {"message": f"not found: {path}"}})

    def do_POST(self) -> None:
        path = urlparse(self.path).path.rstrip("/") or "/"
        if path not in ("/chat/completions", "/v1/chat/completions"):
            self._json(404, {"error": {"message": f"not found: {path}"}})
            return
        if not self._auth_ok():
            self._json(401, {"error": {"message": "invalid api key", "type": "auth"}})
            return

        length = int(self.headers.get("Content-Length") or "0")
        raw = self.rfile.read(length) if length > 0 else b"{}"
        try:
            req_body = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self._json(400, {"error": {"message": "invalid json"}})
            return

        messages = req_body.get("messages") or []
        if not isinstance(messages, list) or not messages:
            self._json(400, {"error": {"message": "messages required"}})
            return

        stream = bool(req_body.get("stream"))
        user_text = last_user_text(messages)
        slug = new_slug()
        settings = load_settings()
        upstream_model = map_model(str(req_body.get("model") or ""), settings["llm_model"])

        # incomplete placeholder
        write_run_file(
            slug,
            (user_text or "API")[:40],
            user_text or "（空）",
            "（进行中…）",
            status="incomplete",
            model=upstream_model,
        )

        profile = read_profile()
        hits = corpus_hits(user_text)
        system = build_system(profile, hits)

        hist = messages[-MAX_HISTORY:]
        # drop existing system or keep — prepend ours
        upstream_messages: list[dict[str, Any]] = [{"role": "system", "content": system}]
        for m in hist:
            if not isinstance(m, dict):
                continue
            role = m.get("role") or "user"
            if role == "system":
                continue
            upstream_messages.append(
                {"role": role, "content": message_text(m)}
            )

        up_payload: dict[str, Any] = {
            "model": upstream_model,
            "messages": upstream_messages,
            "stream": stream,
        }
        for k in (
            "temperature",
            "top_p",
            "max_tokens",
            "max_completion_tokens",
            "stop",
            "tools",
            "tool_choice",
            "response_format",
            "presence_penalty",
            "frequency_penalty",
            "user",
        ):
            if k in req_body:
                up_payload[k] = req_body[k]

        try:
            ureq, url = upstream_chat(settings, up_payload, stream=stream)
        except Exception as e:
            finalize_run(slug, user_text, "", status="error", model=upstream_model, error=str(e))
            self._json(
                502,
                {"error": {"message": str(e), "type": "upstream_config"}},
                {"X-QDAgent-Run-Id": slug},
            )
            return

        if stream:
            self._stream_completion(ureq, slug, user_text, upstream_model, url)
        else:
            self._json_completion(ureq, slug, user_text, upstream_model, url)

    def _json_completion(
        self,
        ureq: urllib.request.Request,
        slug: str,
        user_text: str,
        model: str,
        url: str,
    ) -> None:
        try:
            with urllib.request.urlopen(ureq, timeout=TIMEOUT) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")[:800]
            finalize_run(
                slug, user_text, "", status="error", model=model, error=f"HTTP {e.code}: {err_body}"
            )
            self._json(
                e.code if e.code >= 400 else 502,
                {"error": {"message": err_body or str(e), "type": "upstream"}},
                {"X-QDAgent-Run-Id": slug},
            )
            return
        except Exception as e:
            finalize_run(slug, user_text, "", status="error", model=model, error=str(e))
            self._json(
                502,
                {"error": {"message": str(e), "type": "upstream"}},
                {"X-QDAgent-Run-Id": slug},
            )
            return

        assistant = ""
        try:
            assistant = str(
                data["choices"][0]["message"].get("content") or ""
            )
        except Exception:
            assistant = ""
        path = finalize_run(slug, user_text, assistant, status="ok", model=model)
        data["id"] = slug
        data.setdefault("model", model)
        data["qdagent"] = {"run_id": slug, "run_path": str(path), "upstream": url}
        self._json(200, data, {"X-QDAgent-Run-Id": slug})

    def _stream_completion(
        self,
        ureq: urllib.request.Request,
        slug: str,
        user_text: str,
        model: str,
        url: str,
    ) -> None:
        assistant_parts: list[str] = []
        try:
            resp = urllib.request.urlopen(ureq, timeout=TIMEOUT)
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")[:800]
            finalize_run(
                slug, user_text, "", status="error", model=model, error=f"HTTP {e.code}: {err_body}"
            )
            self._json(
                e.code if e.code >= 400 else 502,
                {"error": {"message": err_body or str(e), "type": "upstream"}},
                {"X-QDAgent-Run-Id": slug},
            )
            return
        except Exception as e:
            finalize_run(slug, user_text, "", status="error", model=model, error=str(e))
            self._json(
                502,
                {"error": {"message": str(e), "type": "upstream"}},
                {"X-QDAgent-Run-Id": slug},
            )
            return

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache, no-transform")
        self.send_header("X-Accel-Buffering", "no")
        self.send_header("Connection", "keep-alive")
        self.send_header("X-QDAgent-Run-Id", slug)
        self.end_headers()

        try:
            while True:
                line = resp.readline()
                if not line:
                    break
                text = line.decode("utf-8", errors="replace")
                if text.startswith("data:"):
                    payload = text[5:].strip()
                    if payload == "[DONE]":
                        self.wfile.write(b"data: [DONE]\n\n")
                        self.wfile.flush()
                        break
                    try:
                        chunk = json.loads(payload)
                        chunk["id"] = slug
                        delta = (chunk.get("choices") or [{}])[0].get("delta") or {}
                        c = delta.get("content")
                        if c:
                            assistant_parts.append(str(c))
                        out = (
                            "data: "
                            + json.dumps(chunk, ensure_ascii=False)
                            + "\n\n"
                        ).encode("utf-8")
                        self.wfile.write(out)
                        self.wfile.flush()
                        continue
                    except Exception:
                        pass
                self.wfile.write(line)
                self.wfile.flush()
        except Exception as e:
            finalize_run(
                slug,
                user_text,
                "".join(assistant_parts),
                status="incomplete",
                model=model,
                error=str(e),
            )
            return
        finally:
            try:
                resp.close()
            except Exception:
                pass

        finalize_run(
            slug,
            user_text,
            "".join(assistant_parts),
            status="ok",
            model=model,
        )


def main() -> int:
    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / "runs").mkdir(parents=True, exist_ok=True)
    (DATA / "tmp").mkdir(parents=True, exist_ok=True)
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(
        f"qdagent openai /v1 gateway on http://{HOST}:{PORT} (data={DATA})",
        file=sys.stderr,
    )
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
