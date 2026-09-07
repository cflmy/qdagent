#!/usr/bin/env python3
"""Minimal stdio MCP server for qdagent (Cursor / Claude Desktop).

Marqdo gap: GAP-03 — Marqdo has no MCP Server host yet.
See doc/gaps/01-marqdo-hard-limits.md

Tools call Marqdo via mq_bridge (求道-捕捉 / 列出 / 搜索).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import mq_bridge  # noqa: E402

SERVER_INFO = {"name": "qdagent", "version": "0.3.0"}
PROTOCOL_VERSION = "2024-11-05"

TOOLS = [
    {
        "name": "qd_list_recent",
        "description": "List recent qdagent notes (Marqdo 求道-列出)",
        "inputSchema": {
            "type": "object",
            "properties": {"limit": {"type": "integer", "default": 20}},
        },
    },
    {
        "name": "qd_get_run",
        "description": "Read a full run note (.mq.md) by slug",
        "inputSchema": {
            "type": "object",
            "properties": {"slug": {"type": "string"}},
            "required": ["slug"],
        },
    },
    {
        "name": "qd_search",
        "description": "Keyword search over notes (evidence excerpts; open full file with qd_get_run)",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string"},
                "top_k": {"type": "integer", "default": 5},
            },
            "required": ["query"],
        },
    },
    {
        "name": "qd_capture",
        "description": "Capture via Marqdo 求道-捕捉 → data/runs/*.mq.md",
        "inputSchema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "task": {"type": "string"},
                "result": {"type": "string"},
                "slug": {"type": "string"},
            },
            "required": ["title", "result"],
        },
    },
]


def tool_result(text: str, is_error: bool = False) -> dict:
    return {"content": [{"type": "text", "text": text}], "isError": is_error}


def call_tool(name: str, args: dict) -> dict:
    args = args or {}
    if name == "qd_list_recent":
        rows = mq_bridge.list_recent(int(args.get("limit") or 20))
        # trim bodies for list
        slim = [
            {
                "slug": r.get("slug"),
                "title": r.get("title"),
                "summary": (r.get("summary") or "")[:200],
                "created_at": r.get("created_at"),
            }
            for r in rows
        ]
        return tool_result(json.dumps(slim, ensure_ascii=False, indent=2))
    if name == "qd_get_run":
        slug = (args.get("slug") or "").strip()
        run = mq_bridge.get_run_body(slug)
        if not run:
            return tool_result(f"run not found: {slug}", is_error=True)
        return tool_result(run["body"])
    if name == "qd_search":
        hits = mq_bridge.search(
            (args.get("query") or "").strip(), top_k=int(args.get("top_k") or 5)
        )
        return tool_result(json.dumps(hits, ensure_ascii=False, indent=2))
    if name == "qd_capture":
        out = mq_bridge.capture(
            title=(args.get("title") or "MCP capture").strip(),
            task=(args.get("task") or "Captured via MCP").strip(),
            result=(args.get("result") or "").strip(),
            slug=(args.get("slug") or "").strip(),
            surface="mcp",
        )
        return tool_result(json.dumps(out, ensure_ascii=False, indent=2))
    return tool_result(f"unknown tool: {name}", is_error=True)


def send(msg: dict) -> None:
    sys.stdout.write(json.dumps(msg, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def handle(msg: dict) -> None:
    mid = msg.get("id")
    method = msg.get("method")
    params = msg.get("params") or {}
    if method == "initialize":
        send(
            {
                "jsonrpc": "2.0",
                "id": mid,
                "result": {
                    "protocolVersion": PROTOCOL_VERSION,
                    "capabilities": {"tools": {}},
                    "serverInfo": SERVER_INFO,
                },
            }
        )
        return
    if method == "notifications/initialized":
        return
    if method == "tools/list":
        send({"jsonrpc": "2.0", "id": mid, "result": {"tools": TOOLS}})
        return
    if method == "tools/call":
        result = call_tool(params.get("name"), params.get("arguments") or {})
        send({"jsonrpc": "2.0", "id": mid, "result": result})
        return
    if method == "ping":
        send({"jsonrpc": "2.0", "id": mid, "result": {}})
        return
    if mid is not None:
        send(
            {
                "jsonrpc": "2.0",
                "id": mid,
                "error": {"code": -32601, "message": f"Method not found: {method}"},
            }
        )


def main() -> None:
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            handle(json.loads(line))
        except json.JSONDecodeError:
            continue


if __name__ == "__main__":
    main()
