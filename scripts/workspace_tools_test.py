#!/usr/bin/env python3
"""Unit tests for workspace.list/search/read (no Marqdo)."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from workspace_tools import list_entries, read_file, search_workspace


class WorkspaceToolsTest(unittest.TestCase):
    def setUp(self) -> None:
        self._td = tempfile.TemporaryDirectory()
        self.root = Path(self._td.name)
        (self.root / "src").mkdir()
        (self.root / "src" / "hello.py").write_text("def greet():\n    return 'hi'\n", encoding="utf-8")
        (self.root / "README.md").write_text("# Hello\n\ngreet world\n", encoding="utf-8")
        (self.root / ".git").mkdir()
        (self.root / ".git" / "config").write_text("secret\n", encoding="utf-8")

    def tearDown(self) -> None:
        self._td.cleanup()

    def test_list_skips_git(self) -> None:
        out = list_entries(self.root, "", 0, 50)
        self.assertTrue(out["ok"])
        names = {i["name"] for i in out["result"]["items"]}
        self.assertIn("src", names)
        self.assertIn("README.md", names)
        self.assertNotIn(".git", names)

    def test_search_content_and_path(self) -> None:
        out = search_workspace(self.root, "greet", limit=20)
        self.assertTrue(out["ok"])
        paths = {h["path"] for h in out["result"]["hits"]}
        self.assertTrue(any("hello.py" in p for p in paths))
        self.assertTrue(any(h.get("line") for h in out["result"]["hits"]))

    def test_read_range_and_mismatch(self) -> None:
        ok = read_file(self.root, "README.md", line_start=1, line_end=1)
        self.assertTrue(ok["ok"])
        self.assertIn("# Hello", ok["result"]["text"])
        dig = ok["result"]["digest"]
        bad = read_file(self.root, "README.md", digest="sha256:dead")
        self.assertFalse(bad["ok"])
        self.assertEqual(bad["error"]["code"], "resource.revision_mismatch")
        good = read_file(self.root, "README.md", digest=dig, line_start=1, line_end=2)
        self.assertTrue(good["ok"])

    def test_path_escape(self) -> None:
        out = list_entries(self.root, "../etc", 0, 10)
        self.assertFalse(out["ok"])
        self.assertEqual(out["error"]["code"], "workspace.forbidden")


if __name__ == "__main__":
    unittest.main()
