"""A naive full-context baseline for the fixed small-model comparison.

The design's claim is that a small model cannot carry all instructions and
tool documents at once. This script measures that claim honestly: it sends as
much of the tool catalog as the model's window accepts, asks for the final
Marqdo document for the fixed two-constant task, then validates the answer
with the official parser. It is a measurement harness, not product code.

Usage: python3 tests/full_context_baseline.py [--model NAME] [--chars N]
Prints one JSON object describing what was sent and what came back.
"""
import json
import os
import subprocess
import sys
import tempfile
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TASK = ("请为下面这个需求输出一份可直接保存为 index.mq.md 的完整 Marqdo 文稿："
        "只有两个独立函数，第一个函数无论输入都返回文本「材料甲」，第二个函数无论输入都返回文本「乙材料」。"
        "两个函数都不要参数，正文用 Return 返回固定字符串。只输出文稿源码，不要解释。")
CONSTANTS = ("材料甲", "乙材料")


def catalog_text():
    parts = []
    for rel in ("ext/root-skill/calls", "ext/root-skill/guides"):
        base = os.path.join(ROOT, rel)
        for name in sorted(os.listdir(base)):
            if name.endswith(".mq.md"):
                parts.append(open(os.path.join(base, name), encoding="utf-8").read())
    return "\n\n".join(parts)


def chat(model, system, user, timeout=3600):
    payload = json.dumps({"model": model, "stream": False, "options": {"num_ctx": 32768},
                          "messages": [{"role": "system", "content": system},
                                       {"role": "user", "content": user}]}).encode()
    req = urllib.request.Request("http://127.0.0.1:11434/api/chat", data=payload,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.load(response)


def main():
    model = "qwen2.5-coder-7b"
    chars = 90000
    args = sys.argv[1:]
    for index, arg in enumerate(args):
        if arg == "--model":
            model = args[index + 1]
        if arg == "--chars":
            chars = int(args[index + 1])
    full = catalog_text()
    sent = full[:chars]
    result = {"model": model, "catalog_chars": len(full), "sent_chars": len(sent),
              "truncated": len(sent) < len(full)}
    try:
        reply = chat(model, sent, TASK)
    except Exception as error:  # network/model failure is a real result
        result["error"] = str(error)[:200]
        print(json.dumps(result, ensure_ascii=False))
        return
    text = reply.get("message", {}).get("content", "")
    result["prompt_tokens"] = reply.get("prompt_eval_count")
    result["reply_chars"] = len(text)
    with tempfile.NamedTemporaryFile("w", suffix=".mq.md", delete=False, dir=".agent") as file:
        file.write(text)
        path = file.name
    check = subprocess.run(["marqdo", "check", path, "--json"], capture_output=True, text=True)
    result["parser_exit"] = check.returncode
    result["parser_errors"] = check.stdout.strip()[:300] or check.stderr.strip()[:300]
    result["constants_present"] = [value for value in CONSTANTS if value in text]
    print(json.dumps(result, ensure_ascii=False))
    os.unlink(path)


if __name__ == "__main__":
    main()
