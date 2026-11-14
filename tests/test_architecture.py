"""Migration boundaries; the actual Marqdo flow is covered by runtime tests."""
import ast
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ArchitectureTests(unittest.TestCase):
    def test_transport_cannot_define_roles_or_business_actions(self):
        for name in ('agent.py', 'provider.py'):
            tree = ast.parse((ROOT / 'worker' / name).read_text())
            strings = {n.value for n in ast.walk(tree) if isinstance(n, ast.Constant) and isinstance(n.value, str)}
            self.assertFalse(strings.intersection({'system', 'intent', 'outline', 'refine', 'implement', 'deliver', 'test', 'tools'}), name)
            self.assertFalse(any(isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) and n.name in {'dispatch', 'tool_schemas', 'system_prompt', 'build_prompt'} for n in ast.walk(tree)), name)
        self.assertFalse((ROOT / 'worker/root_skill.py').exists())

    def test_production_bridge_has_one_fixed_document_entry(self):
        source = (ROOT / 'worker/agent.py').read_text()
        self.assertIn("project/'ext/root-skill/index.mq.md'", source)
        self.assertIn("'run'", source)
        self.assertNotIn('tool_calls', source)
        for role in ('intent', 'outline', 'test', 'implement', 'implement-text', 'test-text', 'deliver'):
            self.assertTrue((ROOT / 'ext/root-skill/calls' / (role + '.mq.md')).exists())


if __name__ == '__main__':
    unittest.main()
