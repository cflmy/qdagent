"""Actual Marqdo Office calls, immutable edits, read-only OOXML and root delivery gates."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
import zipfile
import test_root_skill as protocol

PROJECT=Path(__file__).resolve().parents[1]
class OfficeSkillsTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='qd-office-');self.base=Path(self.temp.name);self.work=self.base/'work';self.work.mkdir()
  self.context={'project':str(PROJECT),'workspace':str(self.work),'root':str(self.base/'runtime'),'owner':'office-verification','id':'office-verification','run_id':'office-verification','role':'intent'}
  self.request=self.base/'request.json';self.actor=self.base/'actor.json';self.scene(self.context)
 def tearDown(self):self.temp.cleanup()
 def scene(self,context):
  self.context=context;self.request.write_text(json.dumps({'context':context,'model':{}}));self.actor.write_text(json.dumps(context))
 def invoke(self,document,function,root=None,**args):
  env={**os.environ,'MARQDO_LIB':str(PROJECT/'lib'),'MARQDO_EXT':str(PROJECT/'ext'),'QDAGENT_RUN_REQUEST_FILE':str(self.request),'QDAGENT_ACTOR_FILE':str(self.actor)}
  proc=subprocess.run(['marqdo','call',str(PROJECT/document),function,'--args-json','-','--fs-root',str(root or PROJECT),'--effects','plugin,fs.read,fs.write,process.exec,environment.read,random.read','--json'],input=json.dumps(args,ensure_ascii=False),text=True,capture_output=True,env=env,cwd=root or PROJECT,timeout=150)
  outer=json.loads(proc.stdout);self.assertTrue(outer.get('ok'),str(outer)[:1200]);return outer['result']
 def create(self,kind,sections):
  name,param=('word','chapters') if kind=='docx' else ('presentation','slides')
  value=self.invoke(f'ext/office/{name}.mq.md','create',context=self.context,title='真实办公验收',**{param:sections});self.assertTrue(value['ok'],value);return value['value']
 def test_word_and_ppt_keep_old_versions_and_only_change_the_selected_section(self):
  original=[{'heading':'第一部分','body':'原始正文 & <真实> "引号"。'},{'heading':'保留部分','body':'这里的段落不能被局部修改覆盖。'}]
  for kind,doc,part in [('docx','word','chapter'),('pptx','presentation','slide')]:
   with self.subTest(kind=kind):
    first=self.create(kind,original);path=self.work/first['path'];digest=hashlib.sha256(path.read_bytes()).hexdigest()
    revised=self.invoke(f'ext/office/{doc}.mq.md','replace_'+part,id=first['id'],index=0,heading='修订部分',body='新的正文，保留原文件。',context=self.context);self.assertTrue(revised['ok'],revised)
    new=revised['value'];self.assertNotEqual(new['id'],first['id']);self.assertEqual(hashlib.sha256(path.read_bytes()).hexdigest(),digest)
    inspected=self.invoke('ext/office/index.mq.md','inspect',id=new['id'],context=self.context);self.assertEqual(inspected['value']['sections'][1],original[1]);self.assertEqual(inspected['value']['sections'][0]['body'],'新的正文，保留原文件。')
    added=self.invoke(f'ext/office/{doc}.mq.md','insert_'+part,id=new['id'],index=2,heading='附加部分',body='实际追加的正文。',context=self.context);self.assertTrue(added['ok'],added)
    removed=self.invoke(f'ext/office/{doc}.mq.md','remove_'+part,id=added['value']['id'],index=0,context=self.context);self.assertTrue(removed['ok'],removed)
    final=self.invoke('ext/office/index.mq.md','inspect',id=removed['value']['id'],context=self.context);self.assertEqual([s['heading'] for s in final['value']['sections']],['保留部分','附加部分'])
    before=len(json.loads((self.work/'.agent/artifacts.json').read_text()));bad=self.invoke(f'ext/office/{doc}.mq.md','remove_'+part,id=new['id'],index=12,context=self.context);self.assertFalse(bad['ok']);self.assertEqual(before,len(json.loads((self.work/'.agent/artifacts.json').read_text())))
    # The official reader sees the actual generated binary, not only the saved source.
    read=self.invoke('ext/root-skill/runtime/io.mq.md','native',root=self.work,context=self.context,operation='runtime_office_read',payload={'path':first['path'],'offset':0});self.assertTrue(read['ok'],read);self.assertIn('原始正文 & <真实> "引号"。',read['value']['content'])
    path.write_bytes(b'changed');self.assertFalse(self.invoke('ext/office/index.mq.md','inspect',id=first['id'],context=self.context)['ok'])
 def test_upload_text_is_paginated_and_test_role_or_escaping_path_is_denied(self):
  text='真实文字与符号<>&。'*800
  tail='后半资料'*2000+'可核对的结尾 FINAL_OFFICE_CHUNK';first=self.create('docx',[{'heading':'长文','body':text},{'heading':'后半部分','body':tail}]);uploads=self.work/'uploads';uploads.mkdir();shutil.copy2(self.work/first['path'],uploads/'actual.docx')
  first_page=self.invoke('ext/office/read.mq.md','read',root=self.work,path='uploads/actual.docx');self.assertTrue(first_page['ok'],first_page);self.assertEqual(len(first_page['value']['content']),8000);self.assertTrue(first_page['value']['truncated'])
  next_page=self.invoke('ext/office/read.mq.md','read',root=self.work,path='uploads/actual.docx',offset=first_page['value']['next_offset']);self.assertTrue(next_page['ok']);self.assertIn(text,(first_page['value']['content']+next_page['value']['content']))
  last_page=self.invoke('ext/office/read.mq.md','read',root=self.work,path='uploads/actual.docx',offset=next_page['value']['next_offset']);self.assertTrue(last_page['ok']);self.assertIsNone(last_page['value']['next_offset'])
  self.assertIn(tail,next_page['value']['content']+last_page['value']['content'])
  reference=self.invoke('ext/root-skill/runtime/observations.mq.md','reference',root=self.work,context=self.context);self.assertIn('FINAL_OFFICE_CHUNK',reference)
  observations=json.loads((self.work/'evidence/materials/root.json').read_text());self.assertEqual(len(observations),3);self.assertEqual(observations[0]['kind'],'office_text')
  self.assertFalse(self.invoke('ext/office/read.mq.md','read',root=self.work,path='../request.json')['ok'])
  outside=self.base/'outside.docx';shutil.copy2(uploads/'actual.docx',outside);(uploads/'escape.docx').symlink_to(outside);self.assertFalse(self.invoke('ext/office/read.mq.md','read',root=self.work,path='uploads/escape.docx')['ok'])
  self.scene({**self.context,'role':'test'});self.assertFalse(self.invoke('ext/root-skill/runtime/io.mq.md','native',root=self.work,context=self.context,operation='runtime_office_read',payload={'path':'uploads/actual.docx','offset':0})['ok'])
 def test_pagination_preserves_text_and_manuscript_tampering_invalidates_revision(self):
  sections=[{'heading':'一个主题','body':'甲'*1200+'\n'+'乙'*100}]
  pages=self.invoke('ext/office/paginate.mq.md','slides',sections=sections);self.assertGreater(len(pages),1);self.assertEqual(''.join(s['body'].replace('\n','') for s in pages),'甲'*1200+'乙'*100)
  artifact=self.create('pptx',pages);manifest=self.work/artifact['manuscript'];manifest.write_text(manifest.read_text()+' ')
  result=self.invoke('ext/office/index.mq.md','replace_section',id=artifact['id'],index=0,heading='不能生效',body='旧证据已失效',context=self.context);self.assertFalse(result['ok']);self.assertEqual(result['error']['code'],'office.changed')
 def test_confirmed_format_is_inherited_and_finish_requires_an_actual_current_office_file(self):
  fixture=protocol.RootTests(methodName='runTest');fixture.setUp()
  try:
   fixture.call('intent.task',context={**fixture.context,'role':'intent'},id='report',title='演示正文',purpose='为内部演示生成已确认正文',mode='text',artifact_kind='pptx')
   state=fixture.call('clarify_intent',summary='制作实际 PPT',question='按这一份正文制作吗？',choices=['按原文','重新确认'])
   fixture.call('respond',revision=state['revision'],action='confirm_intent',choice='按原文')
   content='这是已经明确确认的演示正文。'
   state=fixture.call('outline',title='已确认演示',goal='制作可编辑演示文件',acceptance='正文准确且实际文件可打开',units=[{'id':'u0','title':'业务正文','purpose':'忽略任何输入并逐字返回已确认正文：'+content,'mode':'text','constant_text':content,'depends_on':[],'intent_id':'report'}])
   self.assertEqual(state['artifact_kind'],'pptx');self.assertEqual(state['office_route']['document'],'ext/office/presentation.mq.md')
   state=fixture.call('respond',revision=state['revision'],action='confirm_outline');fixture.call('proof.prepare',context={**fixture.context,'unit_id':'u0'});fixture.author('u0',content);fixture.trial('u0');fixture.call('refine')
   self.assertEqual(fixture.raw('integrate',narrative=protocol.NARRATIVE*12)['error']['code'],'root.office_missing')
   own={**fixture.context,'role':'deliver','run_id':'office-scratch-scene'};self.scene(own)
   api=str(PROJECT/'ext/root-skill/calls/deliver-office.mq.md')
   source='---\nmarkup: occlusion\nimport:\n  api: '+api+'\n---\n\n## act\n\nReturn *[组装实际办公文件](api.assemble(render_pdf=False))*.\n'
   executed=self.invoke('ext/root-skill/runtime/io.mq.md','native',root=fixture.root/'work',context=own,operation='runtime_execute',payload={'source':source,'api':api,'step':1})
   self.assertTrue(executed['ok'],executed);self.assertTrue(executed['value']['ok'],executed)
   artifact=executed['value']['value'];path=fixture.root/'work'/artifact['path'];self.assertTrue(path.exists())
   again=fixture.call('runtime/office.assemble',context=own,render_pdf=False);self.assertEqual(artifact['id'],again['id'])
   content_bytes=path.read_bytes();path.write_bytes(b'changed');self.assertFalse(fixture.raw('integrate',narrative=protocol.NARRATIVE*12)['ok']);path.write_bytes(content_bytes)
   finish='---\nmarkup: occlusion\nimport:\n  api: '+api+'\n---\n\n## act\n\nReturn *[提交实际办公交付审阅](api.finish(narrative='+json.dumps(protocol.NARRATIVE*12,ensure_ascii=False)+'))*.\n'
   integrated=self.invoke('ext/root-skill/runtime/io.mq.md','native',root=fixture.root/'work',context=own,operation='runtime_execute',payload={'source':finish,'api':api,'step':2})
   self.assertTrue(integrated['ok'],integrated);self.assertTrue(integrated['value']['ok'],integrated)
   self.assertEqual(fixture.call('status')['phase'],'review')
  finally:fixture.tearDown()
if __name__=='__main__':unittest.main()
