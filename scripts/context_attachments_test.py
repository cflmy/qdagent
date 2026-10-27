#!/usr/bin/env python3
"""Unit checks for ContextAttachment verify (no silent refresh)."""

from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from context_attachments import verify_attachments
from resource_index import b64url, file_ref


class VerifyAttachmentsTest(unittest.TestCase):
    def test_ok_and_stale(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            data = root / "data"
            data.mkdir()
            f = root / "sample.csv"
            f.write_text("a,b\n1,2\n", encoding="utf-8")
            ref = file_ref("ws1", root, "sample.csv")
            rid = ref["resource_id"]
            dig = ref["digest"]

            ok = verify_attachments(
                root,
                data,
                "ws1",
                [{"resource_id": rid, "revision": dig, "title": "sample.csv"}],
            )
            self.assertEqual(ok["stale"], 0)
            self.assertEqual(ok["missing"], 0)
            self.assertEqual(ok["attachments"][0]["verify"]["status"], "ok")

            f.write_text("a,b\n9,9\n", encoding="utf-8")
            stale = verify_attachments(
                root,
                data,
                "ws1",
                [{"resource_id": rid, "revision": dig, "title": "sample.csv"}],
            )
            self.assertEqual(stale["stale"], 1)
            self.assertEqual(stale["attachments"][0]["verify"]["status"], "stale")
            # Pinned digest must remain the caller's value — never swapped.
            self.assertEqual(stale["attachments"][0]["revision"], dig)
            self.assertNotEqual(
                stale["attachments"][0]["verify"]["live_digest"],
                dig,
            )

    def test_missing(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            rid = "rf." + b64url(b"gone.csv")
            out = verify_attachments(
                root,
                root / "data",
                "ws1",
                [{"resource_id": rid, "revision": "sha256:dead", "title": "gone"}],
            )
            self.assertEqual(out["missing"], 1)
            self.assertEqual(out["attachments"][0]["verify"]["status"], "missing")


if __name__ == "__main__":
    unittest.main()
