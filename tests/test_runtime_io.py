"""Real ABI checks for selected knowledge, compiler reuse and context bounds."""
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest

PROJECT = Path(__file__).resolve().parents[1]


class RuntimeIOTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='qd-runtime-io-')
        self.root = Path(self.temp.name)
        self.context = {'project': str(PROJECT), 'workspace': str(self.root), 'root': str(self.root), 'owner': 'io-test', 'id': 'io-test', 'run_id': 'io-test', 'role': 'outline'}
        self.request = self.root / 'request.json'
        self.request.write_text(json.dumps({'context': self.context, 'model': {'model': 'unused'}}))

    def tearDown(self):
        self.temp.cleanup()

    def invoke(self, operation, context=None, **payload):
        env = {**os.environ, 'MARQDO_EXT': str(PROJECT/'ext'), 'MARQDO_LIB': str(PROJECT/'lib'), 'QDAGENT_RUN_REQUEST_FILE': str(self.request)}
        args = {'context': context or self.context, 'operation': operation, 'payload': payload}
        command = ['marqdo', 'call', str(PROJECT/'ext/root-skill/runtime/io.mq.md'), 'native', '--args-json', '-', '--effects', 'plugin,environment.read', '--fs-root', str(self.root), '--json']
        proc = subprocess.run(command, input=json.dumps(args), capture_output=True, text=True, env=env, timeout=90)
        outer = json.loads(proc.stdout)
        self.assertTrue(outer.get('ok'), outer)
        return outer['result']

    def test_reference_is_role_bounded_and_cannot_follow_escaping_symlink(self):
        installation = self.root/'installation'
        (installation/'kb').mkdir(parents=True)
        (installation/'kb/guide.md').write_text('公开业务参考，仅作资料。')
        (self.root/'private.md').write_text('private implementation')
        (installation/'kb/escape.md').symlink_to(self.root/'private.md')
        own = {**self.context, 'project': str(installation)}
        read = self.invoke('runtime_reference', context=own, path='guide.md')
        self.assertTrue(read['ok']); self.assertEqual(read['value']['source'], '公开业务参考，仅作资料。')
        self.assertFalse(self.invoke('runtime_reference', context=own, path='escape.md')['ok'])
        self.assertFalse(self.invoke('runtime_reference', context={**own, 'role':'test'}, path='guide.md')['ok'])

    def test_official_compiler_preflight_and_document_context_budget(self):
        found = self.invoke('runtime_reuse', query='读取文件 fs read_text')
        self.assertTrue(found['ok'], found)
        self.assertIn('decision', found['value'])
        rejected = self.invoke('runtime_model', model_id='inherit', messages=[{'role':'user','content':'x'*100}], max_context_bytes=32)
        self.assertFalse(rejected['ok']); self.assertIn('budget', rejected['error']['message'])


if __name__ == '__main__':
    unittest.main()
