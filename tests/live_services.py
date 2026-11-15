"""Live service acceptance inside an isolated disposable image workspace."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time


def unwrap(value):
    while isinstance(value, dict) and "ok" in value:
        if not value["ok"]:
            raise AssertionError(value.get("error", {"message": "service call failed"}))
        value = value.get("value", value.get("result"))
    return value


with tempfile.TemporaryDirectory(prefix="qd-services-") as directory:
    root = Path(directory)
    work = root / "work"
    (work / "uploads").mkdir(parents=True)
    context = {"root": str(root / "runtime"), "workspace": str(work), "project": "/app", "owner": "service-verification",
               "run_id": "service-verification", "role": "implement", "unit_id": "research", "variant": "document"}
    Path(context["root"]).mkdir()
    request = root / "request.json"
    request.write_text(json.dumps({"context": context}))
    os.environ["QDAGENT_RUN_REQUEST_FILE"] = str(request)
    api = "/app/ext/root-skill/calls/implement-browse.mq.md"

    def call(file, member, **arguments):
        process = subprocess.run(["marqdo", "call", file, member, "--args-json", "-", "--json", "--fs-root", str(work),
                                  "--effects", "plugin,fs.read,fs.write,process.exec,environment.read"],
                                 input=json.dumps(arguments), capture_output=True, text=True, cwd=work, timeout=100)
        envelope = json.loads(process.stdout)
        assert envelope["ok"], envelope.get("error")
        return envelope["result"]

    step = 0

    def execute(expression):
        global step
        step += 1
        source = 'Return *[执行公开能力](' + expression + ')*.\n'
        return unwrap(call("/app/ext/root-skill/runtime/io.mq.md", "execute", context=context, api=api, body=source, step=step))

    search = execute('api.search(query="PaddleOCR 官方文档")')
    assert search["results"] and search["read"] is False
    assert not (work / "evidence/browser").exists(), "search snippets became browsed evidence"

    # A deterministic PDF fixture, containing no user material.
    stream = b"BT /F1 22 Tf 50 720 Td (QIUD AO OCR TEST 2026) Tj 0 -40 Td (Document reading fixture 123456) Tj ET"
    objects = [b"<< /Type /Catalog /Pages 2 0 R >>", b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
               b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
               b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream"]
    data = b"%PDF-1.4\n"
    offsets = [0]
    for index, obj in enumerate(objects, 1):
        offsets.append(len(data))
        data += str(index).encode() + b" 0 obj\n" + obj + b"\nendobj\n"
    start = len(data)
    data += b"xref\n0 6\n0000000000 65535 f \n" + b"".join(f"{o:010d} 00000 n \n".encode() for o in offsets[1:]) + b"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + str(start).encode() + b"\n%%EOF"
    (work / "uploads/fixture.pdf").write_bytes(data)
    job = execute('api.ocr(path="uploads/fixture.pdf")')
    identity = job["job_id"]
    for _ in range(20):
        if job["state"] == "done":
            break
        time.sleep(1)
        job = execute('api.ocr(path="uploads/fixture.pdf")')
        assert job["job_id"] == identity, "polling resubmitted a job"
    assert job["state"] == "done", "OCR remained pending"
    assert "123456" in (work / job["path"]).read_text()
    again = execute('api.ocr(path="uploads/fixture.pdf")')
    assert again["job_id"] == identity and again["state"] == "done"
    reference = call("/app/ext/root-skill/runtime/observations.mq.md", "reference", context=context)
    assert "123456" in reference and "尚未阅读" in reference
    hidden = call("/app/ext/root-skill/runtime/observations.mq.md", "reference", context={**context, "role": "test"})
    assert hidden == ""
    print(json.dumps({"search_results": len(search["results"]), "ocr_state": job["state"], "ocr_pages": job["pages"],
                      "actual_marqdo_calls": step, "persistent_job": True, "test_context_isolated": True}))
