"""Real source preparation, mandatory review, official compiler, ownership and writeback."""
import json,os,shutil,subprocess,unittest,uuid
from pathlib import Path
import test_root_skill as root
import test_office_skills as office
class KnowledgeTests(unittest.TestCase):
 def setUp(self):
  self.root=root.RootTests();self.root.setUp();self.context={**self.root.context}
  self.project=self.root.root/'project';self.project.mkdir();self.context['project']=str(self.project);self.work=self.root.root/'work';(self.work/'uploads').mkdir();(self.work/'uploads/source.py').write_text('# Source evidence: f(x)=x*x, domain real numbers.\ndef square(x): return x*x\n')
 def tearDown(self):self.root.tearDown()
 def invoke(self,fn,**args):
  env={**os.environ,'MARQDO_LIB':str(root.PROJECT/'lib'),'MARQDO_EXT':str(root.PROJECT/'ext')};p=subprocess.run(['marqdo','call',str(root.PROJECT/'ext/knowledge/index.mq.md'),fn,'--args-json','-','--fs-root',str(self.work),'--effects','plugin,fs.read,fs.write,environment.read,process.exec,random.read','--json'],input=json.dumps({'context':self.context,**args}),text=True,capture_output=True,env=env,timeout=120);value=json.loads(p.stdout);return value.get('result',{'ok':False,'error':value.get('error')})
 def test_preparation_is_resumable_bounded_and_never_executes_source(self):
  result=self.invoke('prepare',title='平方公式的验证',paths=['uploads/source.py']);self.assertTrue(result['ok'],result)
  record=result['value'];checked=subprocess.run(['marqdo','check',str(self.work/record['plan']),'--narrative-ratio','--json'],capture_output=True,text=True);self.assertEqual(checked.returncode,0,checked.stdout);self.assertIn('Page: 1',(self.work/record['sources'][0]['chunks'][0]['path']).read_text());self.assertIn('尚未接通',(self.work/record['plan']).read_text());self.assertEqual(self.invoke('prepare',title='不会覆盖',paths=['uploads/source.py'])['value'],record)
  self.assertEqual(self.invoke('publish')['error']['code'],'knowledge.review_required');self.assertFalse(self.invoke('document',id='../../private')['ok'])
 def test_actual_material_survives_stateless_turns_without_leaking_to_testers(self):
  def observe(function,**extra):
   c={**self.root.context,'workspace':str(self.work),'role':'implement','unit_id':'u0',**extra.pop('context',{})}
   proc=subprocess.run(['marqdo','call',str(root.PROJECT/'ext/root-skill/runtime/observations.mq.md'),function,'--args-json','-','--fs-root',str(self.work),'--effects','plugin,fs.read,fs.write,environment.read','--json'],input=json.dumps({'context':c,**extra}),capture_output=True,text=True,env={**os.environ,'MARQDO_LIB':str(root.PROJECT/'lib'),'MARQDO_EXT':str(root.PROJECT/'ext')})
   outer=json.loads(proc.stdout);self.assertTrue(outer['ok'],outer);return outer['result']
  read=observe('read_material',path='uploads/source.py');self.assertTrue(read['ok'],read)
  self.assertIn('Source evidence',observe('reference'));self.assertIn(read['value']['sha256'],observe('reference'))
  self.assertNotIn('Source evidence',observe('reference',context={'unit_id':'u1'}));self.assertEqual(observe('reference',context={'role':'test'}),'')
  self.assertFalse(observe('read_material',path='uploads/source.py',context={'role':'test'})['ok'])
  observe('read_material',path='uploads/source.py');self.assertEqual(len(json.loads((self.work/'evidence/materials/u0.json').read_text())),1)
 def test_pdf_page_locations_and_private_input_boundaries(self):
  # An actual two-page PDF, created independently of the extractor under test.
  objects=[b'<< /Type /Catalog /Pages 2 0 R >>',b'<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>']
  for content_id,label in [(4,'Scientific source page one: x squared'),(6,'Independent definition page two: domain real')]:
   objects.append(('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 800] /Resources << /Font << /F1 7 0 R >> >> /Contents '+str(content_id)+' 0 R >>').encode())
   stream=('BT /F1 14 Tf 50 720 Td ('+label+') Tj ET').encode();objects.append(b'<< /Length '+str(len(stream)).encode()+b' >>\nstream\n'+stream+b'\nendstream')
  objects.append(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');raw=b'%PDF-1.4\n';offsets=[0]
  for i,obj in enumerate(objects,1):offsets.append(len(raw));raw+=str(i).encode()+b' 0 obj\n'+obj+b'\nendobj\n'
  xref=len(raw);raw+=b'xref\n0 8\n0000000000 65535 f \n'+b''.join(('%010d 00000 n \n'%n).encode() for n in offsets[1:])+b'trailer << /Size 8 /Root 1 0 R >>\nstartxref\n'+str(xref).encode()+b'\n%%EOF\n'
  (self.work/'uploads/paper.pdf').write_bytes(raw);result=self.invoke('prepare',title='两页论文来源',paths=['uploads/paper.pdf']);self.assertTrue(result['ok'],result);chunks=result['value']['sources'][0]['chunks'];self.assertEqual([c['page'] for c in chunks],[1,2]);self.assertIn('page two',(self.work/chunks[1]['path']).read_text())
 def test_reviewed_formula_publishes_and_executes_without_cross_owner_access(self):
  self.assertTrue(self.invoke('prepare',title='平方公式的可复现编译',paths=['uploads/source.py'])['ok'])
  # Independent root workflow freezes its own cases; publisher cannot submit expected results.
  self.root.intent();state=self.root.call('outline',title='平方公式',goal='按来源计算平方',acceptance='x=3 返回 9，x=4 返回 16，缺省返回 0',units=[{'id':'u0','title':'平方函数','purpose':'输入 request.x 为实数，返回平方；缺省 request 或 x 使用零。使用原文定义且保留符号与范围。','depends_on':[]}]);self.root.call('respond',revision=state['revision'],action='confirm_outline')
  self.root.call('proof.prepare',context={**self.root.context,'unit_id':'u0'})
  self.root.freeze('u0',[{'input':{'request':{'x':3}},'expected':9},{'input':{'request':{'x':4}},'expected':16},{'input':{},'expected':0}])
  generated=subprocess.run(['marqdo','call',str(root.PROJECT/'ext/root-skill/runtime/scalar-formula.mq.md'),'body','--args-json','-','--fs-root',str(self.work),'--effects','plugin,fs.read,environment.read','--json'],input=json.dumps({'expression':'x*x','variable':'x','field':'x','missing':0}),capture_output=True,text=True,env={**os.environ,'MARQDO_LIB':str(root.PROJECT/'lib'),'MARQDO_EXT':str(root.PROJECT/'ext')});generated=json.loads(generated.stdout);self.assertTrue(generated['ok'],generated);body='知识来源：[查看原始来源](uploads/source.py)。\n'+generated['result']
  self.root.author('u0',None,body=body,mode='code');self.root.trial('u0');self.root.call('refine');state=self.root.integrate();self.root.call('respond',revision=state['revision'],action='accept')
  # Existing unit paths and binding imports use the installed project. Publication data alone uses the isolated library project.
  published=self.invoke('publish');self.assertTrue(published['ok'],published);record=published['value'];key=record['key'];contract=self.invoke('contract',id=key,function='unit_u0');self.assertTrue(contract['ok'],contract);self.assertNotIn('math.formula',contract['value']['contract']);self.assertIn('replay',record['functions']);self.assertTrue(self.invoke('document',id=key)['ok'])
  actual=self.invoke('execute',id=key,function='run',input={'x':3});self.assertTrue(actual['ok'],actual);self.assertEqual(actual['value']['result'],{'u0':9})
  written=self.invoke('execute',id=key,function='replay',input={'x':4},write_back=True);self.assertTrue(written['ok'],written);self.assertTrue(written['value']['write_back']);document=self.invoke('document',id=key);self.assertTrue(document['ok'],document);self.assertIn('marqdo-out',document['value']['source'])
  verification=self.invoke('verify',id=key);self.assertTrue(verification['ok'],verification);self.assertTrue(verification['value']['passed'],verification);self.assertEqual(verification['value']['replayed'],3)
  before=self.context['owner'];self.context['owner']='other-owner';self.assertFalse(self.invoke('document',id=key)['ok']);self.context['owner']=before
  location=Path(document['value']['root'])/'index.mq.md';location.write_text(location.read_text()+'\nUnreviewed edit.\n');self.assertFalse(self.invoke('execute',id=key,function='run',input={'x':3})['ok'])
if __name__=='__main__':unittest.main()
