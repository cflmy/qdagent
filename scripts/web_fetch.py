#!/usr/bin/env python3
"""Fetch a single URL for web.fetch tool (Q-A5).

Guards: http(s) only, redirect cap, byte cap, block private/link-local/metadata
addresses. Output is evidence with trust=unverified — never claims verified fact.
"""

from __future__ import annotations

import html as html_lib
import ipaddress
import json
import os
import re
import socket
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

UA = (
    "Mozilla/5.0 (compatible; qdagent-web-fetch/1.0; +https://github.com/cflmy/qdagent)"
)
MAX_REDIRECTS = 5
DEFAULT_MAX_BYTES = 512 * 1024
HARD_MAX_BYTES = 2 * 1024 * 1024
DEFAULT_TIMEOUT = 20.0


def _is_blocked_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    return bool(
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def _host_blocked(hostname: str) -> str | None:
    host = (hostname or "").strip().lower().rstrip(".")
    if not host:
        return "empty_host"
    if host in ("localhost", "metadata.google.internal"):
        return f"blocked_host:{host}"
    # Literal IP in URL
    try:
        ip = ipaddress.ip_address(host)
        if _is_blocked_ip(ip):
            return f"blocked_ip:{host}"
        return None
    except ValueError:
        pass
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as exc:
        return f"dns_failed:{exc}"
    for info in infos:
        sockaddr = info[4]
        try:
            ip = ipaddress.ip_address(sockaddr[0])
        except ValueError:
            continue
        if _is_blocked_ip(ip):
            return f"blocked_resolved_ip:{ip}"
    return None


def _strip_html(raw: str) -> str:
    text = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", raw)
    text = re.sub(r"(?is)<br\s*/?>", "\n", text)
    text = re.sub(r"(?is)</p>", "\n\n", text)
    text = re.sub(r"(?is)<[^>]+>", " ", text)
    text = html_lib.unescape(text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


def fetch_url(
    url: str,
    *,
    max_bytes: int = DEFAULT_MAX_BYTES,
    timeout: float = DEFAULT_TIMEOUT,
    max_redirects: int = MAX_REDIRECTS,
) -> dict[str, Any]:
    started = time.time()
    max_bytes = max(1024, min(int(max_bytes or DEFAULT_MAX_BYTES), HARD_MAX_BYTES))
    current = (url or "").strip()
    if not current:
        return {
            "ok": False,
            "status": "failed",
            "error": {"code": "invalid_url", "message": "empty url"},
            "trust": "unverified",
            "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

    class _NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ANN001
            return None

    opener = urllib.request.build_opener(_NoRedirect)
    hops: list[str] = []
    final_url = current
    status_code = 0
    content_type = ""
    raw = b""
    truncated = False

    for _ in range(max(0, max_redirects) + 1):
        parsed = urllib.parse.urlparse(current)
        if parsed.scheme not in ("http", "https"):
            return {
                "ok": False,
                "status": "failed",
                "error": {
                    "code": "scheme_forbidden",
                    "message": f"only http/https allowed, got {parsed.scheme or 'none'}",
                },
                "url": url,
                "final_url": current,
                "trust": "unverified",
                "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
        block = _host_blocked(parsed.hostname or "")
        if block:
            return {
                "ok": False,
                "status": "failed",
                "error": {"code": "ssrf_blocked", "message": block},
                "url": url,
                "final_url": current,
                "trust": "unverified",
                "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
        hops.append(current)
        req = urllib.request.Request(
            current,
            headers={
                "User-Agent": UA,
                "Accept": "text/html,application/xhtml+xml,text/plain,application/json;q=0.9,*/*;q=0.5",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
            },
            method="GET",
        )
        try:
            # Manual redirect so each hop is SSRF-checked.
            with opener.open(req, timeout=timeout) as resp:
                status_code = int(resp.getcode() or 200)
                content_type = str(resp.headers.get("Content-Type") or "")
                final_url = resp.geturl() or current
                chunks: list[bytes] = []
                total = 0
                truncated = False
                while True:
                    block_b = resp.read(64 * 1024)
                    if not block_b:
                        break
                    if total + len(block_b) > max_bytes:
                        need = max_bytes - total
                        if need > 0:
                            chunks.append(block_b[:need])
                            total += need
                        truncated = True
                        break
                    chunks.append(block_b)
                    total += len(block_b)
                raw = b"".join(chunks)
                break
        except urllib.error.HTTPError as e:
            status_code = int(e.code)
            # Follow 3xx manually
            if 300 <= status_code < 400:
                loc = e.headers.get("Location") if e.headers else None
                if not loc:
                    return {
                        "ok": False,
                        "status": "failed",
                        "error": {
                            "code": "redirect_missing_location",
                            "message": f"HTTP {status_code} without Location",
                        },
                        "url": url,
                        "final_url": current,
                        "http_status": status_code,
                        "redirects": hops,
                        "trust": "unverified",
                        "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    }
                if len(hops) > max_redirects:
                    return {
                        "ok": False,
                        "status": "failed",
                        "error": {
                            "code": "too_many_redirects",
                            "message": f"exceeded {max_redirects} redirects",
                        },
                        "url": url,
                        "final_url": current,
                        "redirects": hops,
                        "trust": "unverified",
                        "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    }
                current = urllib.parse.urljoin(current, loc)
                continue
            body = e.read(max_bytes) if e.fp else b""
            raw = body
            content_type = str(e.headers.get("Content-Type") or "") if e.headers else ""
            truncated = len(body) >= max_bytes
            final_url = current
            break
        except Exception as exc:  # noqa: BLE001
            return {
                "ok": False,
                "status": "failed",
                "error": {"code": "fetch_error", "message": str(exc)},
                "url": url,
                "final_url": current,
                "redirects": hops,
                "trust": "unverified",
                "elapsed_ms": int((time.time() - started) * 1000),
                "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }
    else:
        return {
            "ok": False,
            "status": "failed",
            "error": {
                "code": "too_many_redirects",
                "message": f"exceeded {max_redirects} redirects",
            },
            "url": url,
            "redirects": hops,
            "trust": "unverified",
            "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

    # Final URL host re-check (in case of odd redirects)
    final_host = urllib.parse.urlparse(final_url).hostname or ""
    block_final = _host_blocked(final_host)
    if block_final:
        return {
            "ok": False,
            "status": "failed",
            "error": {"code": "ssrf_blocked", "message": block_final},
            "url": url,
            "final_url": final_url,
            "trust": "unverified",
            "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

    decoded = raw.decode("utf-8", "replace")
    ctype = content_type.lower()
    if "html" in ctype or decoded.lstrip()[:1] == "<":
        text = _strip_html(decoded)
        extract = "html_text"
    else:
        text = decoded
        extract = "raw_text"

    truncated = truncated or len(raw) >= max_bytes
    ok = 200 <= status_code < 300
    return {
        "ok": ok,
        "status": "succeeded" if ok else "failed",
        "schema": "WebFetchResultV1",
        "schema_version": 1,
        "url": url,
        "final_url": final_url,
        "http_status": status_code,
        "content_type": content_type,
        "extract": extract,
        "text": text,
        "byte_length": len(raw),
        "char_length": len(text),
        "truncated": truncated,
        "max_bytes": max_bytes,
        "redirects": hops,
        "trust": "unverified",
        "summary": (
            f"Fetched {final_url} ({status_code}); "
            f"{'truncated' if truncated else 'complete'} text for model; trust=unverified"
        ),
        "elapsed_ms": int((time.time() - started) * 1000),
        "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "error": None
        if ok
        else {
            "code": "http_error",
            "message": f"HTTP {status_code}",
        },
    }


def main() -> int:
    out = os.environ.get("QDAGENT_WEB_OUT") or ""
    url = os.environ.get("QDAGENT_WEB_URL") or ""
    max_bytes = int(os.environ.get("QDAGENT_WEB_MAX_BYTES") or str(DEFAULT_MAX_BYTES))
    timeout = float(os.environ.get("QDAGENT_WEB_TIMEOUT") or str(DEFAULT_TIMEOUT))
    if not out:
        print("QDAGENT_WEB_OUT required", file=sys.stderr)
        return 2
    result = fetch_url(url, max_bytes=max_bytes, timeout=timeout)
    path = Path(out)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(result, ensure_ascii=False) + "\n", encoding="utf-8")
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
