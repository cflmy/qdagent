"""IO-only real Office-engine acceptance; layout behavior comes from the MQ functions."""
import json,shutil,sys
from pathlib import Path
import test_office_layouts as layouts

suite=layouts.OfficeLayoutTests(methodName='runTest');suite.setUp()
try:
 slides=[suite.text(),suite.columns(),suite.layout('presentation','focus',heading='关键结论',body='文稿本身就是实际工具'),suite.layout('presentation','quotation',heading='工程约定',quotation='每一步都有可读意图，\n每次调用都有实际证据。',source='求道工程规范'),suite.layout('presentation','image_text',heading='图文协作',body='图像保持真实比例，\n说明交代使用目的。',image='uploads/chart.png',alt='用于校验比例的真实绿色图示')]
 chapters=[suite.layout('word','report_chapter',heading='报告正文',body='本章说明参数预算和真实操作之间的关系，写入之前校验全部内容，不能只依靠模型自述正确。'),suite.layout('word','notice',heading='重要约束',body='写入之前必须核对内容预算，失败要保留具体字段和可读诊断。'),suite.layout('word','focus',heading='短结论',body='文稿就是工具'),suite.layout('word','illustrated',heading='图文说明',body='这张图用于解释版式中的图片比例，正文和图题都必须在写入之前经过校验。',image='uploads/chart.png',caption='图片比例保持不变的验收示意')]
 output=Path(sys.argv[1]);output.mkdir(parents=True,exist_ok=True)
 for kind,sections in [('pptx',slides),('docx',chapters)]:
  result=suite.fx.invoke('ext/office/index.mq.md','create',context=suite.fx.context,kind=kind,title='可执行布局实际排版',sections=sections,render_pdf=True);assert result['ok'],result
  value=result['value'];assert (suite.work/value['pdf']['path']).read_bytes().startswith(b'%PDF-')
  shutil.copy2(suite.work/value['path'],output/('layouts.'+kind));shutil.copy2(suite.work/value['pdf']['path'],output/(kind+'.pdf'))
  (output/(kind+'-sections.json')).write_text(json.dumps(sections,ensure_ascii=False))
 limits=[suite.layout('presentation','cover',heading='封'*30,body=('介'*40+'\n')[:-1]+'\n'+'绍'*39),suite.layout('presentation','title_body',heading='题'*32,body='\n'.join(['文'*30]*6)),suite.layout('presentation','two_columns',heading='比'*32,left_heading='左'*14,left='\n'.join(['甲'*16]*6),right_heading='右'*14,right='\n'.join(['乙'*16]*6)),suite.layout('presentation','quotation',heading='引'*32,quotation='\n'.join(['论'*22]*3),source='来'*40),suite.layout('presentation','image_text',heading='图'*32,body='\n'.join(['说'*16]*5),image='uploads/chart.png',alt='用于字数上限真实排版的绿色图片')]
 result=suite.fx.invoke('ext/office/index.mq.md','create',context=suite.fx.context,kind='pptx',title='界'*30,sections=limits,render_pdf=True);assert result['ok'],result
 value=result['value'];shutil.copy2(suite.work/value['pdf']['path'],output/'pptx-limits.pdf');shutil.copy2(suite.work/value['path'],output/'limits.pptx')
 (output/'limits-sections.json').write_text(json.dumps(limits,ensure_ascii=False))
 print(json.dumps({'actual_docx':True,'actual_pptx':True,'actual_pdf_count':3,'minimum_and_maximum_layouts':True}))
finally:suite.tearDown()
