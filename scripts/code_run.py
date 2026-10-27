#!/usr/bin/env python3
"""code.run / tests.run — restricted sandbox execution (design §9.1).

cwd must stay under allowed root. Absolute / .. rejected. No network by policy
(best-effort env scrub). Timeout enforced. Returns receipt; never claims verified
unless exit_code==0. Does not execute Marqdo documents.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path


def fail(code: str, message: str) -> dict:
    return {"ok": False, "error": {"code": code, "message": message}}


def safe_under(root: Path, rel: str) -> Path:
    rel = (rel or "").replace("\\", "/").lstrip("/")
    if rel.startswith("/") or ".." in rel.split("/"):
        raise PermissionError("path escape")
    target = (root / rel).resolve() if rel else root.resolve()
    root_r = root.resolve()
    if root_r not in target.parents and target != root_r:
        raise PermissionError("path escape")
    return target


def scrub_env() -> dict:
    env = {
        "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
        "HOME": os.environ.get("HOME", "/tmp"),
        "LANG": os.environ.get("LANG", "C.UTF-8"),
        "PYTHONDONTWRITEBYTECODE": "1",
        "PYTHONNOUSERSITE": "1",
    }
    # Drop proxy / API keys from child — policy: no network credentials.
    return env


def run_cmd(cwd: Path, argv: list[str], timeout_s: float) -> dict:
    t0 = time.monotonic()
    try:
        proc = subprocess.run(
            argv,
            cwd=str(cwd),
            env=scrub_env(),
            capture_output=True,
            text=True,
            timeout=timeout_s,
        )
        elapsed = time.monotonic() - t0
        stdout = (proc.stdout or "")[:64_000]
        stderr = (proc.stderr or "")[:32_000]
        truncated = len(proc.stdout or "") > 64_000 or len(proc.stderr or "") > 32_000
        return {
            "ok": True,
            "result": {
                "schema": "CodeRunReceiptV1",
                "argv": argv,
                "cwd": str(cwd),
                "exit_code": proc.returncode,
                "stdout": stdout,
                "stderr": stderr,
                "truncated": truncated,
                "elapsed_s": round(elapsed, 3),
                "timeout_s": timeout_s,
                "network": "denied_by_policy",
                "verified": proc.returncode == 0,
                "no_exec_marqdo": True,
            },
        }
    except subprocess.TimeoutExpired as e:
        elapsed = time.monotonic() - t0
        return {
            "ok": False,
            "error": {
                "code": "deadline.exceeded",
                "message": f"timed out after {timeout_s}s",
            },
            "partial": {
                "stdout": ((e.stdout or b"") if isinstance(e.stdout, (bytes, bytearray)) else (e.stdout or ""))[:64_000],
                "stderr": ((e.stderr or b"") if isinstance(e.stderr, (bytes, bytearray)) else (e.stderr or ""))[:32_000],
                "elapsed_s": round(elapsed, 3),
            },
        }


def main() -> int:
    out = os.environ.get("QDAGENT_CODE_OUT") or ""
    op = (os.environ.get("QDAGENT_CODE_OP") or "run").strip()
    root = Path(os.environ.get("QDAGENT_CODE_ROOT") or ".").expanduser().resolve()
    entry = os.environ.get("QDAGENT_CODE_ENTRY") or ""
    timeout_s = float(os.environ.get("QDAGENT_CODE_TIMEOUT") or "30")
    timeout_s = max(1.0, min(timeout_s, 120.0))
    if not out:
        print("QDAGENT_CODE_OUT required", file=sys.stderr)
        return 2
    try:
        if op == "run":
            if not entry:
                payload = fail("invalid_arguments", "entry required")
            else:
                path = safe_under(root, entry)
                if not path.is_file():
                    payload = fail("resource.not_found", entry)
                else:
                    # Only allow python/sh scripts under root — no shell -c injection.
                    if path.suffix in (".py",):
                        argv = ["python3", str(path)]
                    elif path.suffix in (".sh",):
                        argv = ["bash", str(path)]
                    else:
                        payload = fail(
                            "invalid_arguments",
                            "only .py or .sh entries supported in this sandbox",
                        )
                        Path(out).parent.mkdir(parents=True, exist_ok=True)
                        json.dump(payload, open(out, "w", encoding="utf-8"), ensure_ascii=False)
                        return 1
                    payload = run_cmd(root, argv, timeout_s)
        elif op == "tests":
            # Prefer pytest when present; else honest unavailable (no fake pass).
            try:
                import importlib.util

                has_pytest = importlib.util.find_spec("pytest") is not None
            except Exception:  # noqa: BLE001
                has_pytest = False
            if not has_pytest:
                payload = fail(
                    "runtime.unavailable",
                    "pytest not installed — tests.run unavailable (not a green fake)",
                )
            else:
                target = entry or "."
                # Allow directory or file under root.
                path = safe_under(root, target)
                argv = ["python3", "-m", "pytest", "-q", str(path)]
                payload = run_cmd(root, argv, timeout_s)
        else:
            payload = fail("invalid_arguments", f"unknown op {op}")
    except PermissionError as e:
        payload = fail("workspace.forbidden", str(e))
    except Exception as e:  # noqa: BLE001
        payload = fail("runtime.unavailable", str(e))
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    json.dump(payload, open(out, "w", encoding="utf-8"), ensure_ascii=False)
    return 0 if payload.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
