"""Exact numerical value equivalence without rounding or string coercion."""
import json,os,subprocess,unittest
from pathlib import Path
class NumericContractTests(unittest.TestCase):
 def test_nested_numeric_types_and_large_integers_preserve_exact_business_values(self):
  project=Path(__file__).resolve().parents[1]
  cases=[(9,9.0,True),({'answer':[9,-0.0]},{'answer':[9.0,0]},True),(1.0000000000000002,1,False),('9',9,False),(True,1,False),({'x':None},{},False),([1,2],[2,1],False),(0.1+0.2,0.3,False)]
  for left,right,expected in cases:
   p=subprocess.run(['marqdo','call',str(project/'ext/root-skill/runtime/value.mq.md'),'equal','--args-json','-','--json'],input=json.dumps({'left':left,'right':right}),env={**os.environ,'MARQDO_LIB':str(project/'lib'),'MARQDO_EXT':str(project/'ext')},text=True,capture_output=True,check=True);value=json.loads(p.stdout);self.assertTrue(value['ok']);self.assertEqual(value['result'],expected,(left,right))

 def test_json_input_rejects_unsafe_integer_before_comparison(self):
  project=Path(__file__).resolve().parents[1];p=subprocess.run(['marqdo','call',str(project/'ext/root-skill/runtime/value.mq.md'),'equal','--args-json','-','--json'],input='{"left":9007199254740993,"right":9007199254740992.0}',text=True,capture_output=True)
  self.assertNotEqual(p.returncode,0);self.assertEqual(json.loads(p.stdout)['error']['code'],'call.bad_value')

 def test_formula_data_cannot_reenter_template_or_interpolate_code(self):
  from test_root_skill import RootTests
  root=RootTests();root.setUp()
  try:
   field='__QD_VARIABLE__"\n`not_a_binding`';root.framework();root.freeze('u0',[{'input':{'request':{field:3}},'expected':9}])
   p=subprocess.run(['marqdo','call',str(Path(__file__).resolve().parents[1]/'ext/root-skill/runtime/scalar-formula.mq.md'),'body','--args-json','-','--json','--effects','plugin,fs.read,environment.read'],input=json.dumps({'expression':'x*x','variable':'x','field':field,'missing':0}),text=True,capture_output=True,env={**os.environ,'MARQDO_LIB':str(Path(__file__).resolve().parents[1]/'lib'),'MARQDO_EXT':str(Path(__file__).resolve().parents[1]/'ext')});generated=json.loads(p.stdout);self.assertTrue(generated['ok'],generated)
   root.author('u0',None,body=generated['result'],mode='code');state=root.trial('u0');self.assertTrue(state['units'][0]['trial']['passed'],state['units'][0]['trial'])
  finally:root.tearDown()
