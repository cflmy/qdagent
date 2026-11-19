"""Real Marqdo/ABI contract tests; no model text is accepted as execution."""
import concurrent.futures
import json
import os
from pathlib import Path
import subprocess
import tempfile
import time
import unittest

PROJECT=Path(__file__).resolve().parents[1]
NARRATIVE=('本单元处理开发验收中明确给出的输入，输出有来源的固定结果，用于核验可执行文稿工程链路。'
 '这不是外部研究或实际业务结论，不能宣称联网或读取了不存在的资料。函数接收 request 与 dependencies，'
 '案例明确对照实际返回。修改源稿后应重新检查与试运行；最终业务验收仍由用户完成。')

class RootTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory(prefix='qdagent-root-test-');self.root=Path(self.temp.name)
  (self.root/'runtime').mkdir();(self.root/'work').mkdir()
  self.context={'project':str(PROJECT),'root':str(self.root/'runtime'),'workspace':str(self.root/'work'),'owner':'root-test','id':'root-test'}
  self.call('begin',user_input='为内部团队形成可复用的文稿，引用真实材料。',message_id='message-1')
 def tearDown(self):self.temp.cleanup()
 def raw(self,member,context=None,**args):
  env={**os.environ,'MARQDO_LIB':str(PROJECT/'lib'),'MARQDO_EXT':str(PROJECT/'ext')}
  # Marqdo binds a function only against artifacts declared in the entry file,
  # so begin/clarify_intent/respond/outline live in their owning documents.
  owners={'begin':'state.mq.md','respond':'state.mq.md','status':'state.mq.md',
          'clarify_intent':'intent.mq.md','outline':'planning.mq.md',
          'author_select':'authoring.mq.md','author_text':'authoring.mq.md',
          'author_unit':'authoring.mq.md','refine':'authoring.mq.md','trial_unit':'authoring.mq.md',
          'integrate':'delivery.mq.md'}
  source=PROJECT/'ext/root-skill'/owners.get(member,'index.mq.md')
  if '.' in member:
   module,member=member.split('.',1);source=PROJECT/f'ext/root-skill/{module}.mq.md'
  proc=subprocess.run(['marqdo','call',str(source),member,'--args-json','-','--effects','plugin,fs.read,fs.write,process.exec,environment.read','--fs-root',str(self.root/'work'),'--json'],input=json.dumps({**args,'context':context or self.context}),text=True,capture_output=True,env=env,timeout=90,cwd=self.root/'work')
  outer=json.loads(proc.stdout)
  if not outer.get('ok'):return {'ok':False,'error':outer.get('error')}
  return outer['result']
 def call(self,member,**args):
  for attempt in range(8):
   result=self.raw(member,**args)
   if result.get('ok'):return result['value']
   if 'root_skill.conflict' not in json.dumps(result) or attempt==7:break
   time.sleep(.02*(attempt+1))
  self.fail(json.dumps(result,ensure_ascii=False))
 def intent(self):
  state=self.call('clarify_intent',summary='面向内部团队的文稿工程',question='需要怎样的交付？',choices=['可复用文稿','补充背景'])
  return self.call('respond',revision=state['revision'],action='confirm_intent',choice='可复用文稿',answer='正文需保留事实来源和限制。')
 def framework(self,count=1):
  self.intent();units=[{'id':'u'+str(i),'title':'单元'+str(i),'purpose':'处理已提供的开发验收材料','depends_on':[]} for i in range(count)]
  state=self.call('outline',title='开发验收工程',goal='文稿与调用链真实可复用',acceptance='入口可调用，案例能验证，未接通项明确披露',units=units)
  state=self.call('respond',revision=state['revision'],action='confirm_outline')
  for unit in state['units']:self.call('proof.prepare',context={**self.context,'unit_id':unit['id']})
  return state
 def author(self,identifier,value,expected=None,body='',mode='literal'):
  context={**self.context,'unit_id':identifier}
  state=self.call('status');unit=next(item for item in state['units'] if item['id']==identifier)
  if not unit.get('tests'):self.freeze(identifier,[{'input':{'request':'验收','dependencies':{}},'expected':value if expected is None else expected}])
  return self.call('author_unit',context=context,unit_id=identifier,narrative=NARRATIVE,mode=mode,body=body,value=value)
 def freeze(self,identifier,cases):return self.call('proof.submit',context={**self.context,'unit_id':identifier,'role':'test'},cases=cases,rationale='预期来自测试声明的公开业务规则，独立固定后不跟随实现修改。')
 def trial(self,identifier):return self.call('trial_unit',context={**self.context,'unit_id':identifier},unit_id=identifier)
 def integrate(self):return self.call('integrate',narrative=(NARRATIVE+'本入口按已确认的顺序调用独立单元，用户原话与确认逐项保留。依赖只来自已声明的前置结果，不从模型记忆猜测数据。整合冒烟证明程序能运行，不能替代事实核对和业务验收。'*2)*4)
 def test_intent_todos_are_routed_and_every_confirmed_intent_must_be_covered(self):
  own={**self.context,'role':'intent'}
  first=self.call('intent.task',context=own,id='gather-work',title='研究资料',purpose='阅读真实公开来源并列明出处',mode='research')
  state=self.call('intent.task',context=own,id='write',title='撰写报告',purpose='使用研究材料形成有据可查的报告',mode='document')
  self.assertEqual(len(state['intent_tasks']),2)
  self.assertEqual(first['intent_tasks'][0]['route']['document'],'ext/root-skill/calls/implement-document.mq.md')
  self.assertEqual(state['intent_tasks'][1]['route']['function'],'write_document')
  self.assertFalse(self.raw('intent.task',context=own,id='escape',title='越界',purpose='不应允许任意路径',mode='../../private')['ok'])
  self.assertFalse(self.raw('intent.task',context={**own,'role':'test'},id='bad',title='越界',purpose='不应由子任务拆意图',mode='code')['ok'])
  state=self.call('clarify_intent',summary='研究后形成报告',question='这两项任务是否完整？',choices=['按清单推进','调整清单'])
  self.assertFalse(self.raw('intent.task',context=own,id='late',title='覆盖问题',purpose='问题待回答时不能改任务',mode='code')['ok'])
  state=self.call('respond',revision=state['revision'],action='confirm_intent',choice='按清单推进')
  self.assertEqual(state['history'][-1]['tasks'][0]['id'],'gather_work')
  invalid=self.raw('planning.define',context={**self.context,'role':'outline'},id='sources',title='遗漏关联',purpose='不能猜测归属',mode='research')
  self.assertEqual(invalid['error']['code'],'root.intent_binding');self.assertFalse(self.call('status').get('draft_units'))
  saved=self.raw('planning.define',context={**self.context,'role':'outline'},id='sources-segment',title='来源段',purpose='形成真实来源的公开材料',mode='research',intent_id='gather-work')
  self.assertEqual(saved['id'],'sources_segment');self.assertEqual(saved['intent_id'],'gather_work')
  scoped=self.raw('runtime/planning.scene',context={**self.context,'role':'outline'})
  self.assertEqual(scoped['outline_intent']['id'],'write');self.assertEqual(scoped['outline_intent']['mode'],'document');self.assertEqual(scoped['variant'],'intent-slot')

  units=[{'id':'sources','title':'资料','purpose':'列出真实来源','mode':'research','intent_id':'gather_work'}]
  missing=self.raw('outline',title='复合意图',goal='先研究再写作',acceptance='两项均有交付',units=units)
  self.assertEqual(missing['error']['code'],'root.intent_coverage')
  self.assertFalse((self.root/'work/solution/plan.mq.md').exists())
  units.append({'id':'report','title':'报告','purpose':'使用来源写作','mode':'document','intent_id':'write','depends_on':['sources']})
  state=self.call('outline',title='复合意图',goal='先研究再写作',acceptance='两项均有交付',units=units)
  self.assertEqual([u['intent_id'] for u in state['units']],['gather_work','write'])
  self.assertEqual(state['units'][1]['route']['mode'],'document')
  source=(self.root/'work/solution/plan.mq.md').read_text();self.assertIn('所属意图',source);self.assertIn('implement-document.mq.md',source)
  state=self.call('respond',revision=state['revision'],action='confirm_outline')
  snapshot=next(item for item in state['stage_history'] if item['phase']=='outline')
  old=(self.root/'work'/snapshot['document']['path']).read_text();self.assertEqual(old,source)
  state=self.call('respond',revision=state['revision'],action='revise_intent',answer='用户要求重新拆解')
  self.assertEqual(state['phase'],'intent');self.assertFalse(state['intent_confirmed']);self.assertEqual(state['intent_tasks'],[])
  self.assertEqual((self.root/'work'/snapshot['document']['path']).read_text(),source)
  self.assertTrue(any(item['phase']=='intent' for item in state['stage_history']))

 def test_completed_stage_records_survive_a_new_goal_without_granting_approval(self):
  self.framework();self.author('u0','真实结果');self.trial('u0');self.call('refine');state=self.integrate()
  state=self.call('respond',revision=state['revision'],action='accept')
  records=state['stage_history'];self.assertEqual([item['phase'] for item in records],['intent','outline','refine','implement','review'])
  review=records[-1];self.assertEqual(review['decision']['action'],'accept')
  delivered=(self.root/'work'/review['document']['path']).read_text()
  self.assertNotIn('suite',records[2]['units'][0]);self.assertNotIn('specification',records[2]['units'][0]);self.assertTrue(records[2]['units'][0]['trial']['passed'])
  state=self.call('begin',user_input='新的目标必须重新确认',message_id='message-new-cycle')
  self.assertEqual(state['phase'],'intent');self.assertFalse(state.get('intent_confirmed'))
  self.assertEqual(state['stage_history'],records)
  self.assertEqual((self.root/'work'/review['document']['path']).read_text(),delivered)

 def test_steps_and_human_confirmation_cannot_be_skipped(self):
  self.assertFalse(self.raw('gate',name='write_file')['ok']);self.assertFalse(self.raw('integrate',narrative='跳过')['ok'])
  state=self.call('clarify_intent',summary='先对齐目标',question='谁使用？',choices=['内部','外部'])
  self.assertFalse(self.raw('respond',revision=state['revision']-1,action='confirm_intent',choice='内部')['ok'])
  state=self.call('respond',revision=state['revision'],action='answer',answer='先补充一些背景')
  self.assertEqual(state['phase'],'intent')
  self.call('clarify_intent',summary='根据补充继续确认',question='是否按内部用途推进？',choices=['内部','外部'])
  state=self.call('status');self.call('respond',revision=state['revision'],action='confirm_intent',choice='内部')
  self.assertFalse(self.raw('refine')['ok'])
  state=self.call('outline',title='工程',goal='目标',acceptance='真实结果',units=[{'id':'u0','title':'处理','purpose':'形成文稿'}])
  path=self.root/'work/solution/plan.mq.md';path.write_text(path.read_text()+'\n用户修改了框架。\n')
  self.assertFalse(self.raw('respond',revision=state['revision'],action='confirm_outline')['ok'])
 def test_compiler_cases_and_source_digest_are_real_gates(self):
  self.framework()
  bad=self.raw('author_unit',context={**self.context,'unit_id':'u0'},unit_id='u0',narrative=NARRATIVE,mode='code',body='We **amount = (1 + )**.\nReturn *amount*.',value=None)
  self.assertFalse(bad['ok']);self.assertFalse((self.root/'work/solution/units/u0.mq.md').exists())
  self.author('u0',{'text':'含有 `变量`、**标记**、\n换行和|分隔符'},expected='真实结果');state=self.trial('u0');self.assertEqual(state['units'][0]['status'],'failed')
  self.assertEqual(self.call('refine')['phase'],'refine')
  self.author('u0','真实结果');self.trial('u0')
  path=self.root/'work/solution/index.mq.md';path.write_text(path.read_text()+'\n源码已经变化。\n')
  self.assertEqual(self.call('refine')['phase'],'refine')
  self.assertFalse(self.raw('author_unit',context={**self.context,'unit_id':'other'},unit_id='u0',narrative=NARRATIVE,mode='literal',body='',value=1)['ok'])
 def test_concurrent_units_merge_and_final_acceptance_is_version_bound(self):
  self.framework(2)
  def work(identifier):self.author(identifier,{'text':'`变量` **标记**\n换行'});self.trial(identifier)
  with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:list(pool.map(work,['u0','u1']))
  state=self.call('status');self.assertEqual([u['status'] for u in state['units']],['ready','ready'])
  self.assertEqual(self.call('refine')['phase'],'implement')
  state=self.integrate();self.assertEqual(state['phase'],'review')
  path=self.root/'work/solution/index.mq.md';source=path.read_text();self.assertIn('用户交流记录',source);self.assertIn('正文需保留事实来源和限制',source)
  path.write_text(source+'\n审阅期间改动。\n');self.assertFalse(self.raw('respond',revision=state['revision'],action='accept')['ok'])
  path.write_text(source);state=self.call('respond',revision=state['revision'],action='accept');self.assertEqual(state['phase'],'complete');self.assertIn('accept',(self.root/'work/solution/decisions.mq.md').read_text());subprocess.run(['marqdo','check',str(self.root/'work/solution/decisions.mq.md'),'--narrative-ratio','--json'],check=True,capture_output=True)
 def test_legacy_author_cases_cannot_be_accepted_as_independent_verification(self):
  self.framework();self.author('u0','真实固定返回');self.trial('u0');self.call('refine');state=self.integrate()
  del state['units'][0]['tests']
  path=self.root/'runtime/data/dialogue/proj/root-skill.json';path.write_text(json.dumps(state,ensure_ascii=False))
  result=self.raw('respond',revision=state['revision'],action='accept');self.assertFalse(result['ok']);self.assertEqual(result['error']['code'],'root.legacy_review')
  revised=self.call('respond',revision=state['revision'],action='revise',answer='重新确认当前协议框架')
  self.assertEqual(revised['phase'],'outline');self.assertEqual(revised['draft_units'],[])
 def test_fixed_contract_preserves_actual_quotes_and_newlines(self):
  self.intent();target="'材料甲'\n第二行"
  state=self.call('outline',title='精确正文契约',goal='保留实际字符',acceptance='原文中的引号与换行必须保留',units=[{'id':'fixed','title':'原文','purpose':'忽略输入，原样返回下列文字：'+target,'depends_on':[],'mode':'text','constant_text':target,'return_type':'text'}])
  self.call('respond',revision=state['revision'],action='confirm_outline');own={**self.context,'unit_id':'fixed'}
  self.call('proof.prepare',context=own);frozen=self.call('proof.fixed',context={**own,'role':'test'},rationale='精确原文来自用户确认的公开契约，不来自实现')
  self.assertEqual([case['expected'] for case in frozen['suite']['cases']],[target,target])
  self.author('fixed',target);state=self.trial('fixed');self.assertTrue(state['units'][0]['trial']['passed'])
  self.author('fixed','材料甲\n第二行');state=self.trial('fixed');self.assertFalse(state['units'][0]['trial']['passed'])
 def test_user_function_count_is_enforced_and_changes_require_replanning(self):
  state=self.call('clarify_intent',summary='恰好两个业务函数',question='确认数量？',choices=['两个','重新说明'])
  settings={'concurrency':2,'child_model':'inherit','test_model':'inherit','unit_models':{},'expected_units':2}
  self.call('respond',revision=state['revision'],action='confirm_intent',choice='两个',settings=settings)
  units=[{'id':'u'+str(i),'title':'职责'+str(i),'purpose':'当前职责返回独立业务结果','depends_on':[]} for i in range(2)]
  bad=self.raw('outline',title='数量约束',goal='两个函数',acceptance='完整定义两个职责',units=units[:1]);self.assertEqual(bad['error']['code'],'root.unit_count')
  state=self.call('outline',title='数量约束',goal='两个函数',acceptance='完整定义两个职责',units=units)
  changed=self.raw('respond',revision=state['revision'],action='confirm_outline',settings={**settings,'expected_units':1});self.assertEqual(changed['error']['code'],'root.constraint_changed')
  self.assertEqual(self.call('status')['phase'],'outline');self.assertEqual(self.call('respond',revision=state['revision'],action='confirm_outline',settings=settings)['phase'],'refine')
 def test_select_template_reads_actual_inputs(self):
  self.framework();context={**self.context,'unit_id':'u0'}
  self.freeze('u0',[{'input':{'request':{'text':'甲'}},'expected':'甲'},{'input':{'request':{'text':'乙'}},'expected':'乙'}])
  self.call('author_select',context=context,unit_id='u0',narrative=NARRATIVE,path=['request','text'])
  self.assertEqual(self.trial('u0')['units'][0]['status'],'ready')
  self.call('author_text',context=context,unit_id='u0',narrative=NARRATIVE,content='材料甲')
  self.assertEqual(self.trial('u0')['units'][0]['status'],'failed')
  self.assertFalse(self.raw('proof.submit',context={**context,'role':'implement'},cases=[{'input':{},'expected':'材料甲'}],rationale='试图修改')['ok'])
  self.assertFalse(self.raw('proof.submit',context={**context,'role':'test'},cases=[{'input':{},'expected':'材料甲'}],rationale='跟随实现重写')['ok'])
 def test_unconnected_work_requires_explicit_partial_acceptance(self):
  self.framework();context={**self.context,'unit_id':'u0'};self.freeze('u0',[{'input':{},'expected':None}])
  self.call('author_unit',context=context,unit_id='u0',narrative=NARRATIVE+'本例故意保留尚未接通的接口，绝不能宣称完整业务可用。',mode='code',body='Return *[接口尚未接通](None)*.',value=None)
  self.trial('u0');self.call('refine');state=self.integrate()
  self.assertTrue(state['pending']['stubs'])
  self.assertFalse(self.raw('respond',revision=state['revision'],action='accept')['ok'])
  state=self.call('respond',revision=state['revision'],action='accept',accept_stubs=True);self.assertEqual(state['delivery_status'],'partial')

if __name__=='__main__':unittest.main()
