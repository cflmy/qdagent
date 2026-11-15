"""Ordinary Marqdo observation functions and native role restrictions."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

PROJECT = Path(__file__).resolve().parents[1]


class ServicePluginTests(unittest.TestCase):
    def test_observations_remain_scoped_and_never_become_browser_sources(self):
        with tempfile.TemporaryDirectory() as root:
            context = {"role": "implement", "unit_id": "report"}
            def call(file, member, **kwargs):
                command = ["marqdo", "call", str(PROJECT / file), member, "--args-json", "-", "--json", "--fs-root", root, "--effects", "plugin,fs.read,fs.write,process.exec,environment.read"]
                result = subprocess.run(command, input=json.dumps(kwargs), capture_output=True, text=True, env={**os.environ, "MARQDO_LIB": str(PROJECT / "lib"), "MARQDO_EXT": str(PROJECT / "ext")}, timeout=20)
                value = json.loads(result.stdout)
                self.assertTrue(value["ok"], value)
                return value["result"]
            module = "ext/root-skill/runtime/observations.mq.md"
            for index in range(10):
                call(module, "save", context=context, record={"identity": str(index), "query": "SEARCH-DISCOVERY-" + str(index), "read": False, "results": []})
            text = call(module, "reference", context=context)
            self.assertIn("SEARCH-DISCOVERY-9", text)
            self.assertNotIn("SEARCH-DISCOVERY-0", text)
            self.assertNotIn("SEARCH-DISCOVERY", call(module, "reference", context={**context, "unit_id": "other"}))
            self.assertEqual(call(module, "reference", context={**context, "role": "test"}), "")
            self.assertFalse((Path(root) / ".agent/root.json").exists())
            self.assertFalse((Path(root) / "evidence/browser").exists())

    def test_native_network_operations_reject_test_role_before_transport(self):
        with tempfile.TemporaryDirectory() as root:
            context = {"root": root, "workspace": root, "project": str(PROJECT), "owner": "fixture", "run_id": "fixture", "role": "test"}
            request = Path(root) / "request.json"
            request.write_text(json.dumps({"context": context}))
            for operation in ("runtime_search", "runtime_ocr_submit", "runtime_ocr_poll"):
                result = subprocess.run(["marqdo", "call", str(PROJECT / "ext/root-skill/runtime/io.mq.md"), "native", "--args-json", "-", "--json", "--fs-root", root, "--effects", "plugin,fs.read,fs.write,environment.read"], input=json.dumps({"context": context, "operation": operation}), capture_output=True, text=True, env={**os.environ, "MARQDO_LIB": str(PROJECT / "lib"), "MARQDO_EXT": str(PROJECT / "ext"), "QDAGENT_RUN_REQUEST_FILE": str(request)}, timeout=20)
                value = json.loads(result.stdout)["result"]
                self.assertFalse(value["ok"], value)
                self.assertIn("role", json.dumps(value))

    def test_ocr_cannot_upload_other_workspace_paths_or_symlink_targets(self):
        with tempfile.TemporaryDirectory() as root, tempfile.TemporaryDirectory() as outside:
            workspace = Path(root)
            (workspace / "uploads").mkdir()
            (workspace / "private.txt").write_text("not an upload")
            target = Path(outside) / "outside.pdf"
            target.write_text("not task material")
            (workspace / "uploads/escape.pdf").symlink_to(target)
            context = {"root": root, "workspace": root, "project": str(PROJECT), "owner": "fixture", "run_id": "fixture", "role": "implement"}
            request = workspace / "request.json"
            request.write_text(json.dumps({"context": context}))
            for path in ("private.txt", "uploads/../private.txt", "uploads/escape.pdf"):
                result = subprocess.run(["marqdo", "call", str(PROJECT / "ext/root-skill/runtime/io.mq.md"), "native", "--args-json", "-", "--json", "--fs-root", root, "--effects", "plugin,fs.read,fs.write,environment.read"], input=json.dumps({"context": context, "operation": "runtime_ocr_submit", "payload": {"path": path}}), capture_output=True, text=True, env={**os.environ, "MARQDO_LIB": str(PROJECT / "lib"), "MARQDO_EXT": str(PROJECT / "ext"), "QDAGENT_RUN_REQUEST_FILE": str(request)}, timeout=20)
                value = json.loads(result.stdout)["result"]
                self.assertFalse(value["ok"], value)
                self.assertNotIn("service transport failed", json.dumps(value))


if __name__ == "__main__":
    unittest.main()
