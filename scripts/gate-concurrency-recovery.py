#!/usr/bin/env python3
"""T-D*/T-C*/T-E* + QR-01 static gates for concurrency/recovery landing."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def fail(msg: str) -> None:
    print(f"FAIL: {msg}", file=sys.stderr)
    raise SystemExit(1)


def read(rel: str) -> str:
    p = ROOT / rel
    if not p.is_file():
        fail(f"missing {rel}")
    return p.read_text(encoding="utf-8")


def main() -> int:
    serve = read("serve.mq.md")
    if "| 类别 |" not in serve and "| class |" not in serve:
        fail("serve.mq.md 调用表 missing 类别/class")
    for path in (
        "/api/app/turns/cancel",
        "/api/app/turns/{id}/events",
        "/api/app/turns/{id}",
        "/v1/chat/completions",
    ):
        if path not in serve:
            fail(f"serve.mq.md missing route {path}")
    if not re.search(r"turns/cancel.*control|/api/app/turns/cancel\|[^\n]*\| control", serve):
        # row contains control in 类别 column
        if "| /api/app/turns/cancel |" not in serve or "control" not in serve:
            fail("turns/cancel must be class=control")
    if "| /v1/chat/completions |" not in serve or "execute" not in serve:
        fail("v1 chat must be class=execute")

    turns = read("execution/turns.mq.md")
    for needle in (
        "## append_event",
        "## events",
        "## bind_runtime",
        "## bridge_runtime_cancel",
        "turn_events",
        "Last-Event-ID",
        "expected_revision",
    ):
        if needle not in turns:
            fail(f"execution/turns.mq.md missing {needle}")

    db = read("db/index.mq.md")
    if "turn_events" not in db:
        fail("db/index.mq.md must init turn_events")
    if "idx_turn_events_turn_seq" not in db:
        fail("missing UNIQUE(turn_id, seq) migrate")

    openai = read("gateway/openai.mq.md")
    if "subscribe_only" not in openai:
        fail("gateway/openai must support subscribe-only resume")

    api_ts = read("frontend/src/lib/api.ts")
    for needle in ("appTurnsEvents", "Last-Event-ID", "appTurnsGet", "执行槽已满"):
        if needle not in api_ts:
            fail(f"frontend api.ts missing {needle}")

    store = read("frontend/src/stores/session-store.ts")
    for needle in ("resumeTurn", "lastEventId", "cancelTurn"):
        if needle not in store:
            fail(f"session-store missing {needle}")
    if "Abort ≠ cancelled" not in store and "observer closed only" not in store:
        # comment text may vary; require abort not auto-[已停止]
        if "[已停止]" in store and "AbortError" in store:
            # ensure AbortError path does not set 已停止
            if re.search(r"AbortError[\s\S]{0,200}\[已停止\]", store):
                fail("AbortError must not mark 已停止 (Stop≠Abort)")

    chat = read("frontend/src/components/pages/ChatPage.tsx")
    if "resumeTurn" not in chat:
        fail("ChatPage must call resumeTurn")
    if "不 cancel" not in chat and "不 cancel 任务" not in chat:
        # unmount must abort observer only
        if "ctrl.abort()" not in chat:
            fail("ChatPage unmount should abort observer only")

    inv = json.loads(read("contracts/fixtures/workbench/route-inventory.json"))
    for r in inv["routes"]:
        if r.get("class") not in {"execute", "short", "read", "control"}:
            fail(f"inventory route {r.get('path')} missing class")

    # Marqdo disconnect default (sibling repo may be present)
    marqdo = ROOT.parent / "marqdo" / "plugins" / "web" / "internal" / "httpx" / "routes_invoke.go"
    if marqdo.is_file():
        go = marqdo.read_text(encoding="utf-8")
        if "cancelOnDisconnect" not in go:
            fail("marqdo streamIsolatedSSE missing cancelOnDisconnect")
        if "X-Marqdo-Cancel-On-Disconnect" not in go:
            fail("missing opt-in cancel-on-disconnect header")
        if 'case "execute", "short", "read", "control":' not in go and "case \"execute\", \"short\", \"read\", \"control\":" not in go:
            fail("short/read/control must use isolated invoke (no parent INVOKE_LOCK)")

    print("PASS concurrency/recovery gates (T-D*/T-C*/T-E*/QR-01 static)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
