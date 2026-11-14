"""Actual Marqdo functions, official CoW, native cells and browser evidence."""
import json
import os
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch
import test_root_skill as protocol

class NativeWorkbookTests(unittest.TestCase):
 def setUp(self):
  self.fixture=protocol.RootTests();self.fixture.setUp();self.project=protocol.PROJECT
  self.context={**self.fixture.context,'run_id':'native-workbook','model_selection':'unused'}
  directory=Path(self.context['root'])/'data/dialogue/proj/runtime/native-workbook';directory.mkdir(parents=True,mode=0o700)
  request=directory/'request.json';request.write_text(json.dumps({'context':self.context}));request.chmod(0o600)
  actor=directory/'actor.json';actor.write_text(json.dumps(self.context));actor.chmod(0o600)
  self.environment=patch.dict(os.environ,{'QDAGENT_RUN_REQUEST_FILE':str(request),'QDAGENT_ACTOR_FILE':str(actor)});self.environment.start()
 def tearDown(self):self.environment.stop();self.fixture.tearDown()
 def invoke(self,module,member,context=None,**args):
  proc=subprocess.run(['marqdo','call',str(self.project/module),member,'--args-json','-','--json','--fs-root',self.context['workspace'],'--effects','plugin,fs.read,fs.write,process.exec,environment.read'],input=json.dumps({'context':context or self.context,**args}),text=True,capture_output=True,timeout=90,env={**os.environ,'MARQDO_LIB':str(self.project/'lib'),'MARQDO_EXT':str(self.project/'ext')},cwd=self.context['workspace'])
  result=json.loads(proc.stdout);self.assertTrue(result['ok'],result);return result['result']
 def plan(self,units):
  self.fixture.intent();state=self.fixture.call('outline',title='原生文稿与浏览证据',goal='真实研究并交付可核对文稿',acceptance='真实观察、可调用函数与可核对引用',units=units)
  self.fixture.call('respond',revision=state['revision'],action='confirm_outline')
 def docunit(self,name,dependencies=None,mode='document'):
  return {'id':name,'title':name,'mode':mode,'purpose':'撰写实际材料说明，至少60字，引用一个实际观察的网页，不虚构事实。','depends_on':dependencies or []}
 def freeze(self,name,sources=1):
  own={**self.context,'unit_id':name};self.fixture.call('proof.prepare',context=own)
  return self.fixture.call('proof.submit',context={**own,'role':'test'},cases={'minimum_chars':60,'minimum_sources':sources},rationale='公开规格要求完整正文和实际浏览的来源；结构通过不能代替用户事实审阅。')
 def test_native_markdown_cell_preserves_nested_fences_and_quotes(self):
  self.plan([self.docunit('article')]);frozen=self.freeze('article',sources=0)
  content='# 原生正文\n\n这里有 "双引号"、\'单引号\'、`变量` 和 **Markdown**，所有材料保持原样。\n\n```mq\n这里是文章内的代码示例，不作为调用现场执行。\nReturn *"示例"*.\n```\n\n内容用于真实文稿协议验收，不声称已经访问外部科学资料。'
  narrative=protocol.NARRATIVE*4
  source='---\nmarkup: occlusion\nimport:\n  api: '+str(self.project/'ext/root-skill/calls/implement-document.mq.md')+'\n---\n\n## act\n\n`article` =\n````markdown\n'+content+'\n````\nReturn *[保存原生正文](api.write_document(content=`article`,narrative="'+narrative+'"))*.\n'
  own={**self.context,'unit_id':'article','role':'implement','variant':'document'}
  result=self.invoke('ext/root-skill/runtime/io.mq.md','native',context=own,operation='runtime_execute',payload={'api':str(self.project/'ext/root-skill/calls/implement-document.mq.md'),'source':source,'step':1})
  self.assertTrue(result['ok'],result);self.assertTrue(result['value']['ok'],result)
  state=self.fixture.call('status');unit=state['units'][0];self.assertEqual(unit['trial']['engine'],'marqdo-cow');self.assertEqual(unit['trial']['assurance'],'independent_contract');self.assertTrue(unit['trial']['passed']);self.assertEqual(unit['tests']['sha256'],frozen['sha256'])
  artifact=Path(self.context['workspace'])/unit['artifact']['path'];self.assertEqual(artifact.read_text(),content);self.assertNotIn('json.parse', (Path(self.context['workspace'])/unit['path']).read_text())
  artifact.write_text(content+'改动');self.assertEqual(self.fixture.call('refine')['phase'],'refine')
 def test_official_cow_keeps_candidate_writes_out_of_host(self):
  self.fixture.framework();self.fixture.author('u0','隔离结果',mode='code',body='We **_ = fs.write_text(path="unexpected-host-write.txt",text="仅写入沙盒")**.\nReturn *"隔离结果"*.');state=self.fixture.trial('u0');trial=state['units'][0]['trial'];self.assertTrue(trial['passed'],trial)
  self.assertEqual(trial['cases'][0]['evidence']['engine'],'marqdo-cow');self.assertIn({'path':'unexpected-host-write.txt','kind':'write'},trial['cases'][0]['evidence']['changes']);self.assertFalse((Path(self.context['workspace'])/'.agent/cow-empty/unexpected-host-write.txt').exists());self.assertFalse((Path(self.context['workspace'])/'unexpected-host-write.txt').exists())
 def test_dependency_waits_for_real_research_and_rejects_unobserved_citations(self):
  if not os.environ.get('QDAGENT_BROWSER_URL'):self.skipTest('isolated browser integration endpoint not configured')
  self.plan([self.docunit('research',mode='research'),self.docunit('report',['research'])]);self.freeze('research');self.freeze('report')
  jobs=self.invoke('ext/root-skill/runtime/index.mq.md','jobs');self.assertEqual([job['id'] for job in jobs['value']],['research'])
  url='http://127.0.0.1:7431/article';own={**self.context,'unit_id':'research','role':'implement','variant':'research'}
  restricted=self.invoke('ext/root-skill/runtime/turn.mq.md','scene',context=own);self.assertEqual(restricted['scene'],'browse')
  allowed=self.invoke('ext/root-skill/runtime/io.mq.md','api_path',context=restricted);self.assertTrue(allowed.endswith('/implement-browse.mq.md'))
  premature='---\nmarkup: occlusion\nimport:\n  api: '+allowed+'\n---\n\n## act\n\nReturn *api.write_document(content="猜测文章",narrative="未研究")*.\n'
  rejected=self.invoke('ext/root-skill/runtime/io.mq.md','native',context=restricted,operation='runtime_validate',payload={'api':allowed,'source':premature});self.assertFalse(rejected['ok'])
  page=self.invoke('ext/browser/host.mq.md','capture',context=own,url=url);self.assertTrue(page['ok'],page)
  expanded=self.invoke('ext/root-skill/runtime/turn.mq.md','scene',context=own);self.assertEqual(expanded['scene'],'')
  observed=page['value'];work=Path(self.context['workspace']);self.assertTrue((work/observed['screenshot']).read_bytes().startswith(b'\x89PNG\r\n\x1a\n'));self.assertIn('恒星演化',(work/observed['snapshot']).read_text());self.assertNotIn('screenshot":"',json.dumps(observed))
  article='根据真实浏览器观察形成研究笔记。'+('这份材料用于执行链验收，不把测试内容当成科学结论；所有推断仍需用户复核。'*4)+'\n[实际观察来源]('+url+')'
  self.fixture.call('author_unit',context=own,unit_id='research',narrative=protocol.NARRATIVE*4,mode='literal',value=article,body='');self.fixture.trial('research')
  jobs=self.invoke('ext/root-skill/runtime/index.mq.md','jobs');self.assertEqual([job['id'] for job in jobs['value']],['report'])
  context={**self.context,'unit_id':'report','role':'implement','variant':'document'}
  material=self.invoke('ext/root-skill/runtime/prompts.mq.md','facts',context=context);self.assertIn('恒星演化',material);self.assertIn('根据真实浏览器观察形成研究笔记',material);self.assertNotIn('expected',material)
  tester=self.invoke('ext/root-skill/runtime/prompts.mq.md','facts',context={**context,'role':'test'});self.assertNotIn('根据真实浏览器观察形成研究笔记',tester)
  wrong=article.replace(url,'https://unvisited.example/not-read');self.fixture.call('author_unit',context=context,unit_id='report',narrative=protocol.NARRATIVE*4,mode='literal',value=wrong,body='');state=self.fixture.trial('report');self.assertFalse(state['units'][1]['trial']['passed']);self.assertFalse(state['units'][1]['trial']['contract']['sources_ok'])
  self.fixture.call('author_unit',context=context,unit_id='report',narrative=protocol.NARRATIVE*4,mode='literal',value=article,body='');state=self.fixture.trial('report');self.assertTrue(state['units'][1]['trial']['passed']);self.assertEqual(self.fixture.call('refine')['phase'],'implement');state=self.fixture.integrate();self.assertEqual(state['phase'],'review')
  denied=self.invoke('ext/root-skill/runtime/io.mq.md','native',context={**context,'role':'test'},operation='runtime_browser_open',payload={'url':url});self.assertFalse(denied['ok'])
  final=state['units'][1]['artifact'];(work/final['path']).write_text(article+'审阅后改动')
  refused=self.fixture.raw('respond',revision=state['revision'],action='accept');self.assertFalse(refused['ok']);self.assertEqual(refused['error']['code'],'root.delivery_changed')

if __name__=='__main__':unittest.main()
