#!/usr/bin/env python3
"""Change proposals for qdagent knowledge vault (review before apply).

Writes JSON to --out / QDAGENT_CHANGES_OUT.

Commands: propose | list | get | apply | reject
"""
from __future__ import annotations

import argparse
import difflib
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path


def data_root() -> Path:
    return Path(os.environ.get("QDAGENT_DATA") or "data").resolve()


def changes_dir(root: Path) -> Path:
    d = root / "kb" / "changes"
    d.mkdir(parents=True, exist_ok=True)
    return d


def run_git(cwd: Path, args: list[str]) -> tuple[int, str, str]:
    env = os.environ.copy()
    env.setdefault("GIT_AUTHOR_NAME", "qdagent")
    env.setdefault("GIT_AUTHOR_EMAIL", "qdagent@local")
    env.setdefault("GIT_COMMITTER_NAME", "qdagent")
    env.setdefault("GIT_COMMITTER_EMAIL", "qdagent@local")
    p = subprocess.run(
        ["git", *args], cwd=str(cwd), capture_output=True, text=True, env=env
    )
    return p.returncode, p.stdout, p.stderr


def ensure_git(root: Path) -> None:
    script = Path(__file__).resolve().parent / "kb_git.py"
    out = root / "tmp" / "last_kb_git.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    # Run from repo root (parent of data/) when possible so relative scripts resolve;
    # kb_git uses QDAGENT_DATA for the vault path.
    cwd = root.parent if (root.parent / "scripts" / "legacy" / "kb_git.py").exists() else root
    subprocess.run(
        [sys.executable, str(script), "ensure", "--out", str(out)],
        cwd=str(cwd),
        env={**os.environ, "QDAGENT_DATA": str(root)},
        capture_output=True,
        text=True,
    )


def safe_rel(root: Path, target: str) -> Path:
    """Resolve target path relative to data root; must stay inside root."""
    t = (target or "").strip().lstrip("/")
    if not t or ".." in t.split("/"):
        raise ValueError("invalid target path")
    # allow kb/... or runs/...
    if not (t.startswith("kb/") or t.startswith("runs/")):
        raise ValueError("target must be under kb/ or runs/")
    full = (root / t).resolve()
    if not str(full).startswith(str(root.resolve())):
        raise ValueError("path escapes data root")
    return full


def new_id() -> str:
    return time.strftime("%Y%m%d-%H%M%S") + f"-{int(time.time() * 1000) % 1000:03d}"


def meta_path(cdir: Path, cid: str) -> Path:
    return cdir / f"{cid}.json"


def proposed_path(cdir: Path, cid: str) -> Path:
    return cdir / f"{cid}.proposed.md"


def patch_path(cdir: Path, cid: str) -> Path:
    return cdir / f"{cid}.patch"


def read_meta(cdir: Path, cid: str) -> dict:
    p = meta_path(cdir, cid)
    if not p.exists():
        raise FileNotFoundError(f"change not found: {cid}")
    return json.loads(p.read_text(encoding="utf-8"))


def write_meta(cdir: Path, meta: dict) -> None:
    meta_path(cdir, meta["id"]).write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def unified_diff(old: str, new: str, path: str) -> str:
    a = old.splitlines(keepends=True)
    b = new.splitlines(keepends=True)
    return "".join(
        difflib.unified_diff(a, b, fromfile=f"a/{path}", tofile=f"b/{path}")
    )


def cmd_propose(root: Path, payload: dict) -> dict:
    ensure_git(root)
    cdir = changes_dir(root)
    target = payload.get("target") or payload.get("path") or ""
    full = safe_rel(root, target)
    rel = str(full.relative_to(root)).replace("\\", "/")
    new_body = payload.get("body") or payload.get("proposed") or ""
    if not isinstance(new_body, str):
        new_body = str(new_body)
    title = (payload.get("title") or f"Edit {rel}").strip()[:200]
    reason = (payload.get("reason") or payload.get("summary") or "").strip()[:2000]
    source = (payload.get("source") or "api").strip()[:80]

    old = ""
    if full.exists():
        old = full.read_text(encoding="utf-8")
    cid = new_id()
    patch = unified_diff(old, new_body, rel)
    proposed_path(cdir, cid).write_text(new_body, encoding="utf-8")
    patch_path(cdir, cid).write_text(patch if patch else "(no textual diff)\n", encoding="utf-8")
    meta = {
        "id": cid,
        "title": title,
        "reason": reason,
        "target": rel,
        "status": "open",
        "source": source,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "old_exists": full.exists(),
        "old_bytes": len(old.encode("utf-8")),
        "new_bytes": len(new_body.encode("utf-8")),
    }
    write_meta(cdir, meta)
    # commit proposal artifacts themselves (additive, auditable)
    run_git(root, ["add", "-A", "kb/changes"])
    run_git(root, ["commit", "-m", f"propose: {cid} {title}"])
    code, head, _ = run_git(root, ["rev-parse", "HEAD"])
    meta["propose_commit"] = head.strip() if code == 0 else ""
    write_meta(cdir, meta)
    return {"ok": True, "change": meta, "patch_preview": patch[:4000]}


