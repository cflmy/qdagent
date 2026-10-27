#!/usr/bin/env python3
"""workspace.list / search / read for agent tools (design §9.1).

Read-only. Rejects absolute paths and `..`. Search returns path+line locators
with cursor pagination. Never executes Marqdo.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from pathlib import Path
from typing import Any

SKIP_DIR_NAMES = {
    ".git",
    ".hg",
    ".svn",
    ".marqdo",
    "node_modules",
    "target",
    "dist",
    "build",
    "__pycache__",
    ".venv",
    "venv",
}
TEXT_EXT = {
    ".md",
    ".mq.md",
    ".txt",
    ".log",
    ".json",
    ".csv",
    ".toml",
    ".yaml",
    ".yml",
    ".rs",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".py",
    ".go",
    ".css",
    ".html",
    ".sh",
    ".sql",
    ".xml",
}


def _fail(code: str, message: str) -> dict[str, Any]:
    return {"ok": False, "error": {"code": code, "message": message}}


def _safe_rel(root: Path, rel: str) -> Path:
    rel = (rel or "").replace("\\", "/").lstrip("/")
    if rel.startswith("/") or ".." in rel.split("/"):
        raise PermissionError("path escape")
    target = (root / rel).resolve() if rel else root.resolve()
    root_r = root.resolve()
    if root_r not in target.parents and target != root_r:
        raise PermissionError("path escape")
    return target


def _digest_bytes(raw: bytes) -> str:
    return "sha256:" + hashlib.sha256(raw).hexdigest()


def list_entries(root: Path, rel: str, cursor: int, limit: int) -> dict[str, Any]:
    try:
        base = _safe_rel(root, rel)
    except PermissionError as e:
        return _fail("workspace.forbidden", str(e))
    if not base.exists():
        return _fail("resource.not_found", f"missing: {rel or '.'}")
    items: list[dict[str, Any]] = []
    if base.is_file():
        raw = base.read_bytes()
        items.append(
            {
                "path": rel.replace("\\", "/"),
                "name": base.name,
                "is_dir": False,
                "size": len(raw),
                "digest": _digest_bytes(raw),
            }
        )
    else:
        names = sorted(os.listdir(base))
        for name in names:
            if name in SKIP_DIR_NAMES:
                continue
            child = base / name
            child_rel = f"{rel}/{name}" if rel else name
            child_rel = child_rel.replace("\\", "/")
            if child.is_dir():
                items.append(
                    {
                        "path": child_rel,
                        "name": name,
                        "is_dir": True,
                        "size": None,
                        "digest": None,
                    }
                )
            elif child.is_file():
                try:
                    st = child.stat()
                    items.append(
                        {
                            "path": child_rel,
                            "name": name,
                            "is_dir": False,
                            "size": st.st_size,
                            "digest": None,
                        }
                    )
                except OSError:
                    continue
    limit = max(1, min(int(limit or 50), 200))
    cursor = max(0, int(cursor or 0))
    window = items[cursor : cursor + limit]
    next_cursor = cursor + limit if cursor + limit < len(items) else None
    return {
        "ok": True,
        "result": {
            "schema": "WorkspaceListV1",
            "path": rel or ".",
            "items": window,
            "next_cursor": next_cursor,
            "total_estimate": len(items),
            "no_exec": True,
        },
    }


def _is_probably_text(path: Path) -> bool:
    name = path.name.lower()
    if name.endswith(".mq.md"):
        return True
    ext = path.suffix.lower()
    if ext in TEXT_EXT:
        return True
    # small unknown files: sniff
    try:
        sample = path.read_bytes()[:512]
    except OSError:
        return False
    if b"\x00" in sample:
        return False
    return True


def search_workspace(
    root: Path,
    query: str,
    *,
    path_prefix: str = "",
    cursor: int = 0,
    limit: int = 20,
    max_file_bytes: int = 256 * 1024,
) -> dict[str, Any]:
    q = (query or "").strip()
    if not q:
        return _fail("invalid_arguments", "query required")
    limit = max(1, min(int(limit or 20), 50))
    cursor = max(0, int(cursor or 0))
    try:
        base = _safe_rel(root, path_prefix)
    except PermissionError as e:
        return _fail("workspace.forbidden", str(e))
    if not base.exists():
        return _fail("resource.not_found", f"missing: {path_prefix or '.'}")

    pattern = re.compile(re.escape(q), re.IGNORECASE)
    hits: list[dict[str, Any]] = []
    scanned = 0

    def walk(dir_path: Path, rel: str) -> None:
        nonlocal scanned
        try:
            names = sorted(os.listdir(dir_path))
        except OSError:
            return
        for name in names:
            if name in SKIP_DIR_NAMES:
                continue
            child = dir_path / name
            child_rel = f"{rel}/{name}" if rel else name
            child_rel = child_rel.replace("\\", "/")
            if child.is_dir():
                walk(child, child_rel)
                continue
            if not child.is_file():
                continue
            scanned += 1
            # path match
            if pattern.search(name) or pattern.search(child_rel):
                hits.append(
                    {
                        "path": child_rel,
                        "kind": "path",
                        "line": None,
                        "snippet": child_rel,
                        "locator": {"path": child_rel},
                    }
                )
            if not _is_probably_text(child):
                continue
            try:
                st = child.stat()
                if st.st_size > max_file_bytes:
                    continue
                text = child.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            for i, line in enumerate(text.splitlines(), start=1):
                if pattern.search(line):
                    snippet = line.strip()
                    if len(snippet) > 200:
                        snippet = snippet[:200] + "…"
                    hits.append(
                        {
                            "path": child_rel,
                            "kind": "content",
                            "line": i,
                            "snippet": snippet,
                            "locator": {"path": child_rel, "line": i},
                        }
                    )
                    if len(hits) >= cursor + limit + 50:
                        # enough to page
                        return

    if base.is_file():
        # Single-file search scope.
        rel = path_prefix.replace("\\", "/").lstrip("/")
        scanned = 1
        try:
            text = base.read_text(encoding="utf-8", errors="replace")
            for i, line in enumerate(text.splitlines(), start=1):
                if pattern.search(line) or pattern.search(rel):
                    snippet = line.strip()
                    if len(snippet) > 200:
                        snippet = snippet[:200] + "…"
                    hits.append(
                        {
                            "path": rel,
                            "kind": "content",
                            "line": i,
                            "snippet": snippet,
                            "locator": {"path": rel, "line": i},
                        }
                    )
        except OSError:
            pass
    else:
        walk(base, path_prefix.replace("\\", "/").lstrip("/"))

    window = hits[cursor : cursor + limit]
    next_cursor = cursor + limit if cursor + limit < len(hits) else None
    return {
        "ok": True,
        "result": {
            "schema": "WorkspaceSearchV1",
            "query": q,
            "path": path_prefix or ".",
            "hits": window,
            "next_cursor": next_cursor,
            "scanned_files": scanned,
            "truncated": next_cursor is not None,
            "no_exec": True,
            "summary": f"{len(window)} hits (cursor={cursor}); use workspace_read for ranges",
        },
    }


def read_file(
    root: Path,
    rel: str,
    *,
    digest: str = "",
    line_start: int = 0,
    line_end: int = 0,
    max_bytes: int = 65536,
    cursor: str = "",
) -> dict[str, Any]:
    try:
        path = _safe_rel(root, rel)
    except PermissionError as e:
        return _fail("workspace.forbidden", str(e))
    if not path.is_file():
        return _fail("resource.not_found", rel)
    raw = path.read_bytes()
    dig = _digest_bytes(raw)
    if digest and digest != dig:
        return _fail(
            "resource.revision_mismatch",
            f"requested {digest} but file is {dig}",
        )
    max_bytes = max(1024, min(int(max_bytes or 65536), 512 * 1024))
    if cursor.startswith("line:"):
        try:
            line_start = int(cursor.split(":", 1)[1])
        except ValueError:
            pass
    text = raw.decode("utf-8", "replace")
    lines = text.splitlines()
    start = max(1, int(line_start or 1))
    end = int(line_end or 0)
    if end <= 0:
        # take enough lines to approach max_bytes
        chunk: list[str] = []
        size = 0
        i = start
        while i <= len(lines):
            line = lines[i - 1]
            add = len(line.encode("utf-8")) + 1
            if chunk and size + add > max_bytes:
                break
            chunk.append(line)
            size += add
            i += 1
        body = "\n".join(chunk)
        next_cursor = f"line:{i}" if i <= len(lines) else None
        truncated = next_cursor is not None or len(raw) > max_bytes
        used_end = start + len(chunk) - 1 if chunk else start - 1
    else:
        end = min(len(lines), max(start, end))
        body = "\n".join(lines[start - 1 : end])
        encoded = body.encode("utf-8")
        truncated = len(encoded) > max_bytes
        if truncated:
            body = encoded[:max_bytes].decode("utf-8", "replace")
        next_cursor = f"line:{end + 1}" if end < len(lines) else None
        used_end = end
    return {
        "ok": True,
        "result": {
            "schema": "WorkspaceReadV1",
            "path": rel.replace("\\", "/"),
            "digest": dig,
            "revision": dig,
            "text": body,
            "truncated": truncated,
            "next_cursor": next_cursor,
            "range": {"line_start": start, "line_end": used_end},
            "byte_length": len(raw),
            "no_exec": True,
            "summary": f"read {rel} L{start}-{used_end}"
            + (" (truncated)" if truncated else ""),
        },
    }


def main() -> int:
    out = os.environ.get("QDAGENT_WS_OUT") or ""
    op = (os.environ.get("QDAGENT_WS_OP") or "list").strip()
    root = Path(os.environ.get("QDAGENT_WS_ROOT") or ".").expanduser().resolve()
    if not out:
        print("QDAGENT_WS_OUT required", file=sys.stderr)
        return 2
    try:
        if op == "list":
            payload = list_entries(
                root,
                os.environ.get("QDAGENT_WS_PATH") or "",
                int(os.environ.get("QDAGENT_WS_CURSOR") or "0"),
                int(os.environ.get("QDAGENT_WS_LIMIT") or "50"),
            )
        elif op == "search":
            payload = search_workspace(
                root,
                os.environ.get("QDAGENT_WS_QUERY") or "",
                path_prefix=os.environ.get("QDAGENT_WS_PATH") or "",
                cursor=int(os.environ.get("QDAGENT_WS_CURSOR") or "0"),
                limit=int(os.environ.get("QDAGENT_WS_LIMIT") or "20"),
            )
        elif op == "read":
            payload = read_file(
                root,
                os.environ.get("QDAGENT_WS_PATH") or "",
                digest=os.environ.get("QDAGENT_WS_DIGEST") or "",
                line_start=int(os.environ.get("QDAGENT_WS_LINE_START") or "0"),
                line_end=int(os.environ.get("QDAGENT_WS_LINE_END") or "0"),
                max_bytes=int(os.environ.get("QDAGENT_WS_MAX_BYTES") or "65536"),
                cursor=os.environ.get("QDAGENT_WS_CURSOR") or "",
            )
        else:
            payload = _fail("invalid_arguments", f"unknown op {op}")
    except PermissionError as e:
        payload = _fail("workspace.forbidden", str(e))
    except Exception as e:  # noqa: BLE001
        payload = _fail("runtime.unavailable", str(e))
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    json.dump(payload, open(out, "w", encoding="utf-8"), ensure_ascii=False)
    return 0 if payload.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
