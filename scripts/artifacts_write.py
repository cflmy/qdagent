#!/usr/bin/env python3
"""artifacts.create / artifacts.update — versioned result-area writes (design §9.1).

Writes under data/artifacts (or QDAGENT_ARTIFACT_ROOT). CAS on update.
Never executes Marqdo. Absolute / .. rejected.
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


def create(root: Path, rel: str, content: str, media_type: str) -> dict:
    path = safe_path(root, rel)
    if path.exists():
        return fail("revision.conflict", f"already exists: {rel}")
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = (content or "").encode("utf-8")
    path.write_bytes(raw)
    d = dig(raw)
    return {
        "ok": True,
        "result": {
            "schema": "ArtifactWriteV1",
            "op": "create",
            "path": rel.replace("\\", "/"),
            "media_type": media_type or "text/plain",
            "digest": d,
            "revision": d,
            "bytes": len(raw),
            "no_exec": True,
        },
    }


def update(root: Path, rel: str, content: str, expected_digest: str, media_type: str) -> dict:
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
            f"expected {expected_digest} but artifact is {old_d}",
        )
    raw = (content or "").encode("utf-8")
    path.write_bytes(raw)
    new_d = dig(raw)
    return {
        "ok": True,
        "result": {
            "schema": "ArtifactWriteV1",
            "op": "update",
            "path": rel.replace("\\", "/"),
            "media_type": media_type or "text/plain",
            "previous_digest": old_d,
            "digest": new_d,
            "revision": new_d,
            "bytes": len(raw),
            "diff_summary": f"{len(old)}→{len(raw)} bytes",
            "no_exec": True,
        },
    }


def main() -> int:
    out = os.environ.get("QDAGENT_ART_OUT") or ""
    op = (os.environ.get("QDAGENT_ART_OP") or "create").strip()
    root = Path(os.environ.get("QDAGENT_ART_ROOT") or "data/artifacts").expanduser().resolve()
    rel = os.environ.get("QDAGENT_ART_PATH") or ""
    media = os.environ.get("QDAGENT_ART_MEDIA") or "text/plain"
    expected = os.environ.get("QDAGENT_ART_DIGEST") or ""
    content = os.environ.get("QDAGENT_ART_CONTENT") or ""
    cpath = os.environ.get("QDAGENT_ART_CONTENT_PATH") or ""
    if cpath:
        content = Path(cpath).read_text(encoding="utf-8")
    if not out:
        print("QDAGENT_ART_OUT required", file=sys.stderr)
        return 2
    try:
        if op == "create":
            payload = create(root, rel, content, media)
        elif op == "update":
            payload = update(root, rel, content, expected, media)
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
