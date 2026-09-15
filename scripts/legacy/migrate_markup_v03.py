#!/usr/bin/env python3
"""Migrate qdagent .mq.md from Marqdo markup v0.2 → v0.3 (1.0 language surface).

v0.2: *code* / **return**
v0.3: **code** / *return*   (+ prefer [key](coll) over coll[^key])

Skips data/ runtime notes. Idempotent on already-migrated bold/italic whole lines
is NOT guaranteed — run once.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SKIP_PARTS = {"data", ".git", "node_modules", "target", "_archive", "docker"}

# Whole-line bold (old return) or italic (old code). Allow leading indent.
BOLD_LINE = re.compile(r"^(\s*)\*\*(.+)\*\*\s*$")
ITALIC_LINE = re.compile(r"^(\s*)\*(.+)\*\s*$")
# Catch-all branch marker "2. *" must stay
BRANCH_STAR = re.compile(r"^(\s*)\d+\.\s*\*\s*$")
# Empty return ****
EMPTY_RET = re.compile(r"^(\s*)\*\*\*\*\s*$")

# Footnote get: name[^key] or `name`[^key]
FOOTNOTE = re.compile(
    r"(?P<coll>`?[A-Za-z_\u4e00-\u9fff][A-Za-z0-9_\u4e00-\u9fff]*`?)"
    r"\[\^(?P<key>[^\]]+)\]"
)


def should_skip(path: Path) -> bool:
    return any(p in SKIP_PARTS for p in path.parts)


def migrate_footnotes(s: str) -> str:
    def repl(m: re.Match[str]) -> str:
        coll = m.group("coll")
        key = m.group("key").strip()
        # numeric keys stay bare; others keep as-is (already unquoted ids / strings)
        return f"[{key}]({coll})"

    return FOOTNOTE.sub(repl, s)


def migrate_line(line: str) -> str:
    # Preserve newline
    nl = "\n" if line.endswith("\n") else ""
    body = line[:-1] if nl else line

    if BRANCH_STAR.match(body) or EMPTY_RET.match(body):
        return migrate_footnotes(body) + nl

    m = BOLD_LINE.match(body)
    if m:
        # old return → italic
        ind, content = m.group(1), m.group(2)
        # Avoid turning already-migrated empty **** handled above
        new = f"{ind}*{content}*"
        return migrate_footnotes(new) + nl

    m = ITALIC_LINE.match(body)
    if m:
        ind, content = m.group(1), m.group(2)
        # Skip lone "*" catch-alls already handled; skip if content looks like
        # markdown italic emphasis mid-prose that isn't a whole-line statement —
        # we only match whole lines here.
        new = f"{ind}**{content}**"
        return migrate_footnotes(new) + nl

    return migrate_footnotes(body) + nl


def migrate_text(text: str) -> str:
    lines = text.splitlines(keepends=True)
    # Convert bold(return) first to a placeholder, then italic(code) to bold,
    # then placeholder to italic — avoids double-matching.
    ph_l, ph_r = "\u0000REL\u0000", "\u0000RER\u0000"

    out1: list[str] = []
    for line in lines:
        nl = "\n" if line.endswith("\n") else ""
        body = line[:-1] if nl else line
        if BRANCH_STAR.match(body) or EMPTY_RET.match(body):
            out1.append(body + nl)
            continue
        m = BOLD_LINE.match(body)
        if m:
            out1.append(f"{m.group(1)}{ph_l}{m.group(2)}{ph_r}{nl}")
            continue
        out1.append(line)

    out2: list[str] = []
    for line in out1:
        nl = "\n" if line.endswith("\n") else ""
        body = line[:-1] if nl else line
        if ph_l in body and ph_r in body:
            m = re.match(
                rf"^(\s*){re.escape(ph_l)}(.*){re.escape(ph_r)}$", body, re.S
            )
            if m:
                out2.append(f"{m.group(1)}*{m.group(2)}*{nl}")
                continue
        if BRANCH_STAR.match(body) or EMPTY_RET.match(body):
            out2.append(body + nl)
            continue
        m = ITALIC_LINE.match(body)
        if m:
            out2.append(f"{m.group(1)}**{m.group(2)}**{nl}")
            continue
        out2.append(line)

    # Footnotes on the whole file after marker swap
    return migrate_footnotes("".join(out2))


def main() -> int:
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT
    changed = 0
    for path in sorted(root.rglob("*.mq.md")):
        if should_skip(path):
            continue
        text = path.read_text(encoding="utf-8")
        new = migrate_text(text)
        if new != text:
            path.write_text(new, encoding="utf-8")
            print(path.relative_to(root))
            changed += 1
    print(f"migrated {changed} files under {root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
