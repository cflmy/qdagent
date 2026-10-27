#!/usr/bin/env python3
"""ResourceRef resolve/list helpers for design §11.1 (opaque IDs + workspace auth).

resource_id schemes (host-mapped, not raw browser paths as authority):
  rf.<urlsafe-b64(path)>   workspace file
  rn.<slug>                run note
Never executes Marqdo. Digests are content hashes when the file exists.
"""
from __future__ import annotations

import base64
import hashlib
import json
import os
import sys
from pathlib import Path


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def unb64url(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def media_kind(path: str) -> tuple[str, str]:
    lower = path.lower()
    if lower.endswith(".mq.md"):
        return "application/x-marqdo", "marqdo"
    if lower.endswith(".md") or lower.endswith(".markdown"):
        return "text/markdown", "markdown"
    if lower.endswith(".json"):
        return "application/json", "json"
    if lower.endswith(".csv"):
        return "text/csv", "csv"
    if lower.endswith(".pdf"):
        return "application/pdf", "pdf"
    if lower.endswith((".png", ".jpg", ".jpeg", ".webp", ".gif")):
        return "image/" + lower.rsplit(".", 1)[-1].replace("jpg", "jpeg"), "image"
    if lower.endswith((".rs", ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".toml", ".yaml", ".yml", ".css", ".html", ".sh")):
        return "text/x-code", "code"
    if lower.endswith((".txt", ".log")):
        return "text/plain", "text"
    return "application/octet-stream", "file"


def file_ref(workspace_id: str, root: Path, rel: str) -> dict:
    rel = rel.replace("\\", "/").lstrip("/")
    abs_path = (root / rel).resolve()
    root_r = root.resolve()
    if root_r not in abs_path.parents and abs_path != root_r:
        raise PermissionError("path escape")
    if not abs_path.is_file():
        raise FileNotFoundError(rel)
    raw = abs_path.read_bytes()
    dig = "sha256:" + hashlib.sha256(raw).hexdigest()
    media, kind = media_kind(rel)
    rid = "rf." + b64url(rel.encode("utf-8"))
    return {
        "schema": "ResourceRefV1",
        "resource_id": rid,
        "workspace_id": workspace_id,
        "kind": kind,
        "media_type": media,
        "revision": dig,
        "digest": dig,
        "title": abs_path.name,
        "size": len(raw),
        "origin": "workspace",
        "source_ref": rel,
        "locator": None,
        "preview": {"route": "resources/preview", "path": rel},
        "read": {"route": "resources/read", "path": rel},
    }


def note_ref(workspace_id: str, data_root: Path, slug: str) -> dict:
    if ".." in slug or "/" in slug or "\\" in slug:
        raise PermissionError("bad slug")
    path = data_root / "runs" / f"{slug}.mq.md"
    if not path.is_file():
        raise FileNotFoundError(slug)
    raw = path.read_bytes()
    dig = "sha256:" + hashlib.sha256(raw).hexdigest()
    return {
        "schema": "ResourceRefV1",
        "resource_id": "rn." + slug,
        "workspace_id": workspace_id or "local",
        "kind": "note",
        "media_type": "application/x-marqdo",
        "revision": dig,
        "digest": dig,
        "title": slug,
        "size": len(raw),
        "origin": "runs",
        "source_ref": f"runs/{slug}.mq.md",
        "locator": None,
        "preview": {"route": "note", "slug": slug},
        "read": {"route": "resources/read", "path": f"runs/{slug}.mq.md"},
    }


def resolve(env: dict) -> dict:
    workspace_id = env.get("QDAGENT_RES_WS") or ""
    root = Path(env.get("QDAGENT_RES_ROOT") or ".")
    data_root = Path(env.get("QDAGENT_RES_DATA") or "data")
    rid = (env.get("QDAGENT_RES_ID") or "").strip()
    path = (env.get("QDAGENT_RES_PATH") or "").strip()
    slug = (env.get("QDAGENT_RES_SLUG") or "").strip()
    expected = (env.get("QDAGENT_RES_DIGEST") or "").strip()

    if rid.startswith("rf."):
        path = unb64url(rid[3:]).decode("utf-8")
    elif rid.startswith("rn."):
        slug = rid[3:]

    if slug:
        ref = note_ref(workspace_id, data_root, slug)
    elif path:
        if ".." in path or path.startswith("/"):
            raise PermissionError("bad path")
        ref = file_ref(workspace_id, root, path)
    else:
        raise ValueError("path, slug, or resource_id required")

    if expected and expected not in (ref["digest"], ref["revision"]):
        return {
            "ok": False,
            "error": {
                "code": "reference.version_unavailable",
                "message": f"requested {expected} but resource is {ref['digest']}",
            },
        }
    return {"ok": True, "result": ref}


def list_resources(env: dict) -> dict:
    workspace_id = env.get("QDAGENT_RES_WS") or ""
    root = Path(env.get("QDAGENT_RES_ROOT") or ".")
    data_root = Path(env.get("QDAGENT_RES_DATA") or "data")
    kind = (env.get("QDAGENT_RES_KIND") or "file").strip().lower()
    rel = (env.get("QDAGENT_RES_PATH") or "").strip()
    cursor = int(env.get("QDAGENT_RES_CURSOR") or "0")
    limit = int(env.get("QDAGENT_RES_LIMIT") or "50")
    limit = max(1, min(limit, 200))

    items: list[dict] = []
    if kind in ("file", "all", ""):
        if ".." in rel or rel.startswith("/"):
            raise PermissionError("bad path")
        base = root / rel if rel else root
        base = base.resolve()
        root_r = root.resolve()
        if root_r not in base.parents and base != root_r:
            raise PermissionError("path escape")
        if not base.exists():
            raise FileNotFoundError(rel or ".")
        if base.is_file():
            items.append(file_ref(workspace_id, root, rel))
        else:
            names = sorted(os.listdir(base))
            for name in names:
                child_rel = f"{rel}/{name}" if rel else name
                child = base / name
                if child.is_dir():
                    items.append(
                        {
                            "schema": "ResourceRefV1",
                            "resource_id": "rd." + b64url(child_rel.encode("utf-8")),
                            "workspace_id": workspace_id,
                            "kind": "directory",
                            "media_type": "inode/directory",
                            "revision": None,
                            "digest": None,
                            "title": name,
                            "size": None,
                            "origin": "workspace",
                            "source_ref": child_rel,
                            "locator": None,
                            "is_dir": True,
                        }
                    )
                elif child.is_file():
                    items.append(file_ref(workspace_id, root, child_rel))
    if kind in ("note", "all"):
        runs = data_root / "runs"
        if runs.is_dir():
            for p in sorted(runs.glob("*.mq.md")):
                items.append(note_ref(workspace_id, data_root, p.stem))

    window = items[cursor : cursor + limit]
    next_cursor = cursor + limit if cursor + limit < len(items) else None
    return {
        "ok": True,
        "result": {
            "schema": "ResourceListV1",
            "workspace_id": workspace_id,
            "kind": kind or "file",
            "path": rel,
            "items": window,
            "next_cursor": next_cursor,
            "total_estimate": len(items),
            "no_exec": True,
        },
    }


def main() -> int:
    out = os.environ.get("QDAGENT_RES_OUT") or ""
    op = (os.environ.get("QDAGENT_RES_OP") or "resolve").strip()
    if not out:
        print("QDAGENT_RES_OUT required", file=sys.stderr)
        return 2
    try:
        if op == "list":
            payload = list_resources(os.environ)
        else:
            payload = resolve(os.environ)
    except PermissionError as e:
        payload = {"ok": False, "error": {"code": "workspace.forbidden", "message": str(e)}}
    except FileNotFoundError as e:
        payload = {"ok": False, "error": {"code": "resource.not_found", "message": str(e)}}
    except ValueError as e:
        payload = {"ok": False, "error": {"code": "resource.not_found", "message": str(e)}}
    except Exception as e:  # noqa: BLE001 — surface as runtime for host
        payload = {"ok": False, "error": {"code": "runtime.unavailable", "message": str(e)}}
    json.dump(payload, open(out, "w", encoding="utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
