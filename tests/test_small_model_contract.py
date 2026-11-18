"""Narrow static gate. Passing does not mean the model/runtime is proven."""
import ast
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class SmallModelContract(unittest.TestCase):
    def test_constitution_is_linked(self):
        agents = (ROOT / "AGENTS.md").read_text(encoding="utf-8")
        readme = (ROOT / "README.md").read_text(encoding="utf-8")
        for source in (agents, readme):
            self.assertIn("docs/small-model-native-agent.mq.md", source)
        self.assertTrue((ROOT / "docs/design/small-model-native-agent-rollout.md").is_file())

    def test_root_has_three_short_decisions(self):
        src = (ROOT / "ext/root-skill/index.mq.md").read_text(encoding="utf-8")
        self.assertLessEqual(len(src.encode("utf-8")), 3200)
        names = re.findall(r"^## ([^\r\n]+)$", src, flags=re.MULTILINE)
        self.assertEqual(names, ["分解意图", "路由函数", "拆分并行"])
        self.assertIn("markup: occlusion", src)

    def test_transport_stays_transport(self):
        self.assertFalse((ROOT / "worker/agent.py").exists())
        self.assertFalse((ROOT / "worker/root_skill.py").exists())
        src = (ROOT / "worker/provider.py").read_text(encoding="utf-8")
        tree = ast.parse(src)
        names = {node.name for node in ast.walk(tree)
                 if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))}
        self.assertFalse({"agent_loop", "build_system_prompt", "route_skill",
                          "run_agent", "dispatch_tools"} & names)
        imports = {alias.name.split(".")[0] for node in ast.walk(tree)
                   if isinstance(node, (ast.Import, ast.ImportFrom))
                   for alias in (node.names if isinstance(node, ast.Import)
                                 else [ast.alias(name=node.module or "")])}
        self.assertFalse({"langchain", "langgraph", "crewai", "autogen"} & imports)
        host = (ROOT / "server/internal/app/native_entry.go").read_text(encoding="utf-8")
        self.assertIn("ext/root-skill/index.mq.md", host)
        self.assertIn('"call"', host)

    def test_memory_template_is_one_non_executing_document(self):
        path = ROOT / "tests/fixtures/small-model/memory.mq.md"
        src = path.read_text(encoding="utf-8")
        self.assertTrue(src.startswith("---\nmarkup: occlusion\n"))
        self.assertLessEqual(len(src.encode("utf-8")), 4096)
        for heading in ("目标", "已确认约束", "决策", "任务与依赖",
                        "证据", "待解决问题", "下一步"):
            self.assertIn("**" + heading + "**", src)
        self.assertNotRegex(src, r"(?m)^## ")
        self.assertNotIn("tool_calls", src)
        self.assertNotIn("api_key", src)


if __name__ == "__main__":
    unittest.main()
