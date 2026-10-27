#!/usr/bin/env python3
"""Verify ContextAttachmentV1 pins against live ResourceRef digests (QA-16).

Never silently refreshes pinned digests. On mismatch, status=stale and the
frozen revision stays authoritative for the turn.
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

from resource_index import note_ref, file_ref, unb64url


def _live_ref(
    workspace_id: str,
    root: Path,
    data_root: Path,
    resource_id: str,
    source_ref: str,
) -> dict[str, Any]:
    rid = (resource_id or "").strip()
    path = (source_ref or "").strip()
    if rid.startswith("rn."):
        return note_ref(workspace_id, data_root, rid[3:])
    if rid.startswith("rf."):
        path = unb64url(rid[3:]).decode("utf-8")
        return file_ref(workspace_id, root, path)
    if path:
        if ".." in path or path.startswith("/"):
            raise PermissionError("bad path")
        return file_ref(workspace_id, root, path)
    raise ValueError("resource_id or source_ref required")


def verify_attachments(
    root: Path,
    data_root: Path,
    workspace_id: str,
    attachments: list[Any],
) -> dict[str, Any]:
    verified: list[dict[str, Any]] = []
    stale = 0
    missing = 0
    for raw in attachments:
        if not isinstance(raw, dict):
            continue
        item = dict(raw)
        rid = str(item.get("resource_id") or "")
        path = str(item.get("source_ref") or item.get("path") or "")
        # Nested resource object (optional)
        resource = item.get("resource")
        if isinstance(resource, dict):
            rid = rid or str(resource.get("id") or resource.get("resource_id") or "")
            path = path or str(resource.get("path") or resource.get("source_ref") or "")
            pinned = str(
                item.get("digest")
                or item.get("revision")
                or resource.get("digest")
                or resource.get("revision")
                or ""
            )
        else:
            pinned = str(item.get("digest") or item.get("revision") or "")
        try:
            live = _live_ref(workspace_id, root, data_root, rid, path)
        except (PermissionError, FileNotFoundError, ValueError) as exc:
            item["verify"] = {
                "status": "missing",
                "reason": str(exc),
                "pinned_digest": pinned,
            }
            missing += 1
            verified.append(item)
            continue
        live_dig = str(live.get("digest") or live.get("revision") or "")
        if pinned and live_dig and pinned != live_dig:
            item["verify"] = {
                "status": "stale",
                "reason": "digest_mismatch",
                "pinned_digest": pinned,
                "live_digest": live_dig,
                "live_revision": live.get("revision") or live_dig,
            }
            stale += 1
        else:
            item["verify"] = {
                "status": "ok",
                "pinned_digest": pinned or live_dig,
                "live_digest": live_dig or pinned,
            }
        # Surface live ids for callers without mutating pin fields.
        item["live_resource_id"] = live.get("resource_id")
        item["live_source_ref"] = live.get("source_ref")
        verified.append(item)
    return {
        "schema": "ContextAttachmentVerifyV1",
        "schema_version": 1,
        "ok": True,
        "count": len(verified),
        "stale": stale,
        "missing": missing,
        "attachments": verified,
    }


def freeze_system_note(verified: dict[str, Any]) -> str:
    lines = [
        "[context_attachments verify]",
        "Pinned ResourceRefs are frozen at send. "
        "stale = workspace bytes changed after pin — keep pinned digest; do not silent-refresh.",
    ]
    for att in verified.get("attachments") or []:
        if not isinstance(att, dict):
            continue
        verify = att.get("verify") if isinstance(att.get("verify"), dict) else {}
        rid = att.get("resource_id") or ""
        title = att.get("title") or att.get("live_source_ref") or rid
        status = verify.get("status") or "unknown"
        pinned = verify.get("pinned_digest") or att.get("revision") or ""
        line = f"- {status}: {title} resource_id={rid} pinned={pinned}"
        if status == "stale":
            line += f" live={verify.get('live_digest')}"
        rng = att.get("range")
        if rng:
            line += f" range={json.dumps(rng, ensure_ascii=False)}"
        lines.append(line)
    return "\n".join(lines)


def main() -> int:
    out = os.environ.get("QDAGENT_RES_OUT") or ""
    root = Path(os.environ.get("QDAGENT_RES_ROOT") or ".").expanduser().resolve()
    data_root = Path(os.environ.get("QDAGENT_RES_DATA") or "data").expanduser().resolve()
    workspace_id = os.environ.get("QDAGENT_RES_WS") or ""
    att_path = os.environ.get("QDAGENT_RES_ATTACHMENTS") or ""
    if not out:
        print("QDAGENT_RES_OUT required", file=sys.stderr)
        return 2
    if not root.is_dir():
        payload = {"ok": False, "error": {"code": "workspace.forbidden", "message": "root_not_directory"}}
        json.dump(payload, open(out, "w", encoding="utf-8"))
        return 1
    raw = "[]"
    if att_path:
        if att_path == "-":
            raw = sys.stdin.read()
        else:
            raw = Path(att_path).read_text(encoding="utf-8")
    try:
        attachments = json.loads(raw) if raw.strip() else []
    except json.JSONDecodeError as exc:
        payload = {"ok": False, "error": {"code": "invalid_json", "message": str(exc)}}
        json.dump(payload, open(out, "w", encoding="utf-8"))
        return 1
    if not isinstance(attachments, list):
        payload = {"ok": False, "error": {"code": "invalid_json", "message": "attachments_must_be_list"}}
        json.dump(payload, open(out, "w", encoding="utf-8"))
        return 1
    try:
        result = verify_attachments(root, data_root, workspace_id, attachments)
        payload = {"ok": True, "result": result}
    except PermissionError as e:
        payload = {"ok": False, "error": {"code": "workspace.forbidden", "message": str(e)}}
    except Exception as e:  # noqa: BLE001
        payload = {"ok": False, "error": {"code": "runtime.unavailable", "message": str(e)}}
    json.dump(payload, open(out, "w", encoding="utf-8"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
