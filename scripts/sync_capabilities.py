#!/usr/bin/env python3
"""Regenerate the SKILL catalog as *part of the executable Marqdo root document*.

This is a build-time source projection, not an additional LLM prompt or tool
registry. Runtime still resolves identifiers using the actual installed source.
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENTRY = ROOT / "agent/index.mq.md"
START = "<!-- BEGIN GENERATED CAPABILITIES -->"
END = "<!-- END GENERATED CAPABILITIES -->"


def metadata(source: str, key: str) -> str:
    match = re.search(r"(?m)^" + re.escape(key) + r":\s*(.+?)\s*$",
                      source.split("---", 2)[1])
    if not match:
        raise ValueError(f"Missing {key}")
    return match.group(1).strip().strip('"')


def render() -> str:
    rows = ["| slug | 可用的领域能力 |", "|---|---|"]
    for entry in sorted((ROOT / "skills").glob("*/index.mq.md")):
        name = entry.parent.name
        if not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?", name):
            raise ValueError(f"Invalid SKILL ID: {name}")
        source = entry.read_text(encoding="utf-8")
        description = metadata(source, "description")
        if not description or len(description) > 240:
            raise ValueError(f"Invalid description: {name}")
        rows.append(f"| {name} | {description.replace('|', '\\|')} |")
    return START + "\n" + "\n".join(rows) + "\n" + END


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true",
                        help="Fail if the root capability projection is stale")
    args = parser.parse_args()
    source = ENTRY.read_text(encoding="utf-8")
    if source.count(START) != 1 or source.count(END) != 1:
        raise ValueError("The root document must contain exactly one catalog projection")
    current = source[source.index(START):source.index(END) + len(END)]
    desired = render()
    if current == desired:
        print("The Marqdo root catalog matches installed SKILL sources.")
        return 0
    if args.check:
        print("Stale Marqdo source projection; run python3 scripts/sync_capabilities.py",
              file=sys.stderr)
        return 1
    ENTRY.write_text(source.replace(current, desired), encoding="utf-8")
    print("Updated agent/index.mq.md from installed SKILL source.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
