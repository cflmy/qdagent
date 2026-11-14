"""Wire substitute only; all agent policy, source generation and execution are real Marqdo."""
import concurrent.futures
import http.server
import json
import os
from pathlib import Path
import subprocess
import sys
import threading
import time
import unittest
import uuid
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tests'))
import test_root_skill as protocol

class RuntimeTests(unittest.TestCase):
 def setUp(self):
  self.fixture=protocol.RootTests(methodName='runTest');self.fixture.setUp();self.requests=[];self.repairs={};self.test_attempts={};self.outline_attempts=0;self.lock=threading.Lock();self.active=0;self.peak=0
  self.responses={}
  for name in ['intent','outline','test','bad','good','deliver','forbidden_test_read','outline_first','outline_second','outline_publish']:
   p=subprocess.run(['marqdo','call',str(protocol.PROJECT/'tests/fixtures/document-agent/responses.mq.md'),name,'--json'],capture_output=True,text=True,check=True)
   self.responses[name]=json.loads(p.stdout)['result']
  outer=self
  class Handler(http.server.BaseHTTPRequestHandler):
   def do_POST(self):
    request=json.loads(self.rfile.read(int(self.headers['Content-Length'])))
    assert 'tools' not in request
    standing=request['messages'][0]['content']
    role='intent' if '## ask\n' in standing else 'outline' if ('## text_unit\n' in standing or '## publish\n' in standing) else 'test' if ('## sample\n' in standing or '## verify_constant\n' in standing) else 'implement' if '## write_text\n' in standing else 'deliver'
    with outer.lock:outer.requests.append((role,request));outer.active+=1;outer.peak=max(outer.peak,outer.active)
    if role=='outline':
     with outer.lock:count=outer.outline_attempts;outer.outline_attempts+=1
     response=outer.responses[['outline_first','outline_second','outline_publish'][min(count,2)]]
    elif role=='implement':
     with outer.lock:
      facts=request['messages'][1]['content'];key='u0' if 'unit_u0' in facts else 'u1';count=outer.repairs.get(key,0);outer.repairs[key]=count+1
     response=outer.responses['bad' if count==0 else 'good']
    elif role=='test':
     with outer.lock:
      facts=request['messages'][1]['content'];key='u0' if 'unit_u0' in facts else 'u1';count=outer.test_attempts.get(key,0);outer.test_attempts[key]=count+1
     response=outer.responses['forbidden_test_read' if count==0 else 'test']
    else:response=outer.responses[role]
    self.send_response(200);self.send_header('Content-Type','application/x-ndjson');self.end_headers()
    midpoint=len(response)//2
    for text in [response[:midpoint],response[midpoint:]]:
     self.wfile.write((json.dumps({'message':{'content':text}})+'\n').encode());self.wfile.flush();time.sleep(.04)
    with outer.lock:outer.active-=1
   def log_message(self,*args):pass
  self.server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler);self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
 def tearDown(self):self.server.shutdown();self.server.server_close();self.thread.join();self.fixture.tearDown()
 def run_worker(self):
  context={**self.fixture.context,'run_id':uuid.uuid4().hex,'model_selection':'fixture-parent'}
  config={'protocol':'ollama','builtin':True,'endpoint':f'http://127.0.0.1:{self.server.server_port}','model':'fixture-parent'}
  payload={'root_skill':True,'run_id':context['run_id'],'owner':'root-test','question':'继续当前真实阶段','context':context,'model':config,'child_models':{'fixture-test':{**config,'model':'isolated-test'}}}
  directory=Path(context['root'])/'data/dialogue/proj/runtime'/context['run_id'];directory.mkdir(parents=True,mode=0o700)
  private=directory/'request.json';private.write_text(json.dumps(payload));private.chmod(0o600)
  actor=directory/'actor.json';actor.write_text(json.dumps(context));actor.chmod(0o600)
  environment={**os.environ,'QDAGENT_RUN_REQUEST_FILE':str(private),'QDAGENT_ACTOR_FILE':str(actor),'MARQDO_LIB':str(protocol.PROJECT/'lib'),'MARQDO_EXT':str(protocol.PROJECT/'ext')}
  command=['marqdo','call',str(protocol.PROJECT/'ext/root-skill/index.mq.md'),'run','--args-json','-','--json','--fs-root',context['workspace'],'--effects','plugin,fs.read,fs.write,process.exec,environment.read,time.read,random.read']
  proc=subprocess.run(command,input=json.dumps({'context':context}),capture_output=True,text=True,timeout=120,cwd=context['workspace'],env=environment)
  self.assertEqual(proc.returncode,0,proc.stdout[:1500]+proc.stderr[:500])
  final=json.loads(proc.stdout);self.assertTrue(final['ok'],final)
  events=[json.loads(line) for line in (directory/'events.ndjson').read_text().splitlines()]
  events.append({'kind':'final','data':final['result']})
  self.assertTrue(events,proc.stderr);self.assertEqual(events[-1]['kind'],'final',events[-4:]);self.assertEqual(events[-1]['data']['status'],'waiting_user',events[-5:]);self.assertEqual(proc.returncode,0,proc.stderr)
  return events,context
 def test_document_native_flow_has_blind_testers_and_repairs_real_defects(self):
  self.run_worker();state=self.fixture.call('status');self.fixture.call('respond',revision=state['revision'],action='confirm_intent',choice=state['pending']['choices'][0],settings={'concurrency':2,'child_model':'inherit','test_model':'inherit','unit_models':{},'expected_units':2})
  self.run_worker();state=self.fixture.call('status');self.assertEqual(len(state['draft_units']),2);self.assertEqual(self.outline_attempts,3);self.fixture.call('respond',revision=state['revision'],action='confirm_outline',settings={'concurrency':2,'child_model':'inherit','test_model':'fixture-test','unit_models':{}})
  planning=[request for role,request in self.requests if role=='outline']
  for request in planning[1:]:
   self.assertIn('上一步实际调用成功',request['messages'][-1]['content']);self.assertNotIn('上一次调用尚未取得',request['messages'][-1]['content']);self.assertNotIn('own_previous_program',request['messages'][-1]['content'])
  self.assertNotIn('## text_unit\n',planning[-1]['messages'][0]['content']);self.assertIn('## publish\n',planning[-1]['messages'][0]['content'])
  events,context=self.run_worker();state=self.fixture.call('status');self.assertEqual(state['phase'],'review');self.assertGreaterEqual(self.peak,2)
  self.assertEqual(len([e for e in events if e['kind']=='child_start']),2)
  failed=[e for e in events if e['kind']=='child_tool_end' and e['data']['status']=='failed'];self.assertTrue(failed,'injected defect bypassed independent tests')
  self.assertTrue(all(unit['trial']['passed'] and unit['trial']['assurance']=='independent_cases' for unit in state['units']))
  tests=[request for role,request in self.requests if role=='test'];self.assertEqual(len(tests),4);self.assertEqual(len([e for e in events if e['kind']=='call_rejected' and e['data']['role']=='test']),2)
  for request in tests:
   serialized=json.dumps(request,ensure_ascii=False);self.assertEqual(request['model'],'isolated-test');self.assertNotIn('故意植入的错误',serialized);self.assertNotIn('unit_record',serialized);self.assertNotIn('source_header',serialized);self.assertNotIn('We **',request['messages'][1]['content']);self.assertNotIn('Return *',request['messages'][1]['content'].split('上一次调用尚未取得')[0])
  for role,request in self.requests:self.assertNotIn('tools',request)
  for unit in state['units']:
   self.assertEqual(unit['specification']['executable_statements'],0);self.assertEqual(unit['tests']['sha256'],unit['trial']['suite_sha256'])
  self.fixture.call('respond',revision=state['revision'],action='accept');self.assertEqual(self.fixture.call('status')['phase'],'complete')
  source=self.fixture.root/'work/solution/index.mq.md';p=subprocess.run(['marqdo','call',str(source),'run','--args-json','-','--json','--effects','fs.read,fs.write','--fs-root',str(self.fixture.root/'work')],input='{"input":null}',capture_output=True,text=True,env={**os.environ,'MARQDO_LIB':str(protocol.PROJECT/'lib')},check=True)
  self.assertEqual(json.loads(p.stdout)['result'],{'u0':'材料甲','u1':'材料甲'})

if __name__=='__main__':unittest.main()
