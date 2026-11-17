"""Real concurrent ordinary Marqdo functions and lossless manifest transactions."""
import json,sys,zipfile,unittest
from pathlib import Path
import test_office_layouts as layouts
class ProductVariantTests(unittest.TestCase):
 def test_parallel_outputs_have_distinct_styles_and_no_lost_records(self):
  s=layouts.OfficeLayoutTests();s.setUp()
  try:
   result=s.fx.invoke('ext/office/variants.mq.md','generate',context=s.fx.context,kind='pptx',title='多种风格同一内容',sections=[s.text(),s.columns()],themes=['paper','midnight','coral'],concurrency=3,render_pdf=False)
   self.assertTrue(result['ok'],result);variants=result['value']['variants'];self.assertEqual(len(variants),3);self.assertEqual(len({v['id'] for v in variants}),3);self.assertEqual(len({v['group_id'] for v in variants}),1)
   manifest=json.loads((s.work/'.agent/artifacts.json').read_text());self.assertEqual({v['id'] for v in variants},{v['id'] for v in manifest});raws=[]
   for v,motion in zip(variants,['fade','push','wipe']):
    with zipfile.ZipFile(s.work/v['path']) as package:
     xml=package.read('ppt/slides/slide2.xml').decode();raws.append(xml);self.assertIn('<p:'+motion,xml);self.assertIn('写入之前先校验完整内容',xml);self.assertIn(v['theme']['heading'],xml)
    snap=s.fx.invoke('ext/office/index.mq.md','inspect',context=s.fx.context,id=v['id']);self.assertTrue(snap['ok'],snap);self.assertEqual(snap['value']['theme']['id'],v['theme']['id'])
   self.assertEqual(len(set(raws)),3)
   again=s.fx.invoke('ext/office/variants.mq.md','generate',context=s.fx.context,kind='docx',title='无效主题不能产生版本',sections=[s.text()],themes=['paper','paper'],concurrency=2,render_pdf=False);self.assertFalse(again['ok']);self.assertEqual(len(json.loads((s.work/'.agent/artifacts.json').read_text())),3)
  finally:s.tearDown()
if __name__=='__main__':unittest.main()
