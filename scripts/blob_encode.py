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
    if st.st_size > mx:
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
    raw = open(abs_path, "rb").read()
    dig = "sha256:" + hashlib.sha256(raw).hexdigest()
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
    ext = os.path.splitext(abs_path)[1].lower()
    mt = MEDIA.get(ext, "application/octet-stream")
    json.dump(
        {
            "ok": True,
            "result": {
                "path": rel or os.path.basename(abs_path),
                "media_type": mt,
                "digest": dig,
                "byte_length": len(raw),
                "content_base64": base64.b64encode(raw).decode("ascii"),
                "no_exec": True,
            },
        },
        open(out, "w", encoding="utf-8"),
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
