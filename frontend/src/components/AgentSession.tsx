import {useState} from 'react'
import {Check, ChevronDown, CircleHelp, FileCode2, Layers3, LoaderCircle, Play, ShieldCheck, X} from 'lucide-react'
import type {Model, AgentResponse, AgentState, RunEvent} from '../api'

/**
 * Capability Agent V3 task projection. This component never constructs a plan,
 * infers authority from a model reply or knows the software-development stages.
 * All confirmations use the exact backend revision; they authorize the single
 * installed skill whose source digest is pinned in the pending gate.
 */
export function AgentSession({
 state, busy, readOnly=false, onRespond, onContinue
}:{
 state:AgentState
 models:Model[]
 busy:boolean
 readOnly?:boolean
 events:RunEvent[]
 onRespond:(response:AgentResponse)=>Promise<void>
 onPreview:(path:string)=>void
 onContinue:()=>void
}) {
 const [saving,setSaving]=useState(false)
 const [error,setError]=useState('')
 const pending=state.pending
 const complete=state.phase==='complete'
 const waiting=state.phase==='waiting_user' && pending?.kind==='effect_approval'
 async function respond(action:'approve'|'deny'){
  setError('')
  setSaving(true)
  try{await onRespond({revision:state.revision,action,answer:'',choice:action})}
  catch(e){setError(e instanceof Error?e.message:'确认未完成')}
  finally{setSaving(false)}
 }
 return <section className="root-workflow agent-capability" aria-label="Marqdo 能力智能体">
  <header className="root-heading">
   <span><Layers3 size={17}/>求道 · 能力智能体</span>
   <small>Marqdo Native · revision {state.revision}</small>
   {complete?<b><Check size={14}/>{state.status==='succeeded'?'已完成':'执行已结束'}</b>:
    waiting?<b><CircleHelp size={14}/>等待效果授权</b>:<b>按需执行</b>}
  </header>
  <div className="root-current">
   <p>{state.goal||'当前没有已提交的任务'}</p>
   {!!state.selected_skill&&<p><FileCode2 size={15}/>使用能力：<code>{state.selected_skill}</code></p>}
   {state.status==='incomplete'&&<p>任务尚未完成。可以继续查询证据或选择其他能力。</p>}
  </div>
  {waiting&&<div className="root-question">
   <div className="root-section-caption"><ShieldCheck size={16}/>已安装 SKILL 的效果授权</div>
   <h3>{pending.question||'是否批准本次能力调用？'}</h3>
   <p>能力：<code>{pending.skill}</code></p>
   <p>授权只适用于此能力和当前源码版本。源码改变后需要重新确认；拒绝不会执行工具。</p>
   <div className="root-actions">
    <button className="button" disabled={busy||saving||readOnly} onClick={()=>respond('deny')}><X size={15}/>拒绝</button>
    <button className="button primary" disabled={busy||saving||readOnly} onClick={()=>respond('approve')}>{saving?<LoaderCircle size={15} className="spin"/>:<ShieldCheck size={15}/>}批准本次执行</button>
   </div>
  </div>}
  {!!error&&<p role="alert" className="error-card">{error}</p>}
  {complete&&!!state.answer&&<details className="root-completed">
   <summary>最近一次实际结果 <ChevronDown size={14}/></summary>
   <p>{state.answer}</p>
  </details>}
  {!complete&&!waiting&&!busy&&!readOnly&&<div className="root-actions"><button className="button" onClick={onContinue}><Play size={14}/>继续当前任务</button></div>}
 </section>
}
