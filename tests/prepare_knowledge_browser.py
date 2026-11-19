"""Copy a genuinely reviewed and independently tested fixture to the browser-test owner."""
import json,shutil,sys
from pathlib import Path
from test_knowledge_compilation import KnowledgeTests
project=Path(__file__).resolve().parents[1];owner=sys.argv[1];suite=KnowledgeTests();suite.setUp();original=suite.invoke;created=[]
def observed(fn,**args):
 result=original(fn,**args)
 if fn=='publish' and result.get('ok'):
  record=result['value'];read=original('document',id=record['key']);assert read['ok'],read
  public=project/'data/knowledge/public';public.mkdir(parents=True,exist_ok=True)
  for existing in public.iterdir():
   try: same=json.loads((existing/'record.json').read_text()).get('name')==record['name']
   except (OSError,ValueError): same=False
   if same and existing.name!=record['key']:shutil.rmtree(existing,ignore_errors=True)
  destination=public/record['key'];shutil.copytree(read['value']['root'],destination);created.append(record)
 return result
try:
 suite.invoke=observed;suite.test_reviewed_formula_publishes_and_executes_without_cross_owner_access();assert len(created)==1;print(json.dumps(created[0],ensure_ascii=False))
finally:suite.tearDown()
