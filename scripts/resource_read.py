#!/usr/bin/env python3
"""Authorized range read for POST /api/app/resources/read (design §11.1).

Supports line range / byte cap / next_cursor. PDF/image/office: extract stays
unavailable (F16) — never invent OCR text. Never executes Marqdo.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys

NO_EXTRACT_EXT = {
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".docx",
    ".xlsx",
    ".pptx",
}


def fail(out: str, code: str, message: str, retryable: bool = False) -> int:
    json.dump(
        {
            "ok": False,
            "error": {"code": code, "message": message, "retryable": retryable},
        },
        open(out, "w", encoding="utf-8"),
    )
    return 0


def main() -> int:
    abs_path = os.environ.get("QDAGENT_READ_ABS") or ""
    out = os.environ.get("QDAGENT_READ_OUT") or ""
    rel = os.environ.get("QDAGENT_READ_REL") or ""
    exp = (os.environ.get("QDAGENT_READ_DIGEST") or "").strip()
    max_bytes = int(os.environ.get("QDAGENT_READ_MAX_BYTES") or "65536")
    line_start = int(os.environ.get("QDAGENT_READ_LINE_START") or "0")
    line_end = int(os.environ.get("QDAGENT_READ_LINE_END") or "0")
    cursor = (os.environ.get("QDAGENT_READ_CURSOR") or "").strip()
    cell_col = int(os.environ.get("QDAGENT_READ_CELL_COL") or "0")

    if not abs_path or not out:
        print("QDAGENT_READ_ABS/OUT required", file=sys.stderr)
        return 2

    try:
        st = os.stat(abs_path)
    except FileNotFoundError:
        return fail(out, "resource.not_found", "file missing")
    if not os.path.isfile(abs_path):
        return fail(out, "resource.not_file", "not a file")

    raw = open(abs_path, "rb").read()
    dig = "sha256:" + hashlib.sha256(raw).hexdigest()
    if exp and exp != dig:
        return fail(
            out,
            "resource.revision_mismatch",
            f"requested {exp} but file is {dig}",
        )

    ext = os.path.splitext(abs_path)[1].lower()
    if ext in NO_EXTRACT_EXT:
        kind = "pdf" if ext == ".pdf" else ("image" if ext.startswith(".") and ext in {".png", ".jpg", ".jpeg", ".webp", ".gif"} else "office")
        json.dump(
            {
                "ok": True,
                "result": {
                    "schema": "ResourceReadV1",
                    "path": rel or os.path.basename(abs_path),
                    "digest": dig,
                    "byte_length": len(raw),
                    "kind": kind,
                    "text": None,
                    "truncated": False,
                    "next_cursor": None,
                    "no_exec": True,
                    "capabilities": {
                        "extract": False,
                        "ocr": False,
                        "visual_preview": "client" if kind in ("pdf", "image") else False,
                    },
                    "diagnostics": [
                        {
                            "code": "extract.unavailable",
                            "message": f"{kind} text extract unavailable; use resources/preview for visual preview",
                        },
                        {"code": "ocr.unavailable", "message": "ocr not claimed"},
                    ],
                    "range": {"line_start": None, "line_end": None, "cell_col": None},
                },
            },
            open(out, "w", encoding="utf-8"),
        )
        return 0

    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError:
        text = raw.decode("utf-8", errors="replace")

    lines = text.splitlines(keepends=True)
    start = 1
    if cursor.startswith("line:"):
        try:
            start = max(1, int(cursor.split(":", 1)[1]))
        except ValueError:
            return fail(out, "resource.bad_cursor", f"invalid cursor {cursor}")
    elif line_start >= 1:
        start = line_start

    end = len(lines)
    if line_end >= 1:
        end = min(end, line_end)
    # Default window when only max_bytes / cursor: take lines until byte budget.
    chunk: list[str] = []
    size = 0
    last = start - 1
    for i in range(start - 1, end):
        piece = lines[i]
        if size + len(piece.encode("utf-8")) > max_bytes and chunk:
            break
        chunk.append(piece)
        size += len(piece.encode("utf-8"))
        last = i + 1
        if size >= max_bytes:
            break

    body = "".join(chunk)
    more = last < len(lines) and (line_end <= 0 or last < line_end)
    next_cursor = f"line:{last + 1}" if more else None

    cell_text = None
    if cell_col >= 1 and chunk:
        # CSV-ish: first line of the window, split on comma (preview splitter).
        row = chunk[0].rstrip("\r\n")
        cells: list[str] = []
        cur = ""
        in_q = False
        for ch in row:
            if ch == '"':
                in_q = not in_q
                continue
            if ch == "," and not in_q:
                cells.append(cur)
                cur = ""
            else:
                cur += ch
        cells.append(cur)
        if cell_col <= len(cells):
            cell_text = cells[cell_col - 1]

    json.dump(
        {
            "ok": True,
            "result": {
                "schema": "ResourceReadV1",
                "path": rel or os.path.basename(abs_path),
                "digest": dig,
                "byte_length": len(raw),
                "kind": "text",
                "text": body if cell_text is None else cell_text,
                "truncated": bool(more or len(raw) > len(body.encode("utf-8"))),
                "next_cursor": next_cursor,
                "no_exec": True,
                "capabilities": {"extract": True, "ocr": False, "line_range": True},
                "diagnostics": [],
                "range": {
                    "line_start": start if chunk else None,
                    "line_end": last if chunk else None,
                    "cell_col": cell_col if cell_col >= 1 else None,
                },
            },
        },
        open(out, "w", encoding="utf-8"),
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
