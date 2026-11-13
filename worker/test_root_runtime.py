import io
import json
import os
from pathlib import Path
import re
import shutil
import sys
import threading
import unittest
from unittest.mock import patch
import agent
from root_skill import RootSkill
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tests'))
import test_root_skill as protocol

class RuntimeTests(unittest.TestCase):
 def setUp(self):
  self.fixture=protocol.RootTests(methodName='runTest');self.fixture.setUp()
  self.environment=patch.dict(os.environ,{'MARQDO_LIB':str(protocol.PROJECT/'lib'),'MARQDO_EXT':str(protocol.PROJECT/'ext')});self.environment.start()
 def tearDown(self):self.environment.stop();self.fixture.tearDown()
 def test_selected_child_models_execute_in_parallel_through_real_marqdo(self):
  self.fixture.intent()
  state=self.fixture.call('outline',title='并发验收',goal='真实验证两个独立单元',acceptance='实际代码与案例通过',units=[{'id':'u0','title':'单元0','purpose':'输出来源明确的验收值'},{'id':'u1','title':'单元1','purpose':'输出来源明确的验收值'}])
  self.fixture.call('respond',revision=state['revision'],action='confirm_outline',settings={'concurrency':2,'child_model':'inherit','unit_models':{'u0':'model-a','u1':'model-b'}})
  events=[];seen=[];lock=threading.Lock();barrier=threading.Barrier(2);active=0;peak=0
  def model(config,messages,specs,emit_event=None):
   nonlocal active,peak
   identifier=re.search(r'unit_id 必须为 (u[01])',messages[1]['content']).group(1)
   with lock:active+=1;peak=max(peak,active);seen.append(config['model'])
   barrier.wait(timeout=10)
   with lock:active-=1
   value={'fixture':identifier,'model':config['model']}
   args={'unit_id':identifier,'narrative':protocol.NARRATIVE,'mode':'literal','body':'','value':value,'cases':[{'input':{'request':'验收','dependencies':{}},'expected':value}]}
   return '', '', [{'id':'call-'+identifier,'type':'function','function':{'name':'author_unit','arguments':json.dumps(args)}}]
  request={'owner':'root-test','run_id':'parallel-fixture','context':self.fixture.context,'model':{'protocol':'ollama','model':'parent'},'child_models':{'model-a':{'protocol':'ollama','model':'selected-a'},'model-b':{'protocol':'ollama','model':'selected-b'}}}
  root=RootSkill(request,agent.cli,model,lambda kind,**data:events.append((kind,data)),lambda *_:True)
  try:state=root.refine()
  except RuntimeError:
   print("child diagnostics",[(kind,data) for kind,data in events if kind=="child_end"])
   raise
  self.assertEqual(state['phase'],'implement');self.assertEqual(peak,2);self.assertEqual(sorted(seen),['selected-a','selected-b'])
  self.assertTrue(all(unit['trial']['passed'] for unit in state['units']))
  self.assertEqual(len([e for e in events if e[0]=='child_start']),2)
  self.assertEqual(len([e for e in events if e[0]=='child_end' and e[1]['status']=='succeeded']),2)
  review=root.fallback(state);self.assertEqual(review['phase'],'review');self.assertEqual(review['pending']['kind'],'review')
 def test_repetitive_read_loop_uses_real_integration_instead_of_fake_completion(self):
  self.fixture.framework();self.fixture.author('u0','已给定正文');self.fixture.trial('u0');self.fixture.call('refine')
  native=self.fixture.root/'runtime/ext/native';native.mkdir(parents=True)
  for name in ['libagent.so','libweb.so','libqdagent_transport.so']:
   try:os.link(protocol.PROJECT/'ext/native'/name,native/name)
   except OSError:shutil.copyfile(protocol.PROJECT/'ext/native'/name,native/name)
  events=[];count=0
  def model(config,messages,specs,**kwargs):
   nonlocal count
   count+=1
   self.assertNotIn('多步骤工作先 plan_task',messages[0]['content'])
   return '', '', [{'id':'read-'+str(count),'type':'function','function':{'name':'read_file','arguments':json.dumps({'path':'solution/units/u0.mq.md'})}}]
  request={'root_skill':True,'owner':'root-test','run_id':'stall-fixture','context':self.fixture.context,'question':'继续整合','model':{'protocol':'ollama','model':'controlled'}}
  with patch.object(sys,'stdin',io.StringIO(json.dumps(request))),patch.object(agent,'stream_model',side_effect=model),patch.object(agent,'emit',side_effect=lambda kind,**data:events.append((kind,data))),patch.object(agent,'plugin_enabled',return_value=True):
   agent.main()
  self.assertEqual(count,6);self.assertEqual(self.fixture.call('status')['phase'],'review')
  reads=[data for kind,data in events if kind=='tool_end' and data['name']=='read_file']
  self.assertEqual(len(reads),6);self.assertTrue(all(data['status']=='succeeded' for data in reads),reads)
  self.assertEqual(events[-1][1]['status'],'waiting_user')
 def test_current_stage_filters_write_tools_and_schema_is_from_source(self):
  request={'owner':'root-test','run_id':'schema-fixture','context':self.fixture.context,'model':{}}
  root=RootSkill(request,agent.cli,None,lambda *a,**k:None,lambda *_:True)
  specs=[{'id':name,'input_schema':{}} for name in ['write_file','skill_intent','skill_integrate','skill_status','read_file']]
  filtered=root.filter_specs(specs);self.assertEqual({s['id'] for s in filtered},{'skill_intent','skill_status','read_file'})
  schema=next(s for s in filtered if s['id']=='skill_intent')['input_schema']
  self.assertEqual(set(schema['properties']),{'summary','question','choices'});self.assertNotIn('context',schema['properties'])
  self.assertEqual(schema['properties']['choices']['items'],{'type':'string'})
  self.assertEqual(root.schema('author_text')['properties']['content']['type'],'string')
  self.assertEqual(root.schema('author_select')['properties']['path']['type'],'array')

if __name__=='__main__':unittest.main()
