import {useEffect,useState} from 'react';
import {BarChart3,CheckCircle2,LoaderCircle,Save,ShieldCheck,Users} from 'lucide-react';
import {api,type Account,type AccountUsage,useResource} from '../api';
import {Dialog} from './Dialog';
import '../access.css';
type Policy={task_limit:number;smart_daily_limit:number};
type User={id:string;name:string;access:AccountUsage};
const limitLabel=(n:number)=>n<0?'不限额':String(n);
const roles:Record<string,string>={super_admin:'超级管理员',operator:'运维管理员',auditor:'审计员'};
export function AccessPanel({open,onClose,account,onRefresh}:{open:boolean;onClose:()=>void;account?:Account;onRefresh:()=>void}){
 const canAudit=account?.access.can_audit;
 const resource=useResource<{policy:Policy;users:User[];read_only:boolean}>(open&&canAudit?'/api/admin/access':null);
 const [policy,setPolicy]=useState<Policy>({task_limit:3,smart_daily_limit:50}),[busy,setBusy]=useState(''),[error,setError]=useState(''),[saved,setSaved]=useState('');
 useEffect(()=>{if(resource.data)setPolicy(resource.data.policy)},[resource.data]);
 useEffect(()=>{if(open){setError('');setSaved('')}},[open]);
 async function save(target:string,values:Policy){setBusy(target||'defaults');setError('');setSaved('');try{await api('/api/admin/access'+(target?'/users/'+target:''),{method:'PUT',body:JSON.stringify(values)});setSaved('额度已保存，下一次创建或请求立即生效。');resource.reload();onRefresh()}catch(e){setError((e as Error).message)}finally{setBusy('')}}
 const usage=account?.access;
 return <Dialog open={open} onClose={onClose} title={canAudit?'权限与用量管理':'我的用量'} description="知识由管理员维护，全站登录用户均可阅读和引用。" wide={!!canAudit}>
  <div className="access-panel">
   <div className="access-identity"><ShieldCheck size={23}/><div><strong>{account?.name||'求道用户'}</strong><span>{roles[usage?.role||'']||'普通用户'} · 身份来自统一认证</span></div><a className="text-button" href="/login">从身份站刷新身份</a></div>
   <div className="access-metrics"><article><span>未归档任务</span><strong>{usage?.active_tasks||0}<small> / {limitLabel(usage?.task_limit??3)}</small></strong><p>归档后释放名额，恢复时重新核对。</p></article><article><span>智能模型 · 今日</span><strong>{usage?.smart_used||0}<small> / {limitLabel(usage?.smart_daily_limit??50)}</small></strong><p>子智能体、重试均计入实际请求。</p></article><article><span>Qwen 3.5 · 4B 参数</span><strong>不限额</strong><p>共享本机算力，仍受服务并发限制。</p></article></div>
   <p className="access-reset"><BarChart3 size={15}/>每日额度于北京时间 00:00 重置；个人配置的模型服务不使用共享智能模型额度。</p>
   {error&&<p className="panel-error" role="alert">{error}</p>}{saved&&<p className="access-saved" role="status"><CheckCircle2 size={16}/>{saved}</p>}
   {canAudit&&<section className="access-admin"><header><Users size={19}/><h3>普通用户默认额度</h3>{resource.data?.read_only&&<span>只读审计</span>}</header>
    <p>修改不会删除已有任务。降低上限后，超额用户可以继续阅读与归档；新建和恢复会受到限制。-1 表示不限额，0 表示停止新增。</p>
    <div className="access-policy"><label>未归档任务上限<input type="number" min={-1} max={10000} value={policy.task_limit} disabled={!account?.access.can_manage} onChange={e=>setPolicy(p=>({...p,task_limit:Number(e.target.value)}))}/></label><label>智能模型每日请求<input type="number" min={-1} max={100000} value={policy.smart_daily_limit} disabled={!account?.access.can_manage} onChange={e=>setPolicy(p=>({...p,smart_daily_limit:Number(e.target.value)}))}/></label>{account?.access.can_manage&&<button className="button primary" disabled={!!busy} onClick={()=>save('',policy)}>{busy==='defaults'?<LoaderCircle className="spin" size={15}/>:<Save size={15}/>}保存默认额度</button>}</div>
    <h3>用户与实际用量</h3>{resource.loading&&!resource.data?<p>正在读取用户…</p>:resource.error?<p role="alert">{resource.error.message}</p>:<div className="access-users">{resource.data?.users.map(user=><UserLimits key={user.id} user={user} editable={!!account?.access.can_manage&&!user.access.can_manage} busy={busy===user.id} onSave={values=>save(user.id,values)}/>)}</div>}
   </section>}
  </div>
 </Dialog>;
}
function UserLimits({user,editable,busy,onSave}:{user:User;editable:boolean;busy:boolean;onSave:(policy:Policy)=>void}){
 const [limits,setLimits]=useState({task_limit:user.access.task_limit,smart_daily_limit:user.access.smart_daily_limit});
 useEffect(()=>setLimits({task_limit:user.access.task_limit,smart_daily_limit:user.access.smart_daily_limit}),[user.access.task_limit,user.access.smart_daily_limit]);
 return <article className="access-user"><div className="access-user-name"><strong>{user.name}</strong><small>{roles[user.access.role]||'普通用户'} · {user.access.active_tasks} 个任务 · 今日 {user.access.smart_used} 次请求</small></div><label>任务<input aria-label={user.name+'的任务上限'} type="number" min={-1} max={10000} disabled={!editable} value={limits.task_limit} onChange={e=>setLimits(v=>({...v,task_limit:Number(e.target.value)}))}/></label><label>每日请求<input aria-label={user.name+'的每日请求上限'} type="number" min={-1} max={100000} disabled={!editable} value={limits.smart_daily_limit} onChange={e=>setLimits(v=>({...v,smart_daily_limit:Number(e.target.value)}))}/></label>{editable&&<button className="button" disabled={busy} onClick={()=>onSave(limits)}>{busy?'保存中':'保存'}</button>}</article>;
}
