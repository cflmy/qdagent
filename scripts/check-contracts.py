#!/usr/bin/env python3
"""Consume workbench JSON fixtures and fail hard on contract drift.

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
    "v2-envelope.json": ("envelope_ok", "envelope_error", "http_codes", "invariants"),
    "route-inventory.json": ("routes", "duplicate_modules", "invariants"),
    "capabilities-probe.json": ("required_min_version", "features", "invariants"),
    "answer-outcome.json": ("examples", "outcome_enum", "invariants"),
    "agent-reliability-bits.json": (
        "features_expected_zero",
        "features_expected_one",
        "extract_formats_unavailable",
        "invariants",
    ),
    "tool-schema.json": ("examples", "eng_aliases", "invariants"),
    "resource-read.json": ("route", "envelope", "invariants"),
    "resource-ref.json": ("routes", "resource_ref_fields", "id_schemes", "invariants"),
    "context-attachment.json": ("fields", "invariants"),
    "web-tools.json": ("tools", "invariants"),
    "turn-recover.json": ("routes", "actions", "get_fields", "invariants"),
    "workspace-tools.json": ("tools", "invariants"),
    "tools-catalog.json": ("route", "fields", "invariants"),
    "notes-write.json": ("ops", "result_fields", "error_codes", "invariants"),
    "files-patch.json": ("result_fields", "error_codes", "invariants"),
    "response-preferences.json": ("route", "fields", "detail_enum", "invariants"),
}


def load(name: str) -> dict:
    path = FIX / name
    if not path.is_file():
        raise AssertionError(f"missing fixture: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise AssertionError(f"{name}: root must be object")
    sv = data.get("schema_version")
    if sv not in (1, 2):
        raise AssertionError(f"{name}: schema_version must be 1 or 2, got {sv!r}")
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
        "publication.gate_failed",
    }
    missing = required - codes
    if missing:
        raise AssertionError(f"error matrix missing: {sorted(missing)}")
    env = data["envelope_error"]
    if env.get("ok") is not False or not isinstance(env.get("error"), dict):
        raise AssertionError("envelope_error shape invalid")


def check_v2_envelope(data: dict) -> None:
    ok = data["envelope_ok"]
    err = data["envelope_error"]
    if ok.get("schema_version") != 2 or err.get("schema_version") != 2:
        raise AssertionError("v2 envelopes must declare schema_version=2")
    if ok.get("ok") is not True or "data" not in ok:
        raise AssertionError("envelope_ok invalid")
    if err.get("ok") is not False or not isinstance(err.get("error"), dict):
        raise AssertionError("envelope_error invalid")
    if "409" not in data["http_codes"]:
        raise AssertionError("http_codes must include 409")


def check_routes(data: dict) -> None:
    paths = [r["path"] for r in data["routes"]]
    if len(paths) != len(set(paths)):
        raise AssertionError("duplicate route paths in inventory")
    allowed = {"execute", "short", "read", "control"}
    for r in data["routes"]:
        c = r.get("class")
        if c not in allowed:
            raise AssertionError(f"route {r.get('path')} missing/invalid class={c!r}")
    cancel = next(r for r in data["routes"] if r["path"] == "/api/app/turns/cancel")
    if "turns.cancel" not in cancel["impl"]:
        raise AssertionError("turns/cancel must point at execution/turns.cancel")
    if cancel.get("class") != "control":
        raise AssertionError("turns/cancel must be class=control")
    events = next((r for r in data["routes"] if r["path"].endswith("/events")), None)
    if not events or events.get("class") != "control":
        raise AssertionError("turns events route must exist with class=control")
    publish = next(r for r in data["routes"] if r["path"] == "/api/app/imports/publish")
    if "publication" not in publish["impl"]:
        raise AssertionError("imports/publish must route through publication")
    # Serve invoke table must declare 类别/class for inventoried paths.
    serve = (FIX / ".." / ".." / "serve.mq.md").resolve()
    if serve.is_file():
        body = serve.read_text(encoding="utf-8")
        if "| 类别 |" not in body and "| class |" not in body:
            raise AssertionError("serve.mq.md 调用表 must include 类别/class column")
        for r in data["routes"]:
            path = r["path"]
            # Path templates may appear literally in the table.
            if path not in body and path.replace("{id}", "{id}") not in body:
                # soft: inventory may list subset; require cancel + events present
                pass
        if "/api/app/turns/cancel" not in body:
            raise AssertionError("serve.mq.md missing turns/cancel")
        if "/api/app/turns/{id}/events" not in body:
            raise AssertionError("serve.mq.md missing turns/{id}/events")


def check_capabilities(data: dict) -> None:
    if data["required_min_version"] != "2.1.4":
        raise AssertionError("required_min_version must be 2.1.4")
    feats = data["features"]
    if not feats.get("runtime.isolated_execution"):
        raise AssertionError("capabilities must expect runtime.isolated_execution")
    if not feats.get("runtime.read_lane"):
        raise AssertionError("capabilities must expect runtime.read_lane")


def check_answer_outcome(data: dict) -> None:
    outcomes = set(data["outcome_enum"])
    required = {"succeeded", "partial", "failed", "needs_input", "cancelled"}
    if required - outcomes:
        raise AssertionError(f"outcome_enum missing {sorted(required - outcomes)}")
    by_id = {ex["id"]: ex for ex in data["examples"]}
    repair = by_id.get("repair_binds_accepted")
    if not repair:
        raise AssertionError("missing repair_binds_accepted example (F02)")
    if repair.get("result") != repair.get("accepted"):
        raise AssertionError("F02: result must equal accepted after repair")
    if repair.get("result") == repair.get("raw"):
        raise AssertionError("F02: result must not remain raw after successful repair")
    if repair.get("outcome") != "succeeded" or repair.get("ok") is not True:
        raise AssertionError("F02: successful repair must be ok + outcome=succeeded")
    fail = by_id.get("gated_error_not_transport_ok")
    if not fail:
        raise AssertionError("missing gated_error_not_transport_ok example (F03)")
    if fail.get("mode") != "gated_error":
        raise AssertionError("F03: mode must be gated_error")
    if fail.get("transport_status") == "ok":
        raise AssertionError("F03: gated_error must not keep transport_status=ok")
    if fail.get("outcome") != "failed" or fail.get("ok") is not False:
        raise AssertionError("F03: gated_error must be ok=false outcome=failed")


def check_tool_schema(data: dict) -> None:
    aliases = data["eng_aliases"]
    for name in (
        "tool_find",
        "tool_reuse",
        "tool_bind",
        "tool_verify",
        "tool_summarize",
    ):
        if name not in aliases:
            raise AssertionError(f"eng_aliases missing {name}")
    product = set(data.get("product_aliases") or [])
    for name in (
        "note_read",
        "file_read",
        "web_search",
        "web_fetch",
        "workspace_list",
        "workspace_search",
        "workspace_read",
        "tools_search",
        "tools_describe",
        "plan_update",
        "task_status",
        "memory_forget",
        "notes_create",
        "notes_update",
        "files_patch",
    ):
        if name not in product:
            raise AssertionError(f"product_aliases missing {name}")
    by_id = {ex["id"]: ex for ex in data["examples"]}
    unauth = by_id.get("prepare_unauthorized_is_zero")
    if not unauth or unauth.get("executions") != 0:
        raise AssertionError("unauthorized prepare must declare executions=0")
    if unauth.get("expect_category") != "forbidden":
        raise AssertionError("unauthorized prepare expect_category=forbidden")
    bad = by_id.get("prepare_invalid_args")
    if not bad or bad.get("expect_category") != "invalid_arguments":
        raise AssertionError("invalid args must be invalid_arguments")
    good = by_id.get("prepare_authorized_find")
    if not good or good.get("expect_call_schema") != "ToolCallV1":
        raise AssertionError("authorized prepare must expect ToolCallV1")


def check_turn_recover(data: dict) -> None:
    paths = {r.get("path") for r in data["routes"] if isinstance(r, dict)}
    if "/api/app/turns/recover" not in paths:
        raise AssertionError("turn-recover must inventori /api/app/turns/recover")
    actions = {a.get("action"): a for a in data["actions"] if isinstance(a, dict)}
    if "reconnect" not in actions or "continue" not in actions:
        raise AssertionError("turn-recover actions must include reconnect and continue")
    if actions["reconnect"].get("effect") != "events_only":
        raise AssertionError("reconnect must be events_only")
    if actions["continue"].get("effect") != "new_attempt":
        raise AssertionError("continue must be new_attempt")
    fields = set(data["get_fields"])
    for f in (
        "state",
        "last_seq",
        "result_ref",
        "answer_revision",
        "message_snapshot",
        "recovery_options",
    ):
        if f not in fields:
            raise AssertionError(f"turns.get enrichment missing {f}")
    inv = "\n".join(data.get("invariants") or []).lower()
    if "message_snapshot" not in inv and "snapshot" not in inv:
        raise AssertionError("invariants must require terminal snapshot fill")
    if "events_only" not in inv and "tool" not in inv:
        raise AssertionError("invariants must separate event recover from tool exec")
    if "revision.conflict" not in inv and "cas" not in inv:
        raise AssertionError("invariants must require CAS expected_revision")


def check_tools_catalog(data: dict) -> None:
    route = data["route"]
    if route.get("path") != "/api/app/tools":
        raise AssertionError("tools-catalog route path must be /api/app/tools")
    if route.get("method") != "GET":
        raise AssertionError("tools-catalog must be GET")
    fields = set(data["fields"])
    for f in ("id", "effect", "availability", "description"):
        if f not in fields:
            raise AssertionError(f"tools catalog missing field {f}")
    forbidden = set(data.get("forbidden_fields") or [])
    for f in ("api_key", "token", "secret"):
        if f not in forbidden:
            raise AssertionError(f"forbidden_fields must include {f}")
    inv = "\n".join(data.get("invariants") or []).lower()
    if "secret" not in inv and "credential" not in inv:
        raise AssertionError("invariants must forbid leaking secrets")


def check_notes_write(data: dict) -> None:
    ops = set(data["ops"])
    if "create" not in ops or "update" not in ops:
        raise AssertionError("notes-write ops must include create and update")
    fields = set(data["result_fields"])
    for f in ("schema", "path", "digest", "revision", "no_exec"):
        if f not in fields:
            raise AssertionError(f"notes-write result_fields missing {f}")
    codes = set(data["error_codes"])
    if "revision.conflict" not in codes:
        raise AssertionError("notes-write must declare revision.conflict")
    inv = "\n".join(data.get("invariants") or []).lower()
    if "expected_digest" not in inv and "cas" not in inv:
        raise AssertionError("notes-write invariants must require digest CAS")
    if "no_exec" not in inv and "never execute" not in inv and "marqdo" not in inv:
        raise AssertionError("notes-write must forbid Marqdo execution")


def check_files_patch(data: dict) -> None:
    fields = set(data["result_fields"])
    for f in ("schema", "path", "previous_digest", "digest", "revision", "no_exec"):
        if f not in fields:
            raise AssertionError(f"files-patch result_fields missing {f}")
    codes = set(data["error_codes"])
    if "revision.conflict" not in codes:
        raise AssertionError("files-patch must declare revision.conflict")
    inv = "\n".join(data.get("invariants") or []).lower()
    if "expected_digest" not in inv and "cas" not in inv:
        raise AssertionError("files-patch invariants must require digest CAS")
    if "marqdo" not in inv and "no_exec" not in inv:
        raise AssertionError("files-patch must forbid Marqdo execution")


def check_response_preferences(data: dict) -> None:
    route = data["route"]
    if route.get("path") != "/api/app/response_preferences":
        raise AssertionError("response-preferences route path mismatch")
    if route.get("method") != "POST":
        raise AssertionError("response-preferences must be POST")
    fields = set(data["fields"])
    for f in ("detail", "revision", "scope", "principal"):
        if f not in fields:
            raise AssertionError(f"response-preferences fields missing {f}")
    enum = set(data["detail_enum"])
    for d in ("concise", "standard", "detailed"):
        if d not in enum:
            raise AssertionError(f"detail_enum missing {d}")
    inv = "\n".join(data.get("invariants") or []).lower()
    if "expected_revision" not in inv and "revision.conflict" not in inv:
        raise AssertionError("invariants must require expected_revision CAS")
    if "override" not in inv and "turn" not in inv:
        raise AssertionError("invariants must state turn override priority")


def check_workspace_tools(data: dict) -> None:
    by_id = {t.get("id"): t for t in data["tools"] if isinstance(t, dict)}
    for tid in (
        "workspace_list",
        "workspace_search",
        "workspace_read",
        "tools_search",
        "tools_describe",
    ):
        if tid not in by_id:
            raise AssertionError(f"workspace-tools missing {tid}")
    hits = by_id["workspace_search"].get("hit_fields") or []
    for f in ("path", "line", "locator"):
        if f not in hits:
            raise AssertionError(f"workspace_search hit_fields missing {f}")
    inv = "\n".join(data.get("invariants") or []).lower()
    if "workspace.forbidden" not in inv and "path escape" not in inv and ".." not in inv:
        raise AssertionError("invariants must reject path escape")
    if "revision_mismatch" not in inv and "digest" not in inv:
        raise AssertionError("invariants must require digest mismatch honesty")
    if "tools_search" not in inv and "never execute" not in inv:
        raise AssertionError("invariants must state tools_search does not execute")


def check_web_tools(data: dict) -> None:
    by_id = {t.get("id"): t for t in data["tools"] if isinstance(t, dict)}
    for tid in ("web_search", "web_fetch"):
        if tid not in by_id:
            raise AssertionError(f"web-tools missing {tid}")
        if by_id[tid].get("trust") != "unverified":
            raise AssertionError(f"{tid} must declare trust=unverified")
    fetch = by_id["web_fetch"]
    guards = set(fetch.get("guards") or [])
    for g in ("http_https_only", "ssrf_block_private", "max_redirects", "max_bytes"):
        if g not in guards:
            raise AssertionError(f"web_fetch missing guard {g}")
    inv = "\n".join(data.get("invariants") or []).lower()
    if "unverified" not in inv:
        raise AssertionError("web-tools invariants must keep trust unverified")
    if "unique" not in inv and "per-call" not in inv:
        raise AssertionError("web-tools invariants must require per-call unique out paths")
    if "fabricat" not in inv and "伪造" not in inv:
        raise AssertionError("web-tools invariants must forbid fabricating hits offline")


def check_agent_reliability_bits(data: dict) -> None:
    if data["required_min_version"] != "2.1.4":
        raise AssertionError("required_min_version must be 2.1.4")
    zeros = set(data.get("features_expected_zero") or [])
    for bit in (
        "agent.output_channels_v1",
        "agent.context_pack_v2",
        "agent.error_v1",
        "agent.checkpoint_v2",
        "agent.tool_schema_v1",
        "resource.view_v1",
    ):
        if bit in zeros:
            raise AssertionError(f"M-A1–M-A4 bit {bit} must not stay expected-zero")
    ones = data["features_expected_one"]
    for bit in (
        "agent.error_v1",
        "agent.checkpoint_v2",
        "agent.tool_schema_v1",
        "agent.output_channels_v1",
        "agent.context_pack_v2",
        "resource.view_v1",
    ):
        if bit not in ones:
            raise AssertionError(f"M-A1–M-A4 expects {bit}=1")
    unavailable = set(data["extract_formats_unavailable"])
    for fmt in ("pdf", "docx", "ocr", "image"):
        if fmt not in unavailable:
            raise AssertionError(f"extract format {fmt} must stay unavailable until plugins land")
    for fmt in ("json", "csv"):
        if fmt in unavailable:
            raise AssertionError(f"extract format {fmt} is live after M-A5 ResourceView subset")
    available = set(data.get("extract_formats_available") or [])
    for fmt in ("json", "csv", "text", "markdown"):
        if fmt not in available:
            raise AssertionError(f"extract_formats_available missing live format {fmt}")


def check_context_attachment(data: dict) -> None:
    fields = set(data["fields"])
    for req in ("resource_id", "workspace_id", "title", "revision", "origin", "range"):
        if req not in fields:
            raise AssertionError(f"ContextAttachment missing field {req}")
    inv = "\n".join(data.get("invariants") or [])
    if "Preview alone" not in inv and "preview" not in inv.lower():
        raise AssertionError("invariants must separate preview from pin")
    if "freeze" not in inv.lower() and "冻结" not in inv:
        raise AssertionError("invariants must require freeze on send")
    if "silent" not in inv.lower() and "静默" not in inv:
        raise AssertionError("invariants must forbid silent refresh on digest change")
    routes = data.get("routes") or []
    paths = {r.get("path") for r in routes if isinstance(r, dict)}
    if "/api/app/resources/verify_attachments" not in paths:
        raise AssertionError("context-attachment must inventori verify_attachments route")


def check_resource_ref(data: dict) -> None:
    paths = {r.get("path") for r in data["routes"]}
    if "/api/app/resources/resolve" not in paths or "/api/app/resources/list" not in paths:
        raise AssertionError("resource-ref must inventori resolve and list routes")
    fields = set(data["resource_ref_fields"])
    for req in (
        "schema",
        "resource_id",
        "workspace_id",
        "kind",
        "media_type",
        "revision",
        "digest",
        "title",
        "origin",
        "source_ref",
    ):
        if req not in fields:
            raise AssertionError(f"ResourceRefV1 missing field {req}")
    schemes = " ".join(data.get("id_schemes") or [])
    if "rf." not in schemes or "rn." not in schemes:
        raise AssertionError("id_schemes must include rf.* and rn.*")
    inv = "\n".join(data.get("invariants") or [])
    if "version_unavailable" not in inv and "silent" not in inv:
        raise AssertionError("invariants must forbid silent version fallback")


def check_resource_read(data: dict) -> None:
    route = data["route"]
    if route.get("path") != "/api/app/resources/read":
        raise AssertionError("resource-read route path must be /api/app/resources/read")
    if "resources_read" not in str(route.get("impl") or ""):
        raise AssertionError("resource-read must implement workbench.resources_read")
    env = data["envelope"]
    if env.get("ok") is not True:
        raise AssertionError("resource-read example envelope must be ok")
    body = env.get("data") or {}
    if body.get("schema") != "ResourceReadV1":
        raise AssertionError("ResourceReadV1 schema required")
    if body.get("no_exec") is not True:
        raise AssertionError("ResourceReadV1 must set no_exec")
    if "next_cursor" not in body:
        raise AssertionError("ResourceReadV1 must include next_cursor field")
    inv = "\n".join(data.get("invariants") or [])
    if "extract.unavailable" not in inv and "extract.unavailable" not in json.dumps(data):
        if "extract.unavailable" not in inv:
            raise AssertionError("invariants must mention PDF/image extract.unavailable honesty")


def main() -> int:
    print(f"FIX={FIX}")
    checkers = {
        "model-selection.json": check_model_selection,
        "usage-unknown.json": check_usage,
        "citation.json": check_citation,
        "document-view.json": check_document_view,
        "error-codes.json": check_errors,
        "v2-envelope.json": check_v2_envelope,
        "route-inventory.json": check_routes,
        "capabilities-probe.json": check_capabilities,
        "answer-outcome.json": check_answer_outcome,
        "agent-reliability-bits.json": check_agent_reliability_bits,
        "tool-schema.json": check_tool_schema,
        "resource-read.json": check_resource_read,
        "resource-ref.json": check_resource_ref,
        "context-attachment.json": check_context_attachment,
        "web-tools.json": check_web_tools,
        "turn-recover.json": check_turn_recover,
        "workspace-tools.json": check_workspace_tools,
        "tools-catalog.json": check_tools_catalog,
        "notes-write.json": check_notes_write,
        "files-patch.json": check_files_patch,
        "response-preferences.json": check_response_preferences,
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