def cmd_list(root: Path, status: str = "") -> dict:
    cdir = changes_dir(root)
    items = []
    for p in sorted(cdir.glob("*.json"), reverse=True):
        try:
            m = json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            continue
        if status and m.get("status") != status:
            continue
        items.append(m)
    return {"ok": True, "changes": items}


def cmd_get(root: Path, cid: str) -> dict:
    cdir = changes_dir(root)
    meta = read_meta(cdir, cid)
    patch = ""
    pp = patch_path(cdir, cid)
    if pp.exists():
        patch = pp.read_text(encoding="utf-8")
    proposed = ""
    pr = proposed_path(cdir, cid)
    if pr.exists():
        proposed = pr.read_text(encoding="utf-8")
    return {"ok": True, "change": meta, "patch": patch, "proposed": proposed}


def cmd_reject(root: Path, cid: str) -> dict:
    cdir = changes_dir(root)
    meta = read_meta(cdir, cid)
    if meta.get("status") != "open":
        return {"ok": False, "error": f"not open (status={meta.get('status')})"}
    meta["status"] = "rejected"
    meta["rejected_at"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    write_meta(cdir, meta)
    run_git(root, ["add", "-A", "kb/changes"])
    run_git(root, ["commit", "-m", f"reject: {cid}"])
    return {"ok": True, "change": meta}


def cmd_apply(root: Path, cid: str) -> dict:
    ensure_git(root)
    cdir = changes_dir(root)
    meta = read_meta(cdir, cid)
    if meta.get("status") != "open":
        return {"ok": False, "error": f"not open (status={meta.get('status')})"}
    rel = meta.get("target") or ""
    full = safe_rel(root, rel)
    pr = proposed_path(cdir, cid)
    if not pr.exists():
        return {"ok": False, "error": "missing proposed body"}
    new_body = pr.read_text(encoding="utf-8")
    full.parent.mkdir(parents=True, exist_ok=True)
    full.write_text(new_body, encoding="utf-8")
    meta["status"] = "applied"
    meta["applied_at"] = time.strftime("%Y-%m-%dT%H:%M:%S%z")
    write_meta(cdir, meta)
    run_git(root, ["add", "-A"])
    msg = f"apply: {cid} {meta.get('title') or rel}"
    code, out, err = run_git(root, ["commit", "-m", msg])
    if code != 0 and "nothing to commit" not in (err + out):
        # still mark applied if file written; try empty allow
        run_git(root, ["commit", "-m", msg, "--allow-empty"])
    code2, head, _ = run_git(root, ["rev-parse", "HEAD"])
    meta["apply_commit"] = head.strip() if code2 == 0 else ""
    write_meta(cdir, meta)
    run_git(root, ["add", str(meta_path(cdir, cid).relative_to(root))])
    run_git(root, ["commit", "-m", f"meta: applied {cid}"])
    code3, head2, _ = run_git(root, ["rev-parse", "HEAD"])
    return {
        "ok": True,
        "change": meta,
        "head": head2.strip() if code3 == 0 else meta.get("apply_commit"),
    }


def load_payload() -> dict:
    raw = os.environ.get("QDAGENT_CHANGES_PAYLOAD") or ""
    if raw.strip().startswith("{"):
        return json.loads(raw)
    path = os.environ.get("QDAGENT_CHANGES_PAYLOAD_FILE") or ""
    if path and Path(path).exists():
        return json.loads(Path(path).read_text(encoding="utf-8"))
    return {}


def write_out(path: Path, obj: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("command", choices=["propose", "list", "get", "apply", "reject"])
    ap.add_argument("--id", default="")
    ap.add_argument("--status", default="")
    ap.add_argument("--out", default="")
    args = ap.parse_args()

    root = data_root()
    out_path = Path(
        args.out
        or os.environ.get("QDAGENT_CHANGES_OUT")
        or str(root / "tmp" / "last_changes.json")
    )
    payload = load_payload()
    cid = args.id or os.environ.get("QDAGENT_CHANGES_ID") or payload.get("id") or ""

    try:
        if args.command == "propose":
            result = cmd_propose(root, payload)
        elif args.command == "list":
            st = args.status or os.environ.get("QDAGENT_CHANGES_STATUS") or ""
            result = cmd_list(root, st)
        elif args.command == "get":
            result = cmd_get(root, cid)
        elif args.command == "apply":
            result = cmd_apply(root, cid)
        elif args.command == "reject":
            result = cmd_reject(root, cid)
        else:
            result = {"ok": False, "error": "unknown"}
    except Exception as e:
        result = {"ok": False, "error": str(e)}

    write_out(out_path, result)
    print(json.dumps({"ok": result.get("ok"), "out": str(out_path)}, ensure_ascii=False))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main())
