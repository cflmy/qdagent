"""Wire contracts and credential/result boundaries; real probes are separate."""
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import services


class ServiceWireTests(unittest.TestCase):
    def test_search_is_discovery_and_filters_unsafe_links(self):
        response = {"results": [{"url": "https://example.org/a", "title": "Source", "content": "<b>Excerpt</b>"},
                                {"url": "javascript:alert(1)"}, {"url": "https://user:secret@example.org/"}],
                    "unresponsive_engines": [["engine", "timeout"]]}
        with patch.object(services, "exchange", return_value=json.dumps(response).encode()) as wire:
            result = services.perform({"operation": "search", "query": "PaddleOCR"})
        self.assertEqual(len(result["results"]), 1)
        self.assertEqual(result["results"][0]["excerpt"], "Excerpt")
        self.assertFalse(result["read"])
        self.assertIn("http://search:8080/search?", wire.call_args.args[0])
        self.assertEqual(result["unresponsive_engines"], [["engine", "timeout"]])

    def test_multipart_and_persistent_provider_identity(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'odd"name.pdf'
            path.write_bytes(b"%PDF-1.4 test bytes")
            with patch.object(services, "api", return_value={"jobId": "job-123"}) as api:
                result = services.perform({"operation": "ocr_submit", "file": str(path)})
            body = api.call_args.kwargs["body"]
            self.assertIn(b'filename="material.pdf"', body)
            self.assertNotIn(b'odd"name', body)
            self.assertIn(path.read_bytes(), body)
            self.assertEqual(result["job_id"], "job-123")

    def test_official_jsonl_layout_and_empty_result_failure(self):
        actual = {"errorCode": 0, "result": {"layoutParsingResults": [{"markdown": {"text": "Fixture 123456"}, "prunedResult": {}}]}}
        with patch.object(services, "api", return_value={"state": "done", "resultUrl": {"jsonUrl": "https://fixture.bcebos.com/result"}}), patch.object(services, "result_bytes", return_value=json.dumps(actual).encode()):
            result = services.perform({"operation": "ocr_poll", "job_id": "job-123"})
        self.assertEqual(result["text"], "Fixture 123456")
        self.assertEqual(result["pages"], 1)
        self.assertNotIn("jsonUrl", {key: value for key, value in result.items() if key != "raw"})
        with patch.object(services, "api", return_value={"state": "done", "resultUrl": {"jsonUrl": "https://fixture.bcebos.com/result"}}), patch.object(services, "result_bytes", return_value=b'{"result":{}}'):
            with self.assertRaisesRegex(ValueError, "Unsupported"):
                services.perform({"operation": "ocr_poll", "job_id": "job-123"})

    def test_result_download_never_accepts_private_or_arbitrary_hosts(self):
        for url in ("http://data.bcebos.com/file", "https://evil.example/file", "https://a.bcebos.com.evil.example/file", "https://x:y@data.bcebos.com/file"):
            with self.assertRaises(ValueError):
                services.result_bytes(url)
        with patch.object(services.socket, "getaddrinfo", return_value=[(2, 1, 6, "", ("127.0.0.1", 443))]):
            with self.assertRaisesRegex(ValueError, "non-public"):
                services.result_bytes("https://data.bcebos.com/file")

    def test_authorization_only_goes_to_fixed_official_endpoint(self):
        with tempfile.TemporaryDirectory() as directory:
            token = Path(directory) / "api-token"
            token.write_text("fixture-not-a-real-token-123456")
            with patch.dict(os.environ, {"QDAGENT_OCR_TOKEN_FILE": str(token)}), patch.object(services, "exchange", return_value=b'{"code":0,"data":{"state":"pending"}}') as wire:
                services.api("/job-123")
            self.assertEqual(wire.call_args.args[0], services.JOB_URL + "/job-123")
            self.assertEqual(wire.call_args.args[3]["Authorization"], "Bearer fixture-not-a-real-token-123456")


if __name__ == "__main__":
    unittest.main()
