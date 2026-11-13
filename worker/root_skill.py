"""Host orchestration for the executable root skill.

State transitions, authoring and acceptance belong to Marqdo. This module supplies
bounded model concurrency, schema projection and resumable human waiting only.
"""
from __future__ import annotations
import copy
import hashlib
import json
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT_SOURCE = 'ext/root-skill/index.mq.md'
ROOT_EFFECTS = 'plugin,fs.read,fs.write,process.exec,environment.read'
MEMBERS = {'skill_intent':'clarify_intent','skill_outline':'outline','skill_refine':'refine','skill_integrate':'integrate','skill_status':'status'}


def array_items(name):
    if name == 'units':
        return {'type':'object','properties':{'id':{'type':'string'},'title':{'type':'string'},'purpose':{'type':'string'},'depends_on':{'type':'array','items':{'type':'string'}}},'required':['id','title','purpose'],'additionalProperties':False}
    if name == 'cases':
        return {'type':'object','properties':{'input':{},'expected':{}},'required':['input','expected'],'additionalProperties':False}
    if name == 'sections':
        return {'type':'object','properties':{'heading':{'type':'string'},'body':{'type':'string'}},'required':['heading','body'],'additionalProperties':False}
    return {'type':'string'}


class RootSkill:
    def __init__(self, request, cli, stream_model, emit, enabled):
        self.request=request
        self.context=request['context']
        self.project=Path(self.context['project'])
        self.workspace=Path(self.context['workspace'])
        self.cli=cli;self.stream_model=stream_model;self.emit=emit;self.enabled=enabled
        self.schemas={}

    def invoke(self, member, arguments=None, context=None):
        for attempt in range(6):
            if not self.enabled(self.project,self.request['owner'],'root-skill'):
                raise RuntimeError('根 SKILL 已停用；已有文件与确认记录保留。')
            result=self.cli(self.project,ROOT_SOURCE,member,Path((context or self.context)['workspace']),{**(arguments or {}),'context':context or self.context},ROOT_EFFECTS)
            if not isinstance(result,dict) or result.get('ok') is not True:
                error=result.get('error',{}) if isinstance(result,dict) else {}
                message=error.get('message','根 SKILL 未返回成功记录') if isinstance(error,dict) else str(error)
                if 'root_skill.conflict' in message and attempt<5:
                    time.sleep(.025*(attempt+1));continue
                raise RuntimeError(str(message)[:16000])
            return result['value']
        raise RuntimeError('根流程版本冲突，请重新读取当前状态。')

    def state(self):
        return self.invoke('status')

    def schema(self, member):
        if member not in self.schemas:
            extracted=self.invoke('schema',{'function':member})
            contract=extracted.get('contract') or {}
            properties={}
            kinds={'text':'string','map':'object','list':'array','number':'number','bool':'boolean'}
            for param in contract.get('params',[]):
                name=param['name']
                if name=='context':continue
                field={'description':param.get('desc','')}
                if param['type'] in kinds:field['type']=kinds[param['type']]
                if field.get('type')=='array':field['items']=array_items(name)
                properties[name]=field
            self.schemas[member]={'type':'object','properties':properties,'required':list(properties),'additionalProperties':False}
        return copy.deepcopy(self.schemas[member])

    def filter_specs(self, specs):
        policy=self.invoke('policy');allowed=set(policy['allowed_tools']);out=[]
        for spec in specs:
            if spec['id'] not in allowed:continue
            item=copy.deepcopy(spec)
            if item['id'] in MEMBERS:item['input_schema']=self.schema(MEMBERS[item['id']])
            out.append(item)
        return out

    def guide(self, phase):
        name={'intent':'intent','outline':'outline','refine':'refinement','implement':'integration'}.get(phase,'intent')
        path=self.project/'ext/root-skill/guides'/(name+'.mq.md')
        return path.read_text()[:14000] if path.is_file() else ''

    def prompt(self, state):
        public={k:state.get(k) for k in ['phase','goal','summary','acceptance','settings','history']}
        public['units']=[{k:u.get(k) for k in ['id','title','purpose','depends_on','status','path']} for u in state.get('units',[])]
        return ('\n根 SKILL 是必须执行的程序，不是建议。用户确认只能通过界面操作，模型无此工具。'
                '当前阶段不可跳过，不得把完成口头描述当成函数执行。整合阶段已有单元经过真实检查与试运行；请优先调用 skill_integrate 形成入口，无需重复调用不存在的 run 函数。单元函数名固定为 unit_ 加单元身份；只有整合后的 index 才有 run。确需外部产物时才调用对应登记工具。\n当前真实状态：'+json.dumps(public,ensure_ascii=False)+'\n当前阶段的工程文档：\n'+self.guide(state.get('phase')))

    def waiting(self, state):
        pending=state.get('pending') or {}
        if not pending:return None
        kind=pending['kind']
        if kind=='intent':return '我对目标的理解是：'+str(pending.get('summary',''))+'\n\n'+pending['question']+'\n\n请在下方选择或补充。你可以继续澄清，也可以确认意图后进入基本方案。'
        if kind=='outline':return '基本方案已写入 `solution/plan.mq.md`，右侧展示的是实际文稿。请核对函数边界、交付与验收条件，再选择并发数和子模型。确认后才会开始细化。'
        return '完整方案已保存到 `solution/index.mq.md`，包含实现、用户交流和真实验证结果。请阅读右侧文稿并验收；尚未接通的部分会单独列出。'

    def fallback(self, state):
        phase=state['phase']
        if phase=='intent':
            member='clarify_intent';name='skill_intent'
            arguments={'summary':state['goal'],'question':'为了对齐目标，以上理解是否符合你的预期？你也可以补充使用场景、交付形式与验收要求。','choices':['按以上目标推进','调整目标或交付形式','先补充背景与约束']}
        elif phase=='outline':
            member='outline';name='skill_outline'
            arguments={'title':'待确认的工程框架','goal':state['goal'],'acceptance':'用户核对真实文稿、运行结果和明确披露的限制后验收。','units':[{'id':'main_work','title':'目标实现','purpose':state['goal'],'depends_on':[]}]}
        elif phase=='implement':
            member='integrate';name='skill_integrate'
            narrative=('本次整合由根流程根据已经确认的框架与实际单元证据生成，不代表模型提供了额外的业务论证。'
                '用户目标：'+state['goal']+'。验收条件：'+state['acceptance']+'。'
                '每个单元使用真实作者模板或经过检查的函数体形成源码，声明案例已在隔离工作目录中执行。'
                '入口按已确认的顺序调用各单元，输入中的 request 来自调用者，dependencies 只取自框架声明的前置单元实际返回。'
                '并行细化只并行编写和验证，整合入口按依赖顺序执行；不会把单元完成的消息冒充未发生的网络或文件操作。'
                '用户的提问、选项、补充与确认保留在工程文稿和独立交流记录中，阅读它们不产生新的执行权限。'
                '整合再次核对源码摘要、调用官方检查，并实际运行入口冒烟；通过仅证明这次调用能运行，不能代替事实核验和全部业务场景。'
                '如存在尚未接通的操作，必须在可见描述中披露，接受后也只能标为部分完成。最终用户应阅读实现、案例、来源与限制后决定验收或返工。'
                '本轮主模型没有提交整合工具调用，宿主仅调用这项既定整合函数，未以模型文字补造执行收据。')
            arguments={'narrative':narrative}
        else:raise RuntimeError('模型未完成当前阶段要求的可调用操作，不能把本轮标为完成。')
        identifier='root-fallback-'+phase
        self.emit('tool_start',id=identifier,name=name,arguments=arguments)
        result=self.invoke(member,arguments)
        self.emit('tool_end',id=identifier,name=name,status='succeeded',result={'phase':result['phase'],'revision':result['revision'],'pending':result.get('pending')})
        return result

    def _valid(self, unit):
        if unit.get('status')!='ready' or not (unit.get('trial') or {}).get('passed'):return False
        try:
            path=(self.workspace/unit['path']).resolve()
            return path.is_relative_to(self.workspace.resolve()) and hashlib.sha256(path.read_bytes()).hexdigest()==unit.get('sha256')
        except (OSError,KeyError):return False

    def refine(self):
        state=self.invoke('refine')
        if state.get('phase')!='refine':return state
        units=[unit for unit in state['units'] if not self._valid(unit)]
        settings=state['settings'];limit=int(settings['concurrency'])
        if not 1<=limit<=8:raise RuntimeError('并发配置超出授权范围')
        self.emit('parallel_start',count=len(units),concurrency=limit)
        failures=[]
        with ThreadPoolExecutor(max_workers=min(limit,max(1,len(units))),thread_name_prefix='root-unit') as pool:
            futures={pool.submit(self._child,unit,state):unit for unit in units}
            for future in as_completed(futures):
                unit=futures[future]
                try:future.result()
                except Exception as error:
                    failures.append(unit['id'])
                    message=str(error)[:500] if isinstance(error,RuntimeError) else '子智能体执行环境异常'
                    self.emit('child_end',id=unit['id'],title=unit['title'],status='failed',message=message)
        self.emit('parallel_end',failed=failures,status='failed' if failures else 'succeeded')
        if failures:raise RuntimeError('这些单元尚未通过校验和试运行：'+', '.join(failures)+'。已有证据保留，可继续修复。')
        return self.invoke('refine')

    def _child(self, unit, state):
        identifier=unit['id'];settings=state['settings']
        model_id=(settings.get('unit_models') or {}).get(identifier) or settings.get('child_model','inherit')
        if model_id=='inherit':config=self.request['model'];model_label=self.context.get('model_selection','inherit')
        else:
            config=(self.request.get('child_models') or {}).get(model_id)
            model_label=model_id
            if not config:raise RuntimeError('所选子模型没有经过宿主授权，未启动')
        context={**self.context,'unit_id':identifier,'tool_ids':'list_files,read_file,file_info,search_files,read_library,call_library,http_get'}
        self.emit('child_start',id=identifier,title=unit['title'],model=model_label,status='running')
        source=(self.project/'ext/root-skill/authoring.mq.md').read_text()
        contract='\n'.join('## '+member+'\n'+source.split('## '+member+'\n',1)[1].split('\nUse ',1)[0] for member in ['author_text','author_select'])
        tool={'id':'author_unit','description':'为当前单元生成合法文稿；literal 填原始值（勿先JSON编码）；select 的 value 填键路径数组（如 ["request","text"]）读取实际输入；code 写真实业务函数体；必须说明来源与限制并提供试运行案例。','input_schema':self.schema('author_unit')}
        author_tools=[{'id':'author_text','description':'生成始终返回固定正文的真实函数；content 直接写文本，勿JSON编码或模拟返回。','input_schema':self.schema('author_text')},{'id':'author_select','description':'生成按键路径读取输入的真实函数；path 是字符串数组，如 ["request","text"]。','input_schema':self.schema('author_select')},tool]
        read_specs=self.cli(self.project,'pages/agent/catalog.mq.md','tools',self.project,{'principal':self.request['owner']},'plugin,fs.read,fs.write,environment.read')
        reads=[s for s in read_specs if s['id'] in context['tool_ids'].split(',')]
        system=('你是求道的受限细化子智能体，只能实现一个已确认单元，不能改变框架或派生其他智能体。固定文字必须优先调用 author_text，只有计算或复杂处理才需要 author_unit。'
                '你必须通过模型原生工具调用 author_text、author_select 或 author_unit（tool_calls）提交参数，不能在回复正文里模拟工具返回、JSON收据或错误。说明文档只是工具的手册，你不是手册函数内部的解释器。只读任务确实需要的材料；不捏造研究或完成证据。'
                '每次 author_unit 后宿主都会自动执行 trial_unit。根据真实诊断修复，全部案例通过才完成。'
                'input 是包含 request 和 dependencies 的记录。literal 仅适合有来源的固定文稿或结构化数据，不能用假数据代替计算或检索。'
                '优先使用 select 模板读取字段，避免手写语法；literal 的 value 是原始对象或文本，不是编码后的JSON字符串。code 模式可用 math/table/text/json/fs/re/hash，保留充分叙述。不会语法时用 literal 或阅读手册，再查诊断。'
                '\n当前单元：'+json.dumps({k:unit.get(k) for k in ['id','title','purpose','depends_on']},ensure_ascii=False)+
                '\n真实意图与用户交流：'+json.dumps({'summary':state.get('summary'),'history':state.get('history',[])[-10:]},ensure_ascii=False)+'\n用户确认目标：'+state['goal']+'\n验收：'+state['acceptance']+'\n工程指南：\n'+self.guide('refine')+'\n真实作者函数说明：\n'+contract)
        messages=[{'role':'system','content':system},{'role':'user','content':'实现当前单元 '+identifier+'。固定文本直接调用 author_text 的 content；取值用 author_select 的 path；计算用 author_unit 的 code。不要把工具调用写进回答正文。unit_id 必须为 '+identifier+'。'}]
        for decision in range(8):
            if not self.enabled(self.project,self.request['owner'],'ai') or not self.enabled(self.project,self.request['owner'],'root-skill'):
                raise RuntimeError('模型或根 SKILL 已停用')
            self.emit('child_model_start',id=identifier,step=decision+1,model=model_label)
            def child_emit(kind,**data):self.emit('child_update',id=identifier,event=kind,**data)
            content,reasoning,calls=self.stream_model(config,messages,[*author_tools,*reads],emit_event=child_emit)
            self.emit('child_model_end',id=identifier,step=decision+1,status='succeeded')
            if not calls:
                messages.append({'role':'assistant','content':content})
                messages.append({'role':'user','content':'此单元尚未有通过试运行的代码。必须真实调用 author_text、author_select 或 author_unit，不能模拟工具结果或只回复说明。'})
                continue
            assistant={'role':'assistant','content':content or None,'tool_calls':calls}
            if reasoning and config['protocol']=='ollama':assistant['thinking']=reasoning
            messages.append(assistant)
            for call in calls:
                name=call['function']['name'];arguments=call['function'].get('arguments',{})
                try:
                    arguments=json.loads(arguments) if isinstance(arguments,str) else arguments
                    if not isinstance(arguments,dict):raise RuntimeError('参数必须是记录')
                    self.emit('child_tool_start',id=identifier,name=name,arguments=arguments)
                    if name in ('author_unit','author_text','author_select'):
                        result=self.invoke(name,arguments,context)
                        trial=self.invoke('trial_unit',{'unit_id':identifier},context)
                        own=next(u for u in trial['units'] if u['id']==identifier)
                        result={'status':own['status'],'check':own.get('check'),'trial':own.get('trial'),'path':own.get('path')}
                        self.emit('child_tool_end',id=identifier,name=name,status='succeeded' if own['status']=='ready' else 'failed',result=result)
                        if own['status']=='ready':
                            self.emit('child_end',id=identifier,title=unit['title'],model=model_label,status='succeeded',path=own['path'])
                            return
                    elif name in context['tool_ids'].split(','):
                        result=self.cli(self.project,'pages/agent/executor.mq.md','execute',Path(context['root']),{'name':name,'arguments':arguments,'context':context,'run_id':self.request['run_id']+'-child-'+identifier,'step':decision*20+len(messages)},'plugin,fs.read,fs.write,process.exec,time.read,random.read,environment.read,network.read,network.write')
                        self.emit('child_tool_end',id=identifier,name=name,status='failed' if isinstance(result,dict) and result.get('ok') is False else 'succeeded',result=result)
                    else:raise RuntimeError('未登记的子智能体工具，不执行')
                except RuntimeError as error:
                    result={'ok':False,'error':{'message':str(error)[:12000]}}
                    self.emit('child_tool_end',id=identifier,name=name,status='failed',result=result)
                messages.append({'role':'tool','name':name,'tool_call_id':call['id'],'content':json.dumps(result,ensure_ascii=False)[:20000]})
                if name=='author_unit' and (result.get('status')!='ready'):
                    messages.append({'role':'user','content':'修复提示：若业务是返回已提供的固定正文，请直接调用 author_text(unit_id,narrative,content,cases)，content 填该正文，不需要再写 code、mode、value 或 Markdown 标题。读取字段用 author_select。计算与其他操作才保留通用 author_unit，不得把业务改成固定假结果。'})
        raise RuntimeError('子智能体达到八轮上限，仍未取得有效试运行证据')
