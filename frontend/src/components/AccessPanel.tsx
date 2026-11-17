import {useEffect,useState} from 'react';
import type {ReactNode} from 'react';
import {Box,CheckCircle2,Info,Layers,LoaderCircle,RefreshCw,Save,ShieldCheck,Sparkles} from 'lucide-react';
import {api,type Account,type AccountUsage,useResource} from '../api';
import {Dialog} from './Dialog';
import '../access.css';

type Policy={task_limit:number;smart_daily_limit:number};
type User={id:string;name:string;access:AccountUsage};
const limitLabel=(n:number)=>n<0?'不限额':String(n);
const roles:Record<string,string>={super_admin:'超级管理员',operator:'运维管理员',auditor:'审计员'};

function QuotaMetric({title,used,limit,icon}:{title:string;used:number;limit:number;icon:ReactNode}){
 return <article><header>{icon}<span>{title}</span></header><strong>{used}<small> / {limitLabel(limit)}</small></strong>{limit>0?<progress value={Math.min(used,limit)} max={limit} aria-label={title+'已用额度'}/>:<p>{limit<0?'当前账户不限额':'当前停止新增'}</p>}</article>;
}
export function AccessPanel({open,onClose,account,onRefresh}:{open:boolean;onClose:()=>void;account?:Account;onRefresh:()=>void}){
 const canAudit=account?.access.can_audit;
 const resource=useResource<{policy:Policy;users:User[];read_only:boolean}>(open&&canAudit?'/api/admin/access':null);
 const [policy,setPolicy]=useState<Policy>({task_limit:3,smart_daily_limit:50}),[busy,setBusy]=useState(''),[error,setError]=useState(''),[saved,setSaved]=useState('');
 useEffect(()=>{if(resource.data)setPolicy(resource.data.policy)},[resource.data]);
 useEffect(()=>{if(open){setError('');setSaved('')}},[open]);
 async function save(target:string,values:Policy){
  setBusy(target||'defaults');setError('');setSaved('');
  try{await api('/api/admin/access'+(target?'/users/'+target:''),{method:'PUT',body:JSON.stringify(values)});setSaved('额度已保存，下一次创建或请求立即生效。');resource.reload();onRefresh()}
  catch(e){setError((e as Error).message)}finally{setBusy('')}
 }
 const usage=account?.access;
 return <Dialog open={open} onClose={onClose} title={canAudit?'权限与用量':'我的用量'} description="统一身份管理 · 额度实时生效" className="access-dialog" eyebrow={<><ShieldCheck size={21}/>{canAudit?'管理控制台':'我的账户'}</>} wide={!!canAudit}>
  <div className="access-panel">
   <div className="access-identity"><span className="access-avatar">{(account?.name||'求道').slice(0,1)}</span><strong>{account?.name||'求道用户'}</strong><span className="access-role">{roles[usage?.role||'']||'普通用户'}</span><a href="/login"><RefreshCw size={16}/><span>从身份站刷新身份</span></a></div>
   <div className="access-metrics">
    <QuotaMetric title="未归档任务" used={usage?.active_tasks||0} limit={usage?.task_limit??3} icon={<Layers size={20}/>}/>
    <QuotaMetric title="智能模型 · 今日" used={usage?.smart_used||0} limit={usage?.smart_daily_limit??50} icon={<Sparkles size={20}/>}/>
    <article><header><Box size={20}/><span>Qwen 3.5 · 4B</span><small>本机模型</small></header><strong>不限额</strong><p>4B 参数 · 共享本机算力</p></article>
   </div>
   <p className="access-reset"><Info size={16}/><span>北京时间 00:00 重置 · 子智能体与重试计入实际请求。</span></p>
   {error&&<p className="panel-error" role="alert">{error}</p>}{saved&&<p className="access-saved" role="status"><CheckCircle2 size={16}/>{saved}</p>}
   {canAudit?<section className="access-admin">
    <div className="access-defaults"><header><h3>普通用户默认额度</h3>{resource.data?.read_only&&<span className="access-role">只读审计</span>}</header><p>设置普通用户的默认任务与智能请求额度，也可在下方为单个用户单独调整。</p>
     <form className="access-policy" onSubmit={e=>{e.preventDefault();void save('',policy)}}>
      <label>任务上限<input aria-label="未归档任务上限" required type="number" min={-1} max={10000} value={policy.task_limit} disabled={!account?.access.can_manage||!resource.data} onChange={e=>setPolicy(p=>({...p,task_limit:Number(e.target.value)}))}/></label>
      <label>每日智能请求<input aria-label="智能模型每日请求" required type="number" min={-1} max={100000} value={policy.smart_daily_limit} disabled={!account?.access.can_manage||!resource.data} onChange={e=>setPolicy(p=>({...p,smart_daily_limit:Number(e.target.value)}))}/></label>
      {account?.access.can_manage&&<button className="button primary" disabled={!!busy||!resource.data}>{busy==='defaults'?<LoaderCircle className="spin" size={15}/>:<Save size={15}/>}保存默认额度</button>}
     </form>
    </div>
    <h3 className="access-users-heading">用户与用量</h3>
    {resource.loading&&!resource.data?<p className="access-loading">正在读取用户…</p>:resource.error?<p role="alert">{resource.error.message}<button className="text-button" onClick={resource.reload}>重新读取</button></p>:<div className="access-users"><div className="access-table-head" aria-hidden="true"><span>用户</span><span>身份</span><span>未归档任务 / 上限</span><span>今日智能请求 / 上限</span><span>操作</span></div>{resource.data?.users.map(user=><UserLimits key={user.id} user={user} editable={!!account?.access.can_manage&&!user.access.can_manage} pending={!!busy} busy={busy===user.id} onSave={values=>save(user.id,values)}/>)}</div>}
    <p className="access-footnote">-1 不限额，0 停止新增。降低额度不会删除已有内容，归档后释放任务名额。</p>
   </section>:<p className="access-personal-note">归档任务可以释放名额。公用知识库面向所有登录用户开放；个人模型服务不占用共享智能模型额度。</p>}
  </div>
 </Dialog>;
}
function UserLimits({user,editable,pending,busy,onSave}:{user:User;editable:boolean;pending:boolean;busy:boolean;onSave:(policy:Policy)=>void}){
 const [limits,setLimits]=useState({task_limit:user.access.task_limit,smart_daily_limit:user.access.smart_daily_limit});
 useEffect(()=>setLimits({task_limit:user.access.task_limit,smart_daily_limit:user.access.smart_daily_limit}),[user.access.task_limit,user.access.smart_daily_limit]);
 return <form className="access-user" onSubmit={e=>{e.preventDefault();onSave(limits)}}><div className="access-user-name"><span className="access-user-avatar">{user.name.slice(0,1)}</span><div><strong>{user.name}</strong><small>{user.access.active_tasks} 个未归档任务 · 今日 {user.access.smart_used} 次智能请求</small></div></div><span className="access-role">{roles[user.access.role]||'普通用户'}</span><label><span>{user.access.active_tasks} /</span><input aria-label={user.name+'的任务上限'} required type="number" min={-1} max={10000} disabled={!editable||pending} value={limits.task_limit} onChange={e=>setLimits(v=>({...v,task_limit:Number(e.target.value)}))}/></label><label><span>{user.access.smart_used} /</span><input aria-label={user.name+'的每日请求上限'} required type="number" min={-1} max={100000} disabled={!editable||pending} value={limits.smart_daily_limit} onChange={e=>setLimits(v=>({...v,smart_daily_limit:Number(e.target.value)}))}/></label>{editable?<button className="access-row-save" disabled={pending}>{busy?'保存中':'保存'}</button>:<span className="access-readonly">{user.access.can_manage?'不限额':'只读'}</span>}</form>;
}
