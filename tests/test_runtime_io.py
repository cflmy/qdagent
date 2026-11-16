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

    def test_entire_program_is_checked_before_the_first_file_write(self):
        installation=self.root/'installation'
        api=installation/'ext/root-skill/calls/checked.mq.md';api.parent.mkdir(parents=True)
        api.write_text('---\nmarkup: occlusion\nimport:\n  fs: '+str(PROJECT/'lib/fs.mq.md')+'\n---\n\n## write\n\n| 参数 | 类型 | 说明 |\n|---|---|---|\n| value | text | 实际正文 |\n\nUse `value`。\nReturn *fs.write_text(path="effect.txt",text=`value`)*.\n\n## accept\n\n| 参数 | 类型 | 说明 |\n|---|---|---|\n| value | text | 实际返回 |\n\nUse `value`。\nReturn *`value`*.\n')
        context={**self.context,'project':str(installation)}
        self.request.write_text(json.dumps({'context':context,'model':{}}))
        source='---\nmarkup: occlusion\nimport:\n  api: '+str(api)+'\n---\n\n## act\n\nWe **first = api.write(value="must not run")**.\nReturn *api.accept(value=12)*.\n'
        denied=self.invoke('runtime_execute',context=context,source=source,api=str(api),step=1)
        self.assertFalse(denied['ok']);self.assertIn('contract.arg_mismatch',denied['error']['message'])
        self.assertEqual(list(self.root.rglob('effect.txt')),[])
        succeeded=self.invoke('runtime_execute',context=context,source=source.replace('value=12','value="real return"'),api=str(api),step=2)
        self.assertTrue(succeeded['ok'],succeeded);self.assertEqual(succeeded['value'],'real return')
        self.assertEqual(next(self.root.rglob('effect.txt')).read_text(),'must not run')

    def test_recovery_cache_is_bounded_and_cannot_escape_the_private_workspace(self):
        path='.agent/recovery/'+'a'*64+'.json'
        self.assertEqual(self.invoke('runtime_recovery_read',path=path)['value'],[])
        self.assertTrue(self.invoke('runtime_recovery_write',path=path,records=[{'cause':'actual failure'}])['ok'])
        self.assertEqual(self.invoke('runtime_recovery_read',path=path)['value'][0]['cause'],'actual failure')
        self.assertEqual((self.root/path).stat().st_mode & 0o777,0o600)
        self.assertFalse(self.invoke('runtime_recovery_write',path=path,records=[{}]*7)['ok'])
        self.assertFalse(self.invoke('runtime_recovery_read',path='../escape.json')['ok'])
        target=self.root/'private-other.json';target.write_text('[]')
        (self.root/path).unlink();(self.root/path).symlink_to(target)
        self.assertFalse(self.invoke('runtime_recovery_read',path=path)['ok'])
        self.assertFalse(self.invoke('runtime_recovery_write',path=path,records=[])['ok'])
        self.assertFalse(self.invoke('runtime_recovery_read',context={**self.context,'owner':'someone-else'},path=path)['ok'])

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
