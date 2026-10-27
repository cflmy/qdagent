#!/usr/bin/env python3
"""SSRF / scheme guards for web_fetch (no live network required)."""

from __future__ import annotations

import unittest

from web_fetch import fetch_url


class WebFetchGuardTest(unittest.TestCase):
    def test_reject_file_scheme(self) -> None:
        out = fetch_url("file:///etc/passwd")
        self.assertFalse(out["ok"])
        self.assertEqual(out["error"]["code"], "scheme_forbidden")

    def test_reject_localhost(self) -> None:
        out = fetch_url("http://localhost/admin")
        self.assertFalse(out["ok"])
        self.assertEqual(out["error"]["code"], "ssrf_blocked")

    def test_reject_loopback_ip(self) -> None:
        out = fetch_url("http://127.0.0.1/")
        self.assertFalse(out["ok"])
        self.assertEqual(out["error"]["code"], "ssrf_blocked")

    def test_reject_private_ip(self) -> None:
        out = fetch_url("http://192.168.1.1/")
        self.assertFalse(out["ok"])
        self.assertEqual(out["error"]["code"], "ssrf_blocked")

    def test_reject_empty(self) -> None:
        out = fetch_url("")
        self.assertFalse(out["ok"])
        self.assertEqual(out["error"]["code"], "invalid_url")


if __name__ == "__main__":
    unittest.main()
