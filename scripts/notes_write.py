#!/usr/bin/env python3
"""notes.create / notes.update with digest CAS (design §9.1).

Writes only under an allowed root. Rejects abs / ... History = prior bytes
kept only via caller; this tool returns old/new digests. Never executes Marqdo.
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


def create(root: Path, rel: str, content: str) -> dict:
    path = safe_path(root, rel)
    if path.exists():
        return fail("revision.conflict", f"already exists: {rel}")
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = (content or "").encode("utf-8")
    path.write_bytes(raw)
    return {
        "ok": True,
        "result": {
            "schema": "NotesWriteV1",
            "op": "create",
            "path": rel.replace("\\", "/"),
            "digest": dig(raw),
            "revision": dig(raw),
            "bytes": len(raw),
            "no_exec": True,
        },
    }


def update(root: Path, rel: str, content: str, expected_digest: str) -> dict:
    path = safe_path(root, rel)
    if not path.is_file():
        return fail("resource.not_found", rel)
    old = path.read_bytes()
    old_d = dig(old)
    if not expected_digest:
        return fail("invalid_arguments", "expected_digest required for update")
    if expected_digest != old_d:
        return fail(
            "revision.conflict",
            f"expected {expected_digest} but file is {old_d}",
        )
    raw = (content or "").encode("utf-8")
    path.write_bytes(raw)
    new_d = dig(raw)
    return {
        "ok": True,
        "result": {
            "schema": "NotesWriteV1",
            "op": "update",
            "path": rel.replace("\\", "/"),
            "previous_digest": old_d,
            "digest": new_d,
            "revision": new_d,
            "bytes": len(raw),
            "diff_summary": f"{len(old)}→{len(raw)} bytes",
            "no_exec": True,
        },
    }


def main() -> int:
    out = os.environ.get("QDAGENT_NOTE_OUT") or ""
    op = (os.environ.get("QDAGENT_NOTE_OP") or "create").strip()
    root = Path(os.environ.get("QDAGENT_NOTE_ROOT") or "data").expanduser().resolve()
    rel = os.environ.get("QDAGENT_NOTE_PATH") or ""
    content = os.environ.get("QDAGENT_NOTE_CONTENT") or ""
    # Prefer content file for large bodies
    cpath = os.environ.get("QDAGENT_NOTE_CONTENT_PATH") or ""
    if cpath:
        content = Path(cpath).read_text(encoding="utf-8")
    expected = os.environ.get("QDAGENT_NOTE_DIGEST") or ""
    if not out:
        print("QDAGENT_NOTE_OUT required", file=sys.stderr)
        return 2
    try:
        if op == "create":
            payload = create(root, rel, content)
        elif op == "update":
            payload = update(root, rel, content, expected)
        else:
            payload = fail("invalid_arguments", f"unknown op {op}")
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
