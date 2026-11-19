#!/usr/bin/env python3
"""Source-tree architecture invariants, not compiler/security tests.

Run explicitly during development. This script intentionally does not invoke
Marqdo, a model, a network service, or any system integration test.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REQUIRED = ("agent/index.mq.md", "agent/catalog.mq.md", "agent/executor.mq.md")
FORBIDDEN = ("ext/root-skill", "pages", "skills/marqdo-dev")
EFFECTS = {"read", "model", "compute", "external", "write"}
errors: list[str] = []


def report(path: str, reason: str) -> None:
    errors.append(f"{path}: {reason}")


for required in REQUIRED:
    if not (ROOT / required).is_file():
        report(required, "missing canonical entry")

for old in FORBIDDEN:
    if (ROOT / old).exists():
        report(old, "legacy architecture has been reintroduced")

skills = ROOT / "skills"
if not skills.is_dir():
    report("skills/", "missing capability directory")
else:
    for child in sorted(skills.iterdir()):
        if not child.is_dir():
            report(str(child.relative_to(ROOT)), "top-level skills entries must be directories")
            continue
        name = child.name
        if not re.fullmatch(r"[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?", name):
            report(str(child.relative_to(ROOT)), "invalid skill ID")
        entry = child / "index.mq.md"
        if not entry.is_file():
            report(str(entry.relative_to(ROOT)), "missing skill entry")
            continue
        source = entry.read_text(encoding="utf-8")
        front = source.split("---", 2)
        if not source.startswith("---\n") or len(front) < 3:
            report(str(entry.relative_to(ROOT)), "missing metadata frontmatter")
            continue
        meta = front[1]
        description = re.search(r"(?m)^description:\s*(.+?)\s*$", meta)
        effects = re.search(r"(?m)^agent_effects:\s*(\S+)\s*$", meta)
        if not description or len(description.group(1).strip().strip('"')) > 240:
            report(str(entry.relative_to(ROOT)), "description must be present and <= 240 characters")
        if not effects or effects.group(1) not in EFFECTS:
            report(str(entry.relative_to(ROOT)), "unknown or missing agent_effects")
        if not re.search(r"(?m)^## run\s*$", source):
            report(str(entry.relative_to(ROOT)), "missing callable run")
        run = source.split("## run", 1)[-1].split("## ", 1)[0]
        if re.search(r"(?m)^    \+ `context`|^    \+ `goal`", run):
            report(str(entry.relative_to(ROOT)), "SKILL run must use zero explicit input/context arguments")
        if re.search(r"(?m)\bmodel\.ask\([^\n]*(prompt|messages|sources)=", source):
            report(str(entry.relative_to(ROOT)), "a model cannot receive arbitrary extra context")

# Imports are inspected structurally in source headers only, not by searching
# human narrative. Marqdo's official parser remains the language authority.
for folder in ("agent", "skills", "workflows", "ext/office", "ext/qdagent"):
    root = ROOT / folder
    if not root.is_dir():
        continue
    for doc in root.rglob("*.mq.md"):
        src = doc.read_text(encoding="utf-8")
        front = src.split("---", 2)
        if not src.startswith("---\n") or len(front) < 3:
            continue
        for imp in re.findall(r"(?m)^  [\w-]+:\s*([^\s]+\.mq\.md)\s*$", front[1]):
            if "root-skill" in imp or imp.startswith("pages/") or "/pages/" in imp or "marqdo-dev" in imp:
                report(str(doc.relative_to(ROOT)), f"legacy import: {imp}")
        if doc == ROOT / "agent/index.mq.md":
            for imp in re.findall(r"(?m)^  [\w-]+:\s*([^\s]+\.mq\.md)\s*$", front[1]):
                if imp.startswith("skills/") or imp.startswith("workflows/"):
                    report("agent/index.mq.md", "root must not import a specific skill or workflow")

if errors:
    print("Architecture violations:", file=sys.stderr)
    for error in errors:
        print(" - " + error, file=sys.stderr)
    sys.exit(1)
# This rule applies to internal framework documents as well as SKILL entrypoints.
for folder in ("agent", "skills", "workflows"):
    for doc in (ROOT / folder).rglob("*.mq.md"):
        body = doc.read_text(encoding="utf-8")
        if re.search(r"(?m)^    \+ `context`\s*$", body):
            report(str(doc.relative_to(ROOT)), "generic context arguments are forbidden")
        if re.search(r"(?m)model\.ask\([^\n]*(prompt|messages|sources)=", body):
            report(str(doc.relative_to(ROOT)), "extra model prompt sources are forbidden")
if errors:
    print("Architecture violations:", file=sys.stderr)
    for error in errors:
        print(" - " + error, file=sys.stderr)
    sys.exit(1)
print("V3 three-source architecture boundary checks passed (static only).")
