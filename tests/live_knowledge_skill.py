"""Real provider + reviewed source + compiled knowledge; fixed intent lives in MQ."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import uuid


def inside():
    model=json.load(sys.stdin)
    with tempfile.TemporaryDirectory(prefix='qd-knowledge-live-') as directory:
        base=Path(directory);(base/'work').mkdir();(base/'runtime').mkdir()
        context={'project':'/app','root':str(base/'runtime'),'workspace':str(base/'work'),'owner':'knowledge-live-verification','id':'knowledge-live-verification'}
        def call(document,function,args,include=True):
            if include:args={**args,'context':context}
            proc=subprocess.run(['marqdo','call',document,function,'--args-json','-','--json','--fs-root',context['workspace'],'--effects','plugin,fs.read,fs.write,process.exec,environment.read,time.read,random.read'],input=json.dumps(args),capture_output=True,text=True,timeout=620)
            outer=json.loads(proc.stdout);assert proc.returncode==0 and outer['ok'],{'operation':function,'failure':outer.get('error',{}).get('code')};return outer['result']
        def root(function,**args):
            result=call('/app/ext/root-skill/index.mq.md',function,args);assert result['ok'],{'operation':function,'failure':result.get('error',{}).get('code')};return result['value']
        scenario=call('/tmp/scenario.mq.md','scenario',{},False)
        uploads=base/'work/uploads';uploads.mkdir();(uploads/'source.py').write_text(scenario['source'])
        def knowledge(member,**args):
            result=call('/app/ext/knowledge/index.mq.md',member,args);assert result['ok'],{'operation':member,'failure':result.get('error',{})};return result['value']
        knowledge('prepare',title=scenario['title'],paths=['uploads/source.py'])
        root('begin',user_input=scenario['goal'],message_id=uuid.uuid4().hex)
        state=root('clarify_intent',summary=scenario['goal'],question=scenario['question'],choices=scenario['choices'])
        root('respond',revision=state['revision'],action='confirm_intent',choice=scenario['choices'][0])
        state=root('outline',title=scenario['title'],goal=scenario['goal'],acceptance=scenario['acceptance'],units=scenario['units'])
        root('respond',revision=state['revision'],action='confirm_outline')
        context.update(run_id=uuid.uuid4().hex,model_selection='builtin-smart')
        run=Path(context['root'])/'data/dialogue/proj/runtime'/context['run_id'];run.mkdir(parents=True,mode=0o700)
        request=run/'request.json';request.write_text(json.dumps({'context':context,'model':model,'child_models':{}}));request.chmod(0o600)
        actor=run/'actor.json';actor.write_text(json.dumps(context));actor.chmod(0o600)
        os.environ.update(QDAGENT_RUN_REQUEST_FILE=str(request),QDAGENT_ACTOR_FILE=str(actor))
        result=call('/app/ext/root-skill/index.mq.md','run',{})
        state=root('status')
        if state['phase']!='review':
            events=[json.loads(line) for log in Path(context['root']).rglob('events.ndjson') for line in log.read_text().splitlines()]
            evidence=[{'kind':e['kind'],'name':e['data'].get('name'),'status':e['data'].get('status'),'cause':e['data'].get('cause'),'result':e['data'].get('result')} for e in events if e['kind'].endswith(('tool_end','call_rejected','provider_failure','recovery'))]
            print(json.dumps({'phase':state['phase'],'status':result.get('status'),'evidence':evidence[-16:],'units':[{k:u.get(k) for k in ['id','status','trial','error','fragment']} for u in state['units']],'event_kinds':sorted(set(e['kind'] for e in events))},ensure_ascii=False))
            raise AssertionError('actual knowledge delivery did not reach review')
        state=root('respond',revision=state['revision'],action='accept')
        assert state['phase']=='complete'
        record=knowledge('publish');key=record['key']
        value=knowledge('execute',id=key,function='run',input=scenario['input'])
        assert value['result']=={'u0':scenario['expected']},value
        verified=knowledge('verify',id=key);assert verified['passed'],verified
        written=knowledge('execute',id=key,function='run',input=scenario['input'],write_back=True);assert written['write_back'],written
        assert 'marqdo-out' in knowledge('document',id=key)['source']
        print(json.dumps({'actual_model_authored':True,'published':True,'actual_result':value['result'],'frozen_cases_replayed':verified['replayed'],'actual_writeback':True,'isolation':'temporary container only'},ensure_ascii=False))


def host():
    resolver=['docker','exec','-i','qdagent-qdagent-1','marqdo','call','/app/pages/control/models.mq.md','resolve','--args-json','-','--fs-root','/app','--effects','plugin,fs.read,fs.write,environment.read','--json']
    resolved=json.loads(subprocess.check_output(resolver,input=json.dumps({'selection':'builtin-smart','principal':'agent-development'}),text=True));assert resolved['ok'] and resolved['result']['ok'];model=resolved['result']['value']
    if os.environ.get('QDAGENT_VERIFY_MODEL'):model['model']=os.environ['QDAGENT_VERIFY_MODEL']
    project=Path(__file__).resolve().parents[1]
    command=['docker','run','--rm','-i','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--user','10001:10001','--pids-limit','256','--memory','1g','--tmpfs','/tmp:uid=10001,gid=10001,mode=1777,size=128m','--tmpfs','/app/data:uid=10001,gid=10001,mode=0700,size=32m','-v',str(Path(__file__).resolve())+':/tmp/live.py:ro','-v',str(project/'tests/fixtures/knowledge-scenario.mq.md')+':/tmp/scenario.mq.md:ro','--entrypoint','python3','qdagent:local','/tmp/live.py','--inside']
    proc=subprocess.run(command,input=json.dumps(model),capture_output=True,text=True,timeout=680)
    if proc.returncode:
        evidence=proc.stdout[-7000:]+proc.stderr[-2000:]
        for name in ['key','api_key','token']:
            if isinstance(model.get(name),str) and model[name]:evidence=evidence.replace(model[name],'[redacted]')
        raise SystemExit('Isolated knowledge model acceptance failed: '+evidence)
    print(proc.stdout.strip())
if __name__=='__main__':inside() if '--inside' in sys.argv else host()
