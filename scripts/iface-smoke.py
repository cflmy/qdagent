#!/usr/bin/env python3
"""Detailed HTTP interface smoke for qdagent serve (local).

Logs in as demo/demo, then hits every route in serve.mq.md 调用表 plus a few
pages. Exits non-zero on unexpected status / missing ok fields.
"""
from __future__ import annotations

import json
import os
import re
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

BASE = os.environ.get("QDAGENT_BASE", "http://127.0.0.1:17431").rstrip("/")
API_KEY = os.environ.get("QDAGENT_API_KEY", "qdagent-local")
ROOT = Path(__file__).resolve().parents[1]


class Jar:
    def __init__(self) -> None:
        self.cookies: dict[str, str] = {}

    def store(self, headers) -> None:
        for raw in headers.get_all("Set-Cookie") or []:
            part = raw.split(";", 1)[0]
            if "=" in part:
                k, v = part.split("=", 1)
                self.cookies[k.strip()] = v.strip()

    def header(self) -> str:
        return "; ".join(f"{k}={v}" for k, v in self.cookies.items())


JAR = Jar()
RESULTS: list[tuple[str, str, int, str]] = []


class FormParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.csrf = ""

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "input" and a.get("name") == "_csrf":
            self.csrf = a.get("value") or ""


