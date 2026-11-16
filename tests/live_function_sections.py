"""Real model/browser acceptance. All test intent is in the MQ fixture."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import uuid


def inside():
    model = json.load(sys.stdin)
    with tempfile.TemporaryDirectory(prefix="qd-sections-") as directory:
        root = Path(directory)
        (root / "work").mkdir()
        (root / "runtime").mkdir()
        context = {"project": "/app", "root": str(root / "runtime"), "workspace": str(root / "work"), "owner": "section-verification", "id": "section-verification"}

        def call(file, member, arguments, own=None):
            arguments = {**arguments, "context": own or context} if file != "/tmp/scenario.mq.md" else arguments
            result = subprocess.run(["marqdo", "call", file, member, "--args-json", "-", "--json", "--fs-root", context["workspace"], "--effects", "plugin,fs.read,fs.write,process.exec,environment.read,time.read,random.read"], input=json.dumps(arguments), capture_output=True, text=True, timeout=620)
            outer = json.loads(result.stdout)
            assert outer["ok"], outer.get("error")
            return outer["result"]

        def root_call(member, **arguments):
            result = call("/app/ext/root-skill/index.mq.md", member, arguments)
            assert result["ok"], result.get("error")
            return result["value"]

        fixture = "/tmp/scenario.mq.md"
        goal = call(fixture, "goal", {})
        units = call(fixture, "units", {})
        root_call("begin", user_input=goal, message_id=uuid.uuid4().hex)
        state = root_call("clarify_intent", summary=goal, question="是否按此公开测试范围继续？", choices=["开发验收", "重新说明"])
        root_call("respond", revision=state["revision"], action="confirm_intent", choice="开发验收")
        state = root_call("outline", title="主方案函数段并行验收", goal=goal, acceptance=goal, units=units)
        root_call("respond", revision=state["revision"], action="confirm_outline")
        context.update(run_id=uuid.uuid4().hex, model_selection="builtin-smart")
        run = Path(context["root"]) / "data/dialogue/proj/runtime" / context["run_id"]
        run.mkdir(parents=True, mode=0o700)
        private = run / "request.json"
        private.write_text(json.dumps({"context": context, "model": model, "child_models": {}}))
        private.chmod(0o600)
        actor = run / "actor.json"
        actor.write_text(json.dumps(context))
        actor.chmod(0o600)
        os.environ.update(QDAGENT_RUN_REQUEST_FILE=str(private), QDAGENT_ACTOR_FILE=str(actor))
        unavailable = "https://zh.wikipedia.org/wiki/恒星演化"
        author = {**context, "unit_id": "purpose", "role": "implement", "variant": "research"}
        failed = 0
        for _ in range(2):
            result = call("/app/ext/browser/host.mq.md", "capture", {"url": unavailable}, author)
            failed += not result["ok"]
        assert failed == 2, "previously rejected DNS scenario changed; inspect the fixture before claiming a recovery"
        result = call("/app/ext/root-skill/index.mq.md", "run", {})
        state = root_call("status")
        summary = {"phase": state["phase"], "status": result.get("status"), "previous_failures": failed,
                   "units": [{"id": unit["id"], "path": unit.get("path"), "function": unit.get("function"), "status": unit["status"], "engine": unit.get("trial", {}).get("engine")} for unit in state["units"]]}
        assert state["phase"] == "review", summary
        assert all(unit["status"] == "ready" and unit["path"] == "solution/index.mq.md" and unit["function"] == "unit_" + unit["id"] for unit in state["units"]), summary
        events = [json.loads(line) for line in (run / "events.ndjson").read_text().splitlines()]
        summary["successful_pages"] = sum(e["kind"] == "browser_end" and e["data"].get("status") == "succeeded" for e in events)
        assert summary["successful_pages"] >= 2, summary
        for unit in state["units"]:
            source = call("/app/ext/root-skill/runtime/workbook.mq.md", "read", {}, {**context, "unit_id": unit["id"]})["value"]["source"]
            assert all("## unit_" + other["id"] not in source for other in state["units"] if other["id"] != unit["id"])
        print(json.dumps(summary, ensure_ascii=False))


def host():
    # Resolve a real provider profile; the encryption master key is never used as an API credential.
    resolver = ["docker", "exec", "-i", "qdagent-qdagent-1", "marqdo", "call", "/app/pages/control/models.mq.md", "resolve", "--args-json", "-", "--fs-root", "/app", "--effects", "plugin,fs.read,fs.write,environment.read", "--json"]
    reply = json.loads(subprocess.check_output(resolver, input=json.dumps({"selection": "builtin-smart", "principal": "agent-development"}), text=True))
    assert reply["ok"] and reply["result"]["ok"]
    configuration = reply["result"]["value"]
    root = Path(__file__).resolve().parents[1]
    command = ["docker", "run", "--rm", "-i", "--network", "qdagent_default", "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges:true", "--user", "10001:10001", "--group-add", "10003", "--pids-limit", "256", "--memory", "1g",
               "--tmpfs", "/tmp:uid=10001,gid=10001,mode=1777,size=128m", "--tmpfs", "/app/data:uid=10001,gid=10001,mode=0700,size=16m", "--tmpfs", "/app/pages/data:uid=10001,gid=10001,mode=0700,size=16m",
               "-v", str(root / ".marqdo/secrets/browser_token") + ":/run/browser_token:ro", "-e", "QDAGENT_BROWSER_KEY_FILE=/run/browser_token", "-e", "QDAGENT_BROWSER_URL=http://browser-sandbox:7318",
               "-v", str(Path(__file__).resolve()) + ":/tmp/live.py:ro", "-v", str(root / "tests/fixtures/function-sections.mq.md") + ":/tmp/scenario.mq.md:ro", "--entrypoint", "python3", "qdagent:local", "/tmp/live.py", "--inside"]
    result = subprocess.run(command, input=json.dumps(configuration), capture_output=True, text=True, timeout=680)
    if result.returncode:
        print(result.stderr[-3000:])
        raise SystemExit(result.returncode)
    print(result.stdout)


if __name__ == "__main__":
    inside() if "--inside" in sys.argv else host()
