import { useCallback, useEffect, useRef, useState } from 'react';
export class APIError extends Error { constructor(public status:number,message:string){super(message)} }
export async function api<T>(path:string,init:RequestInit={}):Promise<T>{
 const response=await fetch(path,{credentials:'same-origin',...init,headers:{...(init.body instanceof FormData?{}:{'Content-Type':'application/json'}),...init.headers}});
 if(!response.ok){let message=`请求失败（${response.status}）`;try{const body=await response.json();message=body.error?.message||message}catch{}if(response.status===401)window.dispatchEvent(new Event('qd:auth-expired'));throw new APIError(response.status,message)}
 return response.json() as Promise<T>;
}
export function useResource<T>(path:string|null,interval=0){
 const [value,setValue]=useState<{path:string;data?:T;error?:Error;loading:boolean}>({path:'',loading:false});const [revision,setRevision]=useState(0);
 const reload=useCallback(()=>setRevision(v=>v+1),[]);
 useEffect(()=>{if(!path)return;const controller=new AbortController();setValue(old=>({path,data:old.path===path?old.data:undefined,loading:true}));
 api<T>(path,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setValue({path,data,loading:false})}).catch(error=>{if(!controller.signal.aborted)setValue(old=>({path,data:error instanceof APIError&&error.status===401?undefined:old.path===path?old.data:undefined,error,loading:false}))});return()=>controller.abort();
 },[path,revision]);
 useEffect(()=>{if(!interval||!path)return;const timer=setInterval(reload,interval);return()=>clearInterval(timer)},[interval,path,reload]);
 return {...(value.path===path?value:{data:undefined,error:undefined,loading:!!path}),reload};
}
export interface Task {archived_ms?:number;id:string;title:string;status:string;created_ms:number}
export interface AccountUsage {role:string;can_manage:boolean;can_audit:boolean;task_limit:number;active_tasks:number;smart_daily_limit:number;smart_used:number;smart_remaining:number;resets_at:string}
export interface Account {name:string;access:AccountUsage}
export interface Model {id:string;label:string;model:string;protocol:string;endpoint?:string;builtin:boolean;has_key:boolean;thinking:boolean;notice?:string}
export interface Plugin {id:string;name:string;description:string;version:string;builtin:boolean;enabled:boolean;available:boolean;modules?:string[]}
export interface Message {turn:number;question:string;answer:string;run_id:string;status:string}
export interface Run {id:string;task_id:string;status:string;answer:string;question:string;model:string;created_ms:number}
export interface RunEvent {seq:number;run_id:string;kind:string;data:Record<string,unknown>;created_ms:number}
export interface Plan {goal:string;acceptance:string;steps:{id:number;title:string;status:string;evidence?:string}[]}
export interface WorkspaceFile {path:string;name:string;size:number;modified_ms:number}
export interface Artifact {id:string;title:string;kind:string;path:string;source:string;bytes:number;group_id?:string;theme?:{id:string;label:string;tagline?:string;transition?:string};pdf?:{path:string;id:string}}
export interface SkillRoute {mode:string;document:string;function:string;label:string}
export interface IntentTask {id:string;title:string;purpose:string;mode:string;route:SkillRoute;artifact_kind?:string;office_route?:Pick<SkillRoute,'label'|'document'|'function'>}
export interface Decision {actor?:string;action?:string;text?:string;choice?:string;question?:string;summary?:string;revision?:number}
export interface StageRecord {phase:string;revision:number;goal?:string;title?:string;summary?:string;acceptance?:string;pending?:RootState["pending"];units?:RootUnit[];intent_tasks?:IntentTask[];settings?:RootState["settings"];history?:Decision[];decision?:Decision;document?:{path:string;sha256:string}}
export interface RootUnit {intent_id?:string;route?:SkillRoute;function?:string;artifact?:{path:string;sha256:string};tests?:{count:number;sha256:string;kind?:string};trial?:{passed:boolean;assurance:string;suite_sha256?:string};specification?:{path:string;executable_statements:number};id:string;title:string;purpose:string;mode?:string;depends_on?:string[];status:string;path?:string;sha256?:string}
export interface RootState {artifact_kind?:string;intent_tasks?:IntentTask[];stage_history?:StageRecord[];history?:Decision[];workbook?:{path:string;outline_sha256:string};revision:number;phase:string;goal:string;title?:string;acceptance?:string;summary?:string;units:RootUnit[];draft_units?:RootUnit[];settings:{office_themes?:string[];expected_units?:number;concurrency:number;child_model:string;test_model?:string;unit_models:Record<string,string>};pending?:{kind:string;question?:string;summary?:string;choices?:string[];path?:string;stubs?:unknown[]};delivery?:{path:string};delivery_status?:string}
export interface RootResponse {office_themes?:string[];expected_units?:number;revision:number;action:string;answer:string;choice:string;concurrency:number;child_model:string;test_model?:string;unit_models:Record<string,string>;accept_stubs:boolean}
export interface Files {workflow?:RootState;files:WorkspaceFile[];plan?:Plan;artifacts?:Artifact[];children?:{id:string;role:string;goal:string;status:string}[]}
export interface Preview {kind:string;filename:string;title:string;source?:string;html?:string}
export function useRun(id:string,onDone:()=>void){
 const [state,setState]=useState<{id:string;events:RunEvent[];answer:string;status:string;connection:string}>({id:'',events:[],answer:'',status:'',connection:''});const done=useRef(onDone);done.current=onDone;
 useEffect(()=>{if(!id)return;let alive=true;const seen=new Set<number>();setState({id,events:[],answer:'',status:'running',connection:'connecting'});const source=new EventSource(`/api/runs/${encodeURIComponent(id)}/events`,{withCredentials:true});
 source.onopen=()=>{if(alive)setState(s=>({...s,connection:'connected'}))};
 source.addEventListener('update',raw=>{if(!alive)return;let event:RunEvent;try{event=JSON.parse((raw as MessageEvent).data)}catch{return}if(seen.has(event.seq))return;seen.add(event.seq);
 setState(s=>{if(s.id!==id)return s;let answer=s.answer,status=s.status;if(event.kind==='text_delta')answer+=String(event.data.text||'');if(event.kind==='answer_reset')answer='';if(event.kind==='final'){answer=String(event.data.answer||'');status=String(event.data.status||status)}if(event.kind==='status'&&event.data.status)status=String(event.data.status);return {...s,events:[...s.events,event],answer,status,connection:'connected'}})});
 source.addEventListener('complete',raw=>{source.close();if(alive){let terminal:Record<string,unknown>={};try{terminal=JSON.parse((raw as MessageEvent).data)}catch{}setState(s=>({...s,status:typeof terminal.status==='string'?terminal.status:s.status,answer:typeof terminal.answer==='string'?terminal.answer:s.answer,connection:'complete'}));done.current()}});
 source.onerror=()=>{if(alive)setState(s=>({...s,connection:'reconnecting'}))};return()=>{alive=false;source.close()};
 },[id]);return state.id===id?state:{id,events:[],answer:'',status:'',connection:''};
}
export const statusText:Record<string,string>={recorded:'已记录',retrying:'已安排重试',waiting_service:'等待文字识别',waiting_user:'等待你的回应',written:'已校验',running:'进行中',succeeded:'已完成',failed:'未完成',cancelled:'已停止',interrupted:'已中断',incomplete:'待继续',answer_only:'已回复',idle:'未开始',ready:'未开始',completed:'已完成',pending:'待开始'};
export function sizeLabel(n:number){return n>=1048576?`${(n/1048576).toFixed(1)} MB`:n>=1024?`${Math.ceil(n/1024)} KB`:`${n} B`}