def request(
    method: str,
    path: str,
    *,
    data: dict | bytes | None = None,
    headers: dict | None = None,
    auth_bearer: str | None = None,
    expect: set[int] | None = None,
    json_body: bool = True,
) -> tuple[int, bytes, object | None]:
    url = path if path.startswith("http") else BASE + path
    hdrs = {"User-Agent": "qdagent-iface-smoke/1.0"}
    if JAR.cookies:
        hdrs["Cookie"] = JAR.header()
    if auth_bearer:
        hdrs["Authorization"] = f"Bearer {auth_bearer}"
    if headers:
        hdrs.update(headers)
    body = None
    if data is not None:
        if isinstance(data, (bytes, bytearray)):
            body = bytes(data)
        elif json_body:
            body = json.dumps(data, ensure_ascii=False).encode()
            hdrs.setdefault("Content-Type", "application/json")
        else:
            body = urllib.parse.urlencode(data).encode()
            hdrs.setdefault("Content-Type", "application/x-www-form-urlencoded")
    req = urllib.request.Request(url, data=body, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            raw = resp.read()
            JAR.store(resp.headers)
            code = resp.status
    except urllib.error.HTTPError as e:
        raw = e.read()
        JAR.store(e.headers)
        code = e.code
    parsed = None
    if raw:
        try:
            parsed = json.loads(raw.decode("utf-8", errors="replace"))
        except Exception:
            parsed = None
    exp = expect or {200}
    note = "ok"
    if code not in exp:
        note = f"UNEXPECTED status (want {sorted(exp)})"
    elif isinstance(parsed, dict) and "ok" in parsed and parsed.get("ok") is False:
        # Some endpoints intentionally return ok=false (gated). Record as soft.
        note = f"ok=false err={parsed.get('error') or parsed.get('hint') or parsed}"
    RESULTS.append((method, path.split("?", 1)[0], code, note))
    return code, raw, parsed


def login() -> None:
    code, raw, _ = request("GET", "/account/login", expect={200})
    p = FormParser()
    p.feed(raw.decode("utf-8", errors="replace"))
    if not p.csrf:
        raise SystemExit("login page missing _csrf")
    # Do not auto-follow: capture Set-Cookie on the 303 itself.
    url = BASE + "/account/login"
    body = urllib.parse.urlencode(
        {"_csrf": p.csrf, "username": "demo", "password": "demo"}
    ).encode()
    hdrs = {
        "User-Agent": "qdagent-iface-smoke/1.0",
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": JAR.header(),
    }
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None
    opener = urllib.request.build_opener(NoRedirect)
    req = urllib.request.Request(url, data=body, headers=hdrs, method="POST")
    try:
        with opener.open(req, timeout=60) as resp:
            JAR.store(resp.headers)
            code = resp.status
            raw = resp.read()
    except urllib.error.HTTPError as e:
        JAR.store(e.headers)
        code = e.code
        raw = e.read()
    RESULTS.append(("POST", "/account/login", code, "ok" if code in (200, 302, 303) else f"UNEXPECTED {code}"))
    if code not in (200, 302, 303):
        raise SystemExit(f"login failed: {code} {raw[:200]!r}")
    if not JAR.cookies:
        raise SystemExit("login produced no session cookie")
    # Confirm session: health must be JSON ok
    code, raw, health = request("GET", "/api/health", expect={200})
    if not isinstance(health, dict) or not health.get("ok"):
        raise SystemExit(f"post-login health failed: {code} {raw[:300]!r}")


def must_ok(parsed, label: str) -> None:
    if not isinstance(parsed, dict):
        raise AssertionError(f"{label}: not JSON object: {parsed!r}")
    if parsed.get("ok") is False:
        raise AssertionError(f"{label}: ok=false → {parsed}")


def main() -> int:
    print(f"BASE={BASE}")
    login()
    print("logged in as demo")

    # Pages
    for path, exp in [
        ("/", {200}),
        ("/chat", {200}),
        ("/notes", {200}),
        ("/eng/preflight", {200}),
        ("/settings", {200}),
    ]:
        request("GET", path, expect=exp)
    # SPA assets are hashed under /static/app/assets/ (index.html itself is not mounted)
    request("GET", "/static/app/assets/index-DBOeabac.js", expect={200, 404})
    # Prefer any hashed asset listed on home page if the fixed name 404s
    _, home_raw, _ = request("GET", "/", expect={200})
    home = home_raw.decode("utf-8", errors="replace")
    m = re.search(r'/static/app/assets/[^"\']+\.js', home)
    if m:
        request("GET", m.group(0), expect={200})

    # Health / config
    _, _, health = request("GET", "/api/health")
    must_ok(health, "health")
    _, _, cfg = request("GET", "/api/config")
    must_ok(cfg, "config")

    # Store
    _, _, capt = request(
        "POST",
        "/api/store/run",
        data={
            "title": "iface-smoke",
            "content": "接口冒烟笔记正文，必须能读回。",
            "role": "note",
        },
    )
    must_ok(capt, "capture")
    slug = (capt or {}).get("slug") or ""
    _, _, runs = request("GET", "/api/store/runs")
    must_ok(runs, "list runs")
    if slug:
        _, _, got = request("POST", "/api/store/get", data={"slug": slug})
        must_ok(got, "get_run")
        body = (got or {}).get("body") or (got or {}).get("content") or ""
        if "接口冒烟" not in body and "iface-smoke" not in str(got):
            # content contract: at least slug round-trip
            if (got or {}).get("slug") != slug:
                raise AssertionError(f"get_run missing content for {slug}: {got}")

    request("POST", "/api/store/list", data={"limit": 5})
    request("POST", "/api/store/search", data={"query": "iface"})
    request("POST", "/api/store/sync", data={})
    request("POST", "/api/store/context", data={"query": "求道"})
    request("POST", "/api/store/profile", data={})
    request("POST", "/api/store/kb/list", data={})
    request("POST", "/api/store/changes/list", data={})
    request("POST", "/api/store/git/log", data={})

    # Engineering
    _, _, pf = request(
        "POST",
        "/api/eng/preflight",
        data={"task": "给 OpenAI /v1 网关增加工程预检再调上游"},
    )
    # preflight may return ok=false when CREATE blocked — still must be JSON
    if not isinstance(pf, dict):
        raise AssertionError(f"preflight not dict: {pf}")

    for path, payload in [
        ("/api/eng/reuse", {"task": "认证"}),
        ("/api/eng/find", {"query": "auth", "limit": 5}),
        ("/api/eng/capability", {}),
        ("/api/eng/impact", {"paths": "lib/api.mq.md"}),
        ("/api/eng/conflicts", {}),
        ("/api/eng/stale", {}),
        ("/api/eng/duplicate", {}),
        ("/api/eng/verify", {}),
        ("/api/eng/docgate", {"text": "---\ntitle: t\n---\n\n# 任务\n\nx\n\n# 结论\n\ny\n\n# main\n\n> print text=hi\n\n# 验证\n\n待验证\n\n# 元数据\n\n| a | b |\n|---|---|\n| 1 | 2 |\n"}),
        ("/api/eng/metrics", None),  # GET below
        ("/api/eng/candidates", {}),
        ("/api/eng/knowledge", {}),
        ("/api/eng/kb/status", {}),
        ("/api/eng/policies", {}),
        ("/api/eng/workbooks", {"limit": 5}),
        ("/api/eng/sessions", {"limit": 5}),
        ("/api/eng/today", None),
    ]:
        if path.endswith("/metrics") or path.endswith("/today"):
            request("GET", path)
        else:
            request("POST", path, data=payload or {})

    # Import TXT
    note = ROOT / "data" / "tmp-iface-note.txt"
    note.parent.mkdir(parents=True, exist_ok=True)
    note.write_text("求道接口冒烟导入资料。\n", encoding="utf-8")
    _, _, imp = request(
        "POST",
        "/api/eng/import",
        data={"path": str(note), "publish": False, "title": "iface-import"},
    )
    if not isinstance(imp, dict):
        raise AssertionError(f"import not dict: {imp}")
    if imp.get("ok") is False and "pdf" not in str(imp.get("error", "")).lower():
        # draft path should succeed for txt
        RESULTS[-1] = (RESULTS[-1][0], RESULTS[-1][1], RESULTS[-1][2], f"import fail: {imp}")

    # PDF explicit failure contract (if a tiny fake pdf path)
    fake_pdf = ROOT / "data" / "tmp-iface-fake.pdf"
    fake_pdf.write_bytes(b"%PDF-1.4 fake")
    request(
        "POST",
        "/api/eng/import",
        data={"path": str(fake_pdf), "publish": False},
        expect={200},
    )

    # OpenAI /v1 (Bearer)
    request("GET", "/v1/models", auth_bearer=API_KEY, expect={200})
    # chat may dry-fail without upstream; accept 200 with error body
    request(
        "POST",
        "/v1/chat/completions",
        auth_bearer=API_KEY,
        data={
            "model": "qdagent",
            "messages": [{"role": "user", "content": "ping"}],
            "stream": False,
        },
        expect={200, 401, 410, 500, 502, 503},
    )

    # Config update no-op (empty object must not 500)
    _, _, cfg_up = request("POST", "/api/config/update", data={})
    if isinstance(cfg_up, dict) and cfg_up.get("ok") is False and cfg_up.get("error") == "payload required":
        RESULTS[-1] = (
            RESULTS[-1][0],
            RESULTS[-1][1],
            RESULTS[-1][2],
            "import fail: config/update still requires payload",
        )
    # Capability with id (empty body is ok=false by contract)
    request("POST", "/api/eng/capability", data={"id": "content.openai"})

    # Summarize
    bad = [r for r in RESULTS if r[3].startswith("UNEXPECTED")]
    soft = [r for r in RESULTS if r[3].startswith("ok=false") or r[3].startswith("import fail")]
    print("\n=== RESULTS ===")
    for method, path, code, note in RESULTS:
        mark = "PASS" if note == "ok" or note.startswith("ok=false") else ("SOFT" if not note.startswith("UNEXPECTED") else "FAIL")
        if note.startswith("UNEXPECTED") or note.startswith("import fail"):
            mark = "FAIL" if note.startswith("UNEXPECTED") or note.startswith("import fail") else mark
        print(f"{mark:4} {method:4} {code:3} {path}  {note}")

    print(f"\ntotal={len(RESULTS)} unexpected={len(bad)} soft_ok_false={len(soft)}")
    if bad:
        print("FAILED unexpected statuses:", file=sys.stderr)
        for r in bad:
            print(" ", r, file=sys.stderr)
        return 1
    # import fail is hard
    if any(r[3].startswith("import fail") for r in RESULTS):
        return 1
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as e:
        print(f"FATAL: {e}", file=sys.stderr)
        raise
