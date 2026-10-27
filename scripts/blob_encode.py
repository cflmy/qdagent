#!/usr/bin/env python3
"""Encode an authorized workspace file as JSON {ok,result|error} for resources_blob."""
from __future__ import annotations

import base64
import hashlib
import json
import os
import sys

MEDIA = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
}


def main() -> int:
    abs_path = os.environ.get("QDAGENT_BLOB_ABS") or ""
    out = os.environ.get("QDAGENT_BLOB_OUT") or ""
    rel = os.environ.get("QDAGENT_BLOB_REL") or ""
    mx = int(os.environ.get("QDAGENT_BLOB_MAX") or "20971520")
    exp = (os.environ.get("QDAGENT_BLOB_DIGEST") or "").strip()
    if not abs_path or not out:
        print("QDAGENT_BLOB_ABS/OUT required", file=sys.stderr)
        return 2
    try:
        st = os.stat(abs_path)
    except FileNotFoundError:
        json.dump(
            {"ok": False, "error": {"code": "resource.not_found", "message": "file missing"}},
            open(out, "w", encoding="utf-8"),
        )
        return 0
    if not os.path.isfile(abs_path):
        json.dump(
            {"ok": False, "error": {"code": "resource.not_file", "message": "not a file"}},
            open(out, "w", encoding="utf-8"),
        )
        return 0
    range_start = os.environ.get("QDAGENT_BLOB_RANGE_START")
    range_end = os.environ.get("QDAGENT_BLOB_RANGE_END")
    # Full-file size gate only when not ranging (Range may stream a slice).
    ranging = range_start not in (None, "") or range_end not in (None, "")
    if not ranging and st.st_size > mx:
        json.dump(
            {
                "ok": False,
                "error": {
                    "code": "resource.too_large",
                    "message": f"blob exceeds {mx} bytes",
                },
            },
            open(out, "w", encoding="utf-8"),
        )
        return 0
    with open(abs_path, "rb") as fh:
        full = fh.read()
    dig = "sha256:" + hashlib.sha256(full).hexdigest()
    if exp and exp != dig:
        json.dump(
            {
                "ok": False,
                "error": {
                    "code": "resource.revision_mismatch",
                    "message": f"requested {exp} but file is {dig}",
                },
            },
            open(out, "w", encoding="utf-8"),
        )
        return 0
    total = len(full)
    start = 0
    end = total - 1 if total else 0
    if ranging:
        try:
            start = int(range_start) if range_start not in (None, "") else 0
            end = int(range_end) if range_end not in (None, "") else total - 1
        except ValueError:
            json.dump(
                {
                    "ok": False,
                    "error": {
                        "code": "invalid_arguments",
                        "message": "range_start/range_end must be integers",
                    },
                },
                open(out, "w", encoding="utf-8"),
            )
            return 0
        if start < 0 or end < start or (total and start >= total):
            json.dump(
                {
                    "ok": False,
                    "error": {
                        "code": "invalid_arguments",
                        "message": f"bad range {start}-{end} for size {total}",
                    },
                },
                open(out, "w", encoding="utf-8"),
            )
            return 0
        if total:
            end = min(end, total - 1)
        raw = full[start : end + 1] if total else b""
        if len(raw) > mx:
            json.dump(
                {
                    "ok": False,
                    "error": {
                        "code": "resource.too_large",
                        "message": f"range exceeds {mx} bytes",
                    },
                },
                open(out, "w", encoding="utf-8"),
            )
            return 0
    else:
        raw = full
        start = 0
        end = total - 1 if total else 0
    ext = os.path.splitext(abs_path)[1].lower()
    mt = MEDIA.get(ext, "application/octet-stream")
    result = {
        "schema": "ResourceContentV1",
        "path": rel or os.path.basename(abs_path),
        "media_type": mt,
        "digest": dig,
        "revision": dig,
        "byte_length": len(raw),
        "total_bytes": total,
        "content_base64": base64.b64encode(raw).decode("ascii"),
        "no_exec": True,
        "remote_url_accepted": False,
    }
    if ranging or (total and len(raw) != total):
        result["content_range"] = f"bytes {start}-{end}/{total}"
        result["partial"] = True
    else:
        result["partial"] = False
    json.dump({"ok": True, "result": result}, open(out, "w", encoding="utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
