#!/usr/bin/env python3
"""Thin browser relay for qdagent (CORS + stream + Marqdo bridge triggers).

Marqdo gap: GAP-01 (SSE reverse proxy), GAP-02 (HTTP cannot call ##), GAP-04 (side port).
See doc/gaps/01-marqdo-hard-limits.md

Business logic: marqdo run 求道-捕捉 / 求道-同步 / 求道-搜索 / 求道-列出 via mq_bridge.
"""
from __future__ import annotations

import base64
import json
import os
import sys
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import mq_bridge  # noqa: E402

HOST = os.environ.get("QDAGENT_PROXY_HOST", "127.0.0.1")
PORT = int(os.environ.get("QDAGENT_PROXY_PORT", "7432"))
ALLOW_ORIGIN = os.environ.get("QDAGENT_PROXY_CORS", "*")
TIMEOUT = float(os.environ.get("QDAGENT_PROXY_TIMEOUT", "120"))
REPO = Path(__file__).resolve().parent.parent


def join_url(base: str, path: str) -> str:
    b = (base or "").rstrip("/")
    p = path if path.startswith("/") else "/" + path
    if b.endswith("/v1") and p.startswith("/v1/"):
        p = p[3:]
    return b + p


def build_upstream(req: dict):
    base = (req.get("base_url") or "").strip()
    path = (req.get("path") or "/").strip() or "/"
    method = (req.get("method") or "POST").upper()
    if not base:
        raise ValueError("base_url required")
    url = join_url(base, path)
    headers = {}
    for k, v in (req.get("headers") or {}).items():
        if v is None:
            continue
        headers[str(k)] = str(v)
    body_bytes = None
    if req.get("body_raw") is not None:
        body_bytes = base64.b64decode(req["body_raw"])
    elif req.get("body") is not None:
        body_bytes = json.dumps(req["body"], ensure_ascii=False).encode("utf-8")
        headers.setdefault(
            "Content-Type", req.get("content_type") or "application/json"
        )
    ureq = urllib.request.Request(url, data=body_bytes, headers=headers, method=method)
    return url, ureq


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt: str, *args) -> None:
        print(f"[llm-proxy] {self.address_string()} {fmt % args}", file=sys.stderr)

    def _cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", ALLOW_ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type, Authorization, X-Requested-With",
        )
        self.send_header("Access-Control-Max-Age", "86400")

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self) -> None:
        path = self.path.split("?", 1)[0].rstrip("/")
        if path == "/health":
            return self._json(
                200,
                {
                    "ok": True,
                    "role": "cors-relay+marqdo-bridge",
                    "gaps": ["GAP-01", "GAP-02", "GAP-04"],
                    "doc": "doc/gaps/01-marqdo-hard-limits.md",
                },
            )
        if path == "/store/runs":
            try:
                return self._json(200, {"ok": True, "runs": mq_bridge.list_recent(100)})
            except Exception as e:
                return self._json(500, {"ok": False, "error": str(e)})
        self.send_response(404)
        self._cors()
        self.send_header("Content-Length", "0")
        self.send_header("Connection", "close")
        self.end_headers()

    def do_POST(self) -> None:
        path = self.path.split("?", 1)[0].rstrip("/")
        n = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(n) if n else b"{}"
        try:
            req = json.loads(raw.decode("utf-8"))
        except Exception as e:
            return self._json(400, {"ok": False, "error": f"bad json: {e}"})

        try:
            if path == "/proxy/stream":
                return self._stream(req)
            if path == "/proxy":
                return self._buffered(req)
            if path == "/store/run":
                out = mq_bridge.capture(
                    title=(req.get("title") or "对话沉淀").strip(),
                    task=(req.get("task") or "").strip(),
                    result=(req.get("result") or "").strip(),
                    slug=(req.get("slug") or "").strip(),
                    surface=(req.get("surface") or "web").strip() or "web",
                    session_id=(req.get("session_id") or "").strip(),
                )
                return self._json(200, out)
            if path == "/store/sync":
                return self._json(200, mq_bridge.sync_runs())
            if path == "/store/search":
                query = (req.get("query") or "").strip()
                if not query:
                    return self._json(400, {"ok": False, "error": "query required"})
                hits = mq_bridge.search(query, top_k=int(req.get("top_k") or 5))
                return self._json(200, {"ok": True, "mode": "keyword", "hits": hits})
        except Exception as e:
            return self._json(500, {"ok": False, "error": str(e)})

        self.send_response(404)
        self._cors()
        self.send_header("Content-Length", "0")
        self.send_header("Connection", "close")
        self.end_headers()

    def _buffered(self, req: dict) -> None:
        try:
            url, ureq = build_upstream(req)
        except Exception as e:
            return self._json(400, {"ok": False, "error": str(e)})
        try:
            with urllib.request.urlopen(ureq, timeout=TIMEOUT) as resp:
                data = resp.read()
                ctype = resp.headers.get("Content-Type", "application/octet-stream")
                status = resp.status
        except urllib.error.HTTPError as e:
            data = e.read() or str(e).encode()
            ctype = (
                e.headers.get("Content-Type", "text/plain") if e.headers else "text/plain"
            )
            status = e.code
        except Exception as e:
            return self._json(502, {"ok": False, "error": str(e)})

        if "application/json" in ctype or ctype.startswith("text/"):
            try:
                parsed = json.loads(data.decode("utf-8"))
            except Exception:
                parsed = data.decode("utf-8", errors="replace")
            return self._json(
                200, {"ok": status < 400, "status": status, "url": url, "data": parsed}
            )
        return self._json(
            200,
            {
                "ok": status < 400,
                "status": status,
                "url": url,
                "content_type": ctype,
                "data_base64": base64.b64encode(data).decode("ascii"),
            },
        )

    def _stream(self, req: dict) -> None:
        body = req.get("body")
        if isinstance(body, dict):
            body = dict(body)
            body["stream"] = True
            req = dict(req)
            req["body"] = body
        try:
            url, ureq = build_upstream(req)
        except Exception as e:
            return self._json(400, {"ok": False, "error": str(e)})

        try:
            resp = urllib.request.urlopen(ureq, timeout=TIMEOUT)
        except urllib.error.HTTPError as e:
            err = e.read().decode("utf-8", errors="replace")
            self.send_response(200)
            self._cors()
            self.send_header("Content-Type", "text/event-stream; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("X-Accel-Buffering", "no")
            self.end_headers()
            payload = json.dumps(
                {"error": {"message": err or str(e), "status": e.code, "url": url}},
                ensure_ascii=False,
            )
            self.wfile.write(f"data: {payload}\n\n".encode("utf-8"))
            self.wfile.write(b"data: [DONE]\n\n")
            return
        except Exception as e:
            return self._json(502, {"ok": False, "error": str(e), "url": url})

        self.send_response(200)
        self._cors()
        ctype = resp.headers.get("Content-Type") or "text/event-stream; charset=utf-8"
        self.send_header("Content-Type", ctype)
        self.send_header("Cache-Control", "no-cache, no-transform")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()
        try:
            while True:
                chunk = resp.read(1024)
                if not chunk:
                    break
                self.wfile.write(chunk)
                self.wfile.flush()
        finally:
            try:
                resp.close()
            except Exception:
                pass

    def _json(self, code: int, obj: dict) -> None:
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main() -> None:
    (REPO / "data").mkdir(parents=True, exist_ok=True)
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    print(
        f"qdagent llm-proxy on http://{HOST}:{PORT} (Marqdo bridge; gaps GAP-01/02/04)",
        flush=True,
    )
    httpd.serve_forever()


if __name__ == "__main__":
    main()
