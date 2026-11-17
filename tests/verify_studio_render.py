"""Actual parallel Office rendering, exported only to the isolated verification directory."""
import json,shutil,sys
from pathlib import Path
from test_office_layouts import OfficeLayoutTests
suite=OfficeLayoutTests();suite.setUp()
try:
 out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
 slides=[suite.layout('presentation','title_body',heading='从阅读，到真实复现',body='把论文中的想法，转为可验证的程序。\n让每次调用，都保留清晰的依据。'),suite.columns(),suite.layout('presentation','focus',heading='知识的下一种形态',body='不止收藏，更能执行。'),suite.layout('presentation','quotation',heading='关于知识与行动',quotation='阅读只是开始。\n让每个结论，都有一次真实运行。',source='求道 · 知识编译')]
 result=suite.fx.invoke('ext/office/variants.mq.md','generate',context=suite.fx.context,kind='pptx',title='让知识，成为行动',sections=slides,themes=['paper','midnight','coral'],concurrency=3,render_pdf=True);assert result['ok'],result
 for a in result['value']['variants']:
  theme=a['theme']['id'];shutil.copy2(suite.work/a['path'],out/(theme+'.pptx'));shutil.copy2(suite.work/a['pdf']['path'],out/(theme+'-ppt.pdf'))
 shutil.copytree(suite.work,out/'workspace',dirs_exist_ok=True)
 chapters=[suite.layout('word','report_chapter',heading='把理解变成能力',body='知识编译将论文中的公式、源码与事实来源组织为可以阅读、调用和独立验证的文稿。每个函数都说明输入、返回和适用条件，保留原始来源。'),suite.layout('word','notice',heading='先核对，再执行',body='没有接通的能力必须清楚标明，不能用占位内容代替实际结果。'),suite.layout('word','focus',heading='核心原则',body='让文稿本身，成为工具。')]
 result=suite.fx.invoke('ext/office/variants.mq.md','generate',context=suite.fx.context,kind='docx',title='让知识，成为行动',sections=chapters,themes=['paper','midnight','coral'],concurrency=3,render_pdf=True);assert result['ok'],result
 for a in result['value']['variants']:
  theme=a['theme']['id'];shutil.copy2(suite.work/a['path'],out/(theme+'.docx'));shutil.copy2(suite.work/a['pdf']['path'],out/(theme+'-word.pdf'))
 print(json.dumps({'actual_pptx':3,'actual_word':3,'actual_pdf':6,'parallel_styles':True}))
finally:suite.tearDown()
