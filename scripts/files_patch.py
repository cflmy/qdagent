#!/usr/bin/env python3
"""files.patch — CAS write for workspace files (design §9.1).

Supports full content replace under expected_digest. Absolute paths and ..
rejected. Returns previous/new digests. Never executes Marqdo.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path


def dig(raw: bytes) -> str:
    return "sha256:" + hashlib.sha256(raw).hexdigest()


def fail(code: str, message: str) -> dict:
    return {"ok": False, "error": {"code": code, "message": message}}


def safe_path(root: Path, rel: str) -> Path:
    rel = (rel or "").replace("\\", "/").lstrip("/")
    if not rel or rel.startswith("/") or ".." in rel.split("/"):
        raise PermissionError("bad path")
    target = (root / rel).resolve()
    root_r = root.resolve()
    if root_r not in target.parents and target != root_r:
        raise PermissionError("path escape")
    return target


def patch(root: Path, rel: str, content: str, expected_digest: str) -> dict:
    path = safe_path(root, rel)
    if not path.is_file():
        return fail("resource.not_found", rel)
    old = path.read_bytes()
    old_d = dig(old)
    if not expected_digest:
        return fail("invalid_arguments", "expected_digest required")
    if expected_digest != old_d:
        return fail(
            "revision.conflict",
            f"expected {expected_digest} but file is {old_d}",
        )
    raw = (content if content is not None else "").encode("utf-8")
    path.write_bytes(raw)
    new_d = dig(raw)
    return {
        "ok": True,
        "result": {
            "schema": "FilesPatchV1",
            "path": rel.replace("\\", "/"),
            "previous_digest": old_d,
            "digest": new_d,
            "revision": new_d,
            "bytes": len(raw),
            "diff_summary": f"{len(old)}→{len(raw)} bytes (content replace under CAS)",
            "no_exec": True,
        },
    }


def main() -> int:
    out = os.environ.get("QDAGENT_FILE_OUT") or ""
    root = Path(os.environ.get("QDAGENT_FILE_ROOT") or ".").expanduser().resolve()
    rel = os.environ.get("QDAGENT_FILE_PATH") or ""
    expected = os.environ.get("QDAGENT_FILE_DIGEST") or ""
    content = os.environ.get("QDAGENT_FILE_CONTENT") or ""
    cpath = os.environ.get("QDAGENT_FILE_CONTENT_PATH") or ""
    if cpath:
        content = Path(cpath).read_text(encoding="utf-8")
    if not out:
        print("QDAGENT_FILE_OUT required", file=sys.stderr)
        return 2
    try:
        payload = patch(root, rel, content, expected)
    except PermissionError as e:
        payload = fail("workspace.forbidden", str(e))
    except Exception as e:  # noqa: BLE001
        payload = fail("runtime.unavailable", str(e))
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    json.dump(payload, open(out, "w", encoding="utf-8"), ensure_ascii=False)
    if cpath:
        try:
            Path(cpath).unlink()
        except OSError:
            pass
    return 0 if payload.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
