"""Real layout functions, whole-request preflight, embedded PNGs and immutable edits."""
import hashlib,json,struct,unittest,zlib,zipfile
from xml.etree import ElementTree as ET
import test_office_skills as office

def png(width=960,height=540):
 def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
 row=b'\0'+bytes([92,116,65,255])*width
 return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(row*height))+chunk(b'IEND',b'')

class OfficeLayoutTests(unittest.TestCase):
 def setUp(self):
  self.fx=office.OfficeSkillsTests(methodName='runTest');self.fx.setUp();self.work=self.fx.work
  (self.work/'uploads').mkdir();self.picture=png();(self.work/'uploads/chart.png').write_bytes(self.picture)
 def tearDown(self):self.fx.tearDown()
 def layout(self,module,function,**args):return self.fx.invoke('ext/office/layouts/'+module+'.mq.md',function,**args)
 def generate(self,kind,sections):return self.fx.invoke('ext/office/index.mq.md','create',context=self.fx.context,kind=kind,title='可校验布局验收',sections=sections)
 def text(self):return self.layout('presentation','title_body',heading='可执行文档的作用',body='写入之前先校验完整内容，\n执行之后保留真实产物证据。')
 def columns(self):return self.layout('presentation','two_columns',heading='两种工作方式的对比',left_heading='传统方式',left='内容和逻辑分别维护，\n验证需要额外的步骤。',right_heading='可执行文档',right='文稿中直接描述操作，\n参数和正文共同校验。')
 def test_distinct_layouts_create_real_editable_parts_and_embedded_images(self):
  fitted=self.layout('drawing','fit',info={'width':1001,'height':541},w=6000000,h=4000000)
  self.assertLessEqual(fitted['w'],6000000);self.assertLessEqual(fitted['h'],4000000);self.assertAlmostEqual(fitted['w']/fitted['h'],1001/541,places=5)
  slides=[self.text(),self.columns(),self.layout('presentation','focus',heading='关键结论',body='文稿本身就是实际工具'),self.layout('presentation','quotation',heading='工程约定',quotation='每一步都有可读意图，\n每次调用都有实际证据。',source='求道工程规范'),self.layout('presentation','image_text',heading='图文协作',body='图像保持真实比例，\n说明交代使用目的。',image='uploads/chart.png',alt='用于验收保持比例的绿色图示')]
  for item in slides:self.assertNotEqual(item.get('ok'),False,item)
  created=self.generate('pptx',slides);self.assertTrue(created['ok'],created)
  with zipfile.ZipFile(self.work/created['value']['path']) as package:
   for name in package.namelist():
    if name.endswith('.xml') or name.endswith('.rels'):ET.fromstring(package.read(name))
   dual=package.read('ppt/slides/slide3.xml').decode();self.assertIn('x="850000"',dual);self.assertIn('x="6500000"',dual);self.assertIn('传统方式',dual);self.assertIn('可执行文档',dual)
   pictures=[name for name in package.namelist() if name.endswith('.png')];self.assertEqual(len(pictures),1);self.assertEqual(package.read(pictures[0]),self.picture)
   image=ET.fromstring(package.read('ppt/slides/slide6.xml'));ns={'a':'http://schemas.openxmlformats.org/drawingml/2006/main','p':'http://schemas.openxmlformats.org/presentationml/2006/main'};extent=image.find('.//p:pic/p:spPr/a:xfrm/a:ext',ns);self.assertAlmostEqual(int(extent.attrib['cx'])/int(extent.attrib['cy']),960/540,places=5)
  words=[self.layout('word','report_chapter',heading='报告正文',body='本章说明参数预算和真实操作之间的关系，写入之前校验全部内容，不能只依靠模型自述正确。'),self.layout('word','notice',heading='重要约束',body='写入之前必须核对内容预算，失败要保留具体字段和可读诊断。'),self.layout('word','illustrated',heading='图文说明',body='这张图用于解释版式中的图片比例，正文和图题都必须在写入之前经过校验。',image='uploads/chart.png',caption='图片比例保持不变的验收示意')]
  created_word=self.generate('docx',words);self.assertTrue(created_word['ok'],created_word)
  with zipfile.ZipFile(self.work/created_word['value']['path']) as package:
   for name in package.namelist():
    if name.endswith('.xml') or name.endswith('.rels'):ET.fromstring(package.read(name))
   body=package.read('word/document.xml').decode();self.assertIn('EEF2E7',body);self.assertIn('wp:inline',body);self.assertIn('图片比例保持不变',body)
   self.assertIn(b'rIdImage3',package.read('word/_rels/document.xml.rels'));self.assertEqual(package.read('word/media/image3.png'),self.picture)
 def test_minimum_maximum_lines_and_forged_records_fail_before_any_output(self):
  for value in ['', ' '*20,'短句','文字\t文字\t文字\t文字\t文字\t文字','甲'*181,'甲'*31+'\n'+'乙'*12,'甲乙丙丁\n'*7]:
   result=self.layout('presentation','title_body',heading='内容预算',body=value);self.assertFalse(result['ok'],result)
  short=self.fx.invoke('ext/office/paginate.mq.md','slides',sections=[{'heading':'短句布局','body':'Hello world!'}]);self.assertEqual(short[0]['layout'],'ppt.focus')
  self.assertEqual(self.layout('presentation','title_body',heading='完整预算',body='\n'.join(['甲'*30]*6))['layout'],'ppt.text')
  self.assertFalse(self.layout('word','notice',heading='提示内容',body='内容太少')['ok'])
  self.assertFalse(self.layout('presentation','two_columns',heading='对比布局',left_heading='左侧',left=' '*20,right_heading='右侧',right='右边的内容真实而且足够清楚。')['ok'])
  self.assertFalse(self.layout('presentation','title_body',heading='控制字符',body='正文必须拒绝非法控制字符\0才可以生成文件')['ok'])
  forged=self.columns();forged['left']='甲'*97;result=self.generate('pptx',[self.text(),forged]);self.assertFalse(result['ok']);self.assertFalse((self.work/'artifacts').exists());self.assertFalse((self.work/'.agent/artifacts.json').exists())
  result=self.generate('pptx',[{'heading':'绕过构造器','body':'很少','layout':'ppt.text','layout_version':1}]);self.assertFalse(result['ok']);self.assertFalse((self.work/'artifacts').exists())
  unknown={**self.text(),'layout':'ppt.unknown'};self.assertFalse(self.generate('pptx',[unknown])['ok']);self.assertFalse((self.work/'artifacts').exists())
 def test_missing_corrupt_small_and_escaping_images_fail_before_writes(self):
  image=self.layout('presentation','image_text',heading='图片校验',body='真实图像必须满足像素与比例，\n缺少图片不能生成一个空框。',image='uploads/chart.png',alt='用于校验输入图片的实际说明')
  original=self.work/'uploads/chart.png'
  corrupt=bytearray(self.picture);corrupt[-15]^=1
  for content in [b'not a PNG',png(1,1),png(1000,360),self.picture[:-8],bytes(corrupt)]:
   original.write_bytes(content);result=self.generate('pptx',[self.text(),image]);self.assertFalse(result['ok'],result);self.assertFalse((self.work/'artifacts').exists())
  original.unlink();self.assertFalse(self.generate('pptx',[image])['ok']);self.assertFalse((self.work/'artifacts').exists())
  outside=self.fx.base/'private.png';outside.write_bytes(self.picture);original.symlink_to(outside);self.assertFalse(self.generate('pptx',[image])['ok']);self.assertFalse((self.work/'artifacts').exists())
 def test_replacing_structured_layout_preserves_fields_and_old_binary(self):
  first=self.generate('pptx',[self.columns()]);self.assertTrue(first['ok'],first);old=self.work/first['value']['path'];digest=hashlib.sha256(old.read_bytes()).hexdigest()
  rejected=self.fx.invoke('ext/office/index.mq.md','replace_section',id=first['value']['id'],index=0,heading='更新后的对比',body='不能只修改派生正文而不修改实际的左右列。',context=self.fx.context);self.assertFalse(rejected['ok']);self.assertEqual(rejected['error']['code'],'office.layout_derived')
  updated=self.columns();updated['left']='新的左栏内容需要重建，\n预算和顺序保持一致。';updated['body']=updated['left_heading']+'\n'+updated['left']+'\n'+updated['right_heading']+'\n'+updated['right']
  value=self.fx.invoke('ext/office/index.mq.md','replace_layout',id=first['value']['id'],index=0,section=updated,context=self.fx.context);self.assertTrue(value['ok'],value);self.assertEqual(hashlib.sha256(old.read_bytes()).hexdigest(),digest)
  snapshot=self.fx.invoke('ext/office/index.mq.md','inspect',id=value['value']['id'],context=self.fx.context);self.assertEqual(snapshot['value']['sections'][0]['left'],updated['left'])
