#!/usr/bin/env python3
"""Knowledge-base git helper for qdagent (nested repo under data/).

Ops write JSON to --out / QDAGENT_KB_GIT_OUT (GAP-09: sys.exec returns exit code only).

Commands:
  ensure | commit | log | show | revert | status | diff
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path


def data_root() -> Path:
    return Path(os.environ.get("QDAGENT_DATA") or "data").resolve()


def run_git(cwd: Path, args: list[str], check: bool = False) -> tuple[int, str, str]:
    env = os.environ.copy()
    env.setdefault("GIT_AUTHOR_NAME", "qdagent")
    env.setdefault("GIT_AUTHOR_EMAIL", "qdagent@local")
    env.setdefault("GIT_COMMITTER_NAME", "qdagent")
    env.setdefault("GIT_COMMITTER_EMAIL", "qdagent@local")
    p = subprocess.run(
        ["git", *args],
        cwd=str(cwd),
        capture_output=True,
        text=True,
        env=env,
    )
    if check and p.returncode != 0:
        raise RuntimeError(p.stderr.strip() or p.stdout.strip() or f"git {args} failed")
    return p.returncode, p.stdout, p.stderr


GITIGNORE = """# qdagent knowledge vault (nested git)
*.db
*.db-shm
*.db-wal
*.log
*.pid
tmp/
.cache/
"""


def cmd_ensure(root: Path) -> dict:
    root.mkdir(parents=True, exist_ok=True)
    for sub in ("runs", "kb", "kb/changes", "skills", "sessions", "tmp"):
        (root / sub).mkdir(parents=True, exist_ok=True)
    gi = root / ".gitignore"
    if not gi.exists() or gi.read_text(encoding="utf-8").strip() == "*":
        gi.write_text(GITIGNORE, encoding="utf-8")
    elif "kb/changes" not in gi.read_text(encoding="utf-8"):
        # keep existing permissive ignore rules if already migrated
        pass
    if not (root / ".git").exists():
        code, out, err = run_git(root, ["init"])
        if code != 0:
            return {"ok": False, "error": err or out or "git init failed"}
        run_git(root, ["config", "user.name", "qdagent"])
        run_git(root, ["config", "user.email", "qdagent@local"])
        run_git(root, ["add", "-A"])
        run_git(root, ["commit", "-m", "chore: init knowledge vault", "--allow-empty"])
    return {"ok": True, "root": str(root), "git": True}


def cmd_status(root: Path) -> dict:
    code, out, err = run_git(root, ["status", "--porcelain"])
    if code != 0:
        return {"ok": False, "error": err or out}
    return {"ok": True, "porcelain": out, "dirty": bool(out.strip())}


def cmd_commit(root: Path, message: str) -> dict:
    ens = cmd_ensure(root)
    if not ens.get("ok"):
        return ens
    run_git(root, ["add", "-A"])
    st = cmd_status(root)
    if not st.get("dirty"):
        code, out, _ = run_git(root, ["rev-parse", "HEAD"])
        return {
            "ok": True,
            "committed": False,
            "message": "nothing to commit",
            "head": out.strip() if code == 0 else "",
        }
    msg = (message or "chore: knowledge update").strip()[:200]
    code, out, err = run_git(root, ["commit", "-m", msg])
    if code != 0:
        return {"ok": False, "error": err or out or "commit failed"}
    code2, head, _ = run_git(root, ["rev-parse", "HEAD"])
    return {
        "ok": True,
        "committed": True,
        "message": msg,
        "head": head.strip() if code2 == 0 else "",
        "stdout": out.strip(),
    }


def cmd_log(root: Path, limit: int) -> dict:
    n = max(1, min(int(limit or 20), 100))
    fmt = "%H%x09%h%x09%cI%x09%s"
    code, out, err = run_git(root, ["log", f"-n{n}", f"--pretty=format:{fmt}"])
    if code != 0:
        return {"ok": False, "error": err or out, "commits": []}
    commits = []
    for line in out.splitlines():
        parts = line.split("\t", 3)
        if len(parts) >= 4:
            commits.append(
                {
                    "hash": parts[0],
                    "short": parts[1],
                    "date": parts[2],
                    "subject": parts[3],
                }
            )
    return {"ok": True, "commits": commits}


def cmd_show(root: Path, rev: str) -> dict:
    rev = (rev or "HEAD").strip()
    code, out, err = run_git(root, ["show", "--stat", "--format=fuller", rev])
    if code != 0:
        return {"ok": False, "error": err or out}
    code2, patch, _ = run_git(root, ["show", "--format=", rev])
    return {
        "ok": True,
        "rev": rev,
        "stat": out,
        "patch": patch if code2 == 0 else "",
    }


def cmd_diff(root: Path, path: str = "") -> dict:
    args = ["diff", "--"]
    if path:
        args.append(path)
    code, out, err = run_git(root, args)
    # diff returns 1 when differences exist
    if code not in (0, 1):
        return {"ok": False, "error": err or out}
    return {"ok": True, "diff": out}


def cmd_revert(root: Path, rev: str) -> dict:
    rev = (rev or "").strip()
    if not rev:
        return {"ok": False, "error": "rev required"}
    code, out, err = run_git(root, ["revert", "--no-edit", rev])
    if code != 0:
        run_git(root, ["revert", "--abort"])
        return {"ok": False, "error": err or out or "revert failed"}
    code2, head, _ = run_git(root, ["rev-parse", "HEAD"])
    return {
        "ok": True,
        "reverted": rev,
        "head": head.strip() if code2 == 0 else "",
        "stdout": out.strip(),
    }


def write_out(path: Path, obj: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "command",
        choices=["ensure", "commit", "log", "show", "revert", "status", "diff"],
    )
    ap.add_argument("--message", "-m", default="")
    ap.add_argument("--limit", type=int, default=20)
    ap.add_argument("--rev", default="HEAD")
    ap.add_argument("--path", default="")
    ap.add_argument("--out", default="")
    args = ap.parse_args()

    root = data_root()
    out_path = Path(
        args.out
        or os.environ.get("QDAGENT_KB_GIT_OUT")
        or str(root / "tmp" / "last_kb_git.json")
    )

    try:
        if args.command == "ensure":
            result = cmd_ensure(root)
        elif args.command == "commit":
            msg = args.message or os.environ.get("QDAGENT_KB_GIT_MSG") or "chore: knowledge update"
            result = cmd_commit(root, msg)
        elif args.command == "log":
            lim = int(os.environ.get("QDAGENT_KB_GIT_LIMIT") or args.limit)
            result = cmd_log(root, lim)
        elif args.command == "show":
            rev = os.environ.get("QDAGENT_KB_GIT_REV") or args.rev
            result = cmd_show(root, rev)
        elif args.command == "revert":
            rev = os.environ.get("QDAGENT_KB_GIT_REV") or args.rev
            result = cmd_revert(root, rev)
        elif args.command == "status":
            result = cmd_status(root)
        elif args.command == "diff":
            result = cmd_diff(root, args.path or os.environ.get("QDAGENT_KB_GIT_PATH") or "")
        else:
            result = {"ok": False, "error": "unknown command"}
    except Exception as e:
        result = {"ok": False, "error": str(e)}

    write_out(out_path, result)
    print(json.dumps({"ok": result.get("ok"), "out": str(out_path)}, ensure_ascii=False))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main())
