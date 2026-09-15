#!/usr/bin/env python3
"""OpenAI-compatible /audio/transcriptions with optional HK host-prefix proxy.

stdin JSON:
  {
    "api_key": "...",
    "base_url": "https://api.openai.com/v1",
    "model": "whisper-1",
    "language": "zh",        # optional
    "via_proxy": true,       # wrap base_url via proxy.cflmy.top/<host>/<path>
    "proxy_prefix": "https://proxy.cflmy.top",
    "filename": "audio.webm",
    "file_b64": "<base64>"
  }
stdout JSON: {ok, text?, error?, url?, via_proxy?}
"""
from __future__ import annotations

import base64
import json
import os
import sys
import urllib.error
import urllib.request
from urllib.parse import urlparse


def wrap_hk_proxy(base: str, prefix: str) -> str:
    base = (base or "").strip().rstrip("/")
    prefix = (prefix or "https://proxy.cflmy.top").strip().rstrip("/")
    if not base:
        return base
    p = urlparse(base)
    if not p.scheme or not p.netloc:
        return base
    if p.netloc == urlparse(prefix).netloc:
        return base
    # https://proxy.cflmy.top/api.openai.com/v1
    path = p.path.rstrip("/") or ""
    return f"{prefix}/{p.netloc}{path}"


def main() -> int:
    in_path = (os.environ.get("QDAGENT_ASR_IN") or "").strip()
    out_path = (os.environ.get("QDAGENT_ASR_OUT") or "").strip()
    if in_path:
        with open(in_path, "r", encoding="utf-8") as f:
            raw = f.read()
    else:
        raw = sys.stdin.read()
    try:
        req = json.loads(raw or "{}")
    except json.JSONDecodeError as e:
        result = {"ok": False, "error": f"bad json: {e}"}
        _emit(result, out_path)
        return 0

    key = (req.get("api_key") or "").strip()
    base = (req.get("base_url") or "").strip().rstrip("/")
    model = (req.get("model") or "whisper-1").strip() or "whisper-1"
    language = (req.get("language") or "").strip()
    via = bool(req.get("via_proxy"))
    prefix = (req.get("proxy_prefix") or "https://proxy.cflmy.top").strip()
    filename = (req.get("filename") or "audio.webm").strip() or "audio.webm"
    b64 = req.get("file_b64") or ""

    if not key:
        _emit({"ok": False, "error": "missing api_key"}, out_path)
        return 0
    if not base:
        _emit({"ok": False, "error": "missing base_url"}, out_path)
        return 0
    if not b64:
        _emit({"ok": False, "error": "missing file_b64"}, out_path)
        return 0

    try:
        blob = base64.b64decode(b64)
    except Exception as e:
        _emit({"ok": False, "error": f"bad file_b64: {e}"}, out_path)
        return 0

    if via:
        base = wrap_hk_proxy(base, prefix)

    url = base + "/audio/transcriptions"
    boundary = "----qdagentAsr7f3a9c"
    parts: list[bytes] = []

    def add_field(name: str, value: str) -> None:
        parts.append(f"--{boundary}\r\n".encode())
        parts.append(
            f'Content-Disposition: form-data; name="{name}"\r\n\r\n{value}\r\n'.encode()
        )

    add_field("model", model)
    if language:
        add_field("language", language)

    parts.append(f"--{boundary}\r\n".encode())
    parts.append(
        (
            f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
            f"Content-Type: application/octet-stream\r\n\r\n"
        ).encode()
    )
    parts.append(blob)
    parts.append(b"\r\n")
    parts.append(f"--{boundary}--\r\n".encode())
    body = b"".join(parts)

    http_req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Accept": "application/json",
            "User-Agent": "qdagent-asr/1.0",
        },
    )
    try:
        with urllib.request.urlopen(http_req, timeout=120) as resp:
            data = resp.read().decode("utf-8", errors="replace")
            try:
                obj = json.loads(data)
            except json.JSONDecodeError:
                obj = {"text": data}
            text = (
                (obj.get("text") if isinstance(obj, dict) else None)
                or (obj.get("transcript") if isinstance(obj, dict) else None)
                or ""
            )
            _emit(
                {
                    "ok": True,
                    "text": str(text).strip(),
                    "url": url,
                    "via_proxy": via,
                    "raw": obj if isinstance(obj, dict) else {"text": data[:500]},
                },
                out_path,
            )
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")[:400]
        _emit(
            {
                "ok": False,
                "error": f"HTTP {e.code}: {err_body}",
                "url": url,
                "via_proxy": via,
            },
            out_path,
        )
    except Exception as e:
        _emit({"ok": False, "error": str(e), "url": url, "via_proxy": via}, out_path)
    return 0


def _emit(obj: dict, out_path: str) -> None:
    s = json.dumps(obj, ensure_ascii=False)
    if out_path:
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(s)
    print(s)


if __name__ == "__main__":
    raise SystemExit(main())
