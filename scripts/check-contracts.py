#!/usr/bin/env python3
"""Consume Q00 workbench JSON fixtures and fail hard on contract drift.

No server required. Exit 0 only when all fixtures validate.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIX = ROOT / "contracts" / "fixtures" / "workbench"

REQUIRED = {
    "model-selection.json": ("examples", "invariants"),
    "usage-unknown.json": ("examples", "invariants"),
    "citation.json": ("example", "resolution_enum", "relation_enum"),
    "document-view.json": ("success", "capability_unavailable", "invariants"),
    "error-codes.json": ("matrix", "envelope_error"),
}


def load(name: str) -> dict:
    path = FIX / name
    if not path.is_file():
        raise AssertionError(f"missing fixture: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise AssertionError(f"{name}: root must be object")
    if data.get("schema_version") != 1:
        raise AssertionError(f"{name}: schema_version must be 1, got {data.get('schema_version')!r}")
    return data


def check_model_selection(data: dict) -> None:
    for ex in data["examples"]:
        mode = ex.get("mode")
        if mode not in ("manual", "policy"):
            raise AssertionError(f"bad mode: {mode}")
        if not ex.get("model_id"):
            raise AssertionError("model_id required")
        if mode == "policy" and not ex.get("policy_id"):
            raise AssertionError("policy requires policy_id")


def check_usage(data: dict) -> None:
    saw_unknown = False
    for ex in data["examples"]:
        state = ex.get("usage_state")
        display = ex.get("display") or {}
        if state == "unknown":
            saw_unknown = True
            if display.get("forbid_zero") is not True:
                raise AssertionError("unknown usage must set forbid_zero")
            if ex.get("total_tokens") == 0:
                raise AssertionError("unknown must not encode total_tokens=0")
            summary = str(display.get("summary") or "")
            if summary.strip() in ("0", "0 tokens", "0 token"):
                raise AssertionError(f"unknown must not display as zero: {summary!r}")
        if state == "zero_calls" and ex.get("total_tokens") != 0:
            raise AssertionError("zero_calls expects total_tokens=0 with confirmed no-LLM")
    if not saw_unknown:
        raise AssertionError("usage fixture must include an unknown example")


def check_citation(data: dict) -> None:
    ex = data["example"]
    for key in ("citation_id", "message_id", "document_id", "locator", "resolution"):
        if key not in ex:
            raise AssertionError(f"citation missing {key}")
    if ex["resolution"] not in data["resolution_enum"]:
        raise AssertionError("example resolution not in enum")
    if "executed" not in data["relation_enum"]:
        raise AssertionError("relation_enum must include executed")


def check_document_view(data: dict) -> None:
    ok = data["success"]
    bad = data["capability_unavailable"]
    if not ok.get("ok") or "data" not in ok:
        raise AssertionError("success envelope invalid")
    if ok["data"].get("no_exec") is not True:
        raise AssertionError("DocumentView must be no_exec")
    if bad["data"].get("capability") != "unavailable":
        raise AssertionError("fallback must declare capability unavailable")
    if not bad["data"].get("honest_reason"):
        raise AssertionError("fallback needs honest_reason")


def check_errors(data: dict) -> None:
    codes = {row["code"] for row in data["matrix"]}
    required = {
        "auth.required",
        "workspace.forbidden",
        "resource.not_found",
        "revision.conflict",
        "request_id.conflict",
        "model.unavailable",
        "rate_limited",
        "runtime.unavailable",
        "provider.unavailable",
    }
    missing = required - codes
    if missing:
        raise AssertionError(f"error matrix missing: {sorted(missing)}")
    env = data["envelope_error"]
    if env.get("ok") is not False or not isinstance(env.get("error"), dict):
        raise AssertionError("envelope_error shape invalid")


def main() -> int:
    print(f"FIX={FIX}")
    checkers = {
        "model-selection.json": check_model_selection,
        "usage-unknown.json": check_usage,
        "citation.json": check_citation,
        "document-view.json": check_document_view,
        "error-codes.json": check_errors,
    }
    for name, keys in REQUIRED.items():
        data = load(name)
        for k in keys:
            if k not in data:
                raise AssertionError(f"{name}: missing key {k}")
        checkers[name](data)
        print(f"PASS {name}")
    print("all workbench contracts ok")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as e:
        print(f"FATAL: {e}", file=sys.stderr)
        raise SystemExit(1)
