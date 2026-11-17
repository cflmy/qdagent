import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowUpRight,BookOpen,Check,FileText,FlaskConical,LoaderCircle,Plus,Search,Upload,X} from 'lucide-react';
import {api,type Model,useResource} from '../api';
export interface KnowledgeEntry{id:string;key?:string;name:string;status?:string;functions?:string[];task?:string;compiled_at?:number;sources?:{path:string;sha256:string;chunks:{page:number;path?:string}[]}[]}
export interface KnowledgeDraft{task:string;title:string;phase:string;document?:string}
const phases:Record<string,string>={intent:'等待意图确认',outline:'等待框架确认',refine:'函数段编译中',implement:'方案落地中',review:'等待你的验收',complete:'已验收，可发布'};

export function KnowledgeLibrary({models,selected,onUse,onOpenTask}:{models:Model[];selected:string;onUse:(id:string)=>void;onOpenTask:(id:string)=>void}){
 const library=useResource<{sources:KnowledgeEntry[];compilations:KnowledgeDraft[];can_manage:boolean}>('/api/knowledge',5000);
 const [creating,setCreating]=useState(false),[search,setSearch]=useState(''),[files,setFiles]=useState<File[]>([]),[title,setTitle]=useState(''),[model,setModel]=useState('builtin-smart'),[busy,setBusy]=useState(''),[error,setError]=useState(''),[task,setTask]=useState('');
 const picker=useRef<HTMLInputElement>(null);
 const canManage=library.data?.can_manage===true;
 useEffect(()=>{const options=models;if(options?.length&&!options.some(m=>m.id===model))setModel(options.find(m=>!m.notice)?.id||options[0].id)},[models,model]);
 async function compile(){
  if(!title.trim()||!files.length||files.length>8){setError('填写名称，并选择一至八份材料。');return}
  if(files.some(f=>f.size>(/\.pdf$/i.test(f.name)?50:1)*1024*1024)){setError('PDF 单份上限 50 MB，源码单份上限 1 MB；请先拆分过大的材料。');return}
  setBusy('创建编译任务');setError('');
  try{
   const t=await api<{id:string}>('/api/tasks',{method:'POST',body:JSON.stringify({title:'知识编译 · '+title.trim()})});setTask(t.id);
   const paths:string[]=[];
   for(const file of files){setBusy('正在上传 '+file.name);const data=new FormData();data.append('file',file);const response=await api<{path:string}>('/api/tasks/'+encodeURIComponent(t.id)+'/uploads',{method:'POST',body:data});paths.push(response.path)}
   setBusy('提取来源与建立分段计划');
   const prepared=await api<{goal:string}>('/api/tasks/'+encodeURIComponent(t.id)+'/knowledge/prepare',{method:'POST',body:JSON.stringify({title:title.trim(),paths})});
   setBusy('启动根 SKILL，等待意图确认');
   await api('/api/tasks/'+encodeURIComponent(t.id)+'/runs',{method:'POST',body:JSON.stringify({question:prepared.goal,model,knowledge:''})});
   onOpenTask(t.id);
  }catch(e){setError((e as Error).message)}finally{setBusy('')}
 }
 async function publish(d:KnowledgeDraft){
  setBusy(d.task);setError('');
  try{await api('/api/tasks/'+encodeURIComponent(d.task)+'/knowledge/publish',{method:'POST',body:'{}'});library.reload()}catch(e){setError((e as Error).message)}finally{setBusy('')}
 }
 const entries=(library.data?.sources||[]).filter(e=>e.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
 const drafts=(library.data?.compilations||[]).filter(d=>d.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
 return <section className="knowledge-library" aria-label="公用知识库">
  <header className="library-heading"><div><p className="eyebrow">KNOWLEDGE, READY TO USE</p><h1>{creating?'编译新的知识':'公用知识库'}</h1><p>{creating?'从原始材料开始，逐段实现、验证，再沉淀为自己的知识。':'管理员编译并验证，全站共同使用。选择知识用于任务，或打开原生文稿深入阅读。'}</p></div>
   {canManage&&<button className="button primary" onClick={()=>{setCreating(v=>!v);setError('')}}>{creating?<><ArrowLeft size={16}/>返回知识库</>:<><Plus size={16}/>编译新知识</>}</button>}
  </header>
  {error&&<div className="knowledge-error" role="alert">{error}{task&&<button className="text-button" onClick={()=>onOpenTask(task)}>打开已保存的任务</button>}</div>}
  {creating&&canManage?<div className="library-create">
   <div className="library-create-intro"><FlaskConical size={32} strokeWidth={1}/><h2>让知识，真正运行起来。</h2><p>上传论文与源码，保留公式与来源。<br/>编译后的 Marqdo 可以阅读、引用，也能重现实验。</p><ol className="knowledge-steps"><li><span>01</span>上传与定位</li><li><span>02</span>确认与拆分</li><li><span>03</span>并行实现</li><li><span>04</span>验证与发布</li></ol></div>
   <div><label className="knowledge-label">知识名称<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="例如：量子求阶与小规模复现实验" maxLength={100}/></label>
    <input hidden ref={picker} type="file" multiple accept=".pdf,.mq.md,.md,.txt,.py,.rs,.js,.ts,.c,.cpp,.h,.go,.java,.json,.tex" onChange={e=>setFiles(Array.from(e.target.files||[]))}/>
    <button className="knowledge-dropzone" onClick={()=>picker.current?.click()}><Upload size={26}/><strong>选择论文 PDF 或源码</strong><span>最多 8 份 · PDF 50 MB · 源码 1 MB</span></button>
    {!!files.length&&<ul className="knowledge-upload-list">{files.map((f,i)=><li key={i}><FileText size={15}/><span>{f.name}</span><small>{Math.ceil(f.size/1024)} KB</small><button className="icon-button" aria-label={'移除 '+f.name} onClick={()=>setFiles(old=>old.filter((_,n)=>i!==n))}><X size={13}/></button></li>)}</ul>}
    <label className="knowledge-label">编译使用的模型<select value={model} onChange={e=>setModel(e.target.value)}>{models.map(m=><option key={m.id} value={m.id}>{m.label}{m.notice?' · 连接需处理':''}</option>)}</select></label>
    <p className="library-note">扫描件需先做 OCR 并核对公式。上传源码不会直接执行；未接通的内容保留明确说明，验收之后才发布。</p>
    <button className="button primary" disabled={!!busy||!models.length} onClick={compile}>{busy?<LoaderCircle className="spin" size={15}/>:<FlaskConical size={15}/>} {busy||'开始知识编译'}</button>
   </div>
  </div>:<>
   <div className="library-tools"><label className="search-field"><Search size={17}/><input placeholder="搜索知识与编译任务…" aria-label="搜索知识" value={search} onChange={e=>setSearch(e.target.value)}/></label><span>{entries.length} 份知识</span></div>
   {library.loading&&!library.data?<div className="reader-loading"><LoaderCircle size={18} className="spin"/>正在读取知识…</div>:library.error?<div className="reader-error" role="alert"><p>{library.error.message}</p><button className="button" onClick={library.reload}>重新读取</button></div>:<>
    {!!entries.length&&<div className="library-grid">{entries.map(e=><article className="library-card" key={e.id}><div className="library-card-top"><span className="library-icon"><BookOpen size={24} strokeWidth={1.4}/></span><span className="library-status">{e.key?'公用 · 已审阅':'参考文稿'}</span></div><h2>{e.name}</h2><p>{e.key?(e.functions?.length||0)+' 个可调用函数 · '+(e.sources?.length||0)+' 份来源材料':'将文稿作为任务参考，保留清晰的来源与上下文。'}</p><footer><button className={'button '+(selected===e.id?'selected':'')} onClick={()=>onUse(e.id)}>{selected===e.id?<Check size={14}/>:<Plus size={14}/>}用于任务</button>{<a className="text-button" href={'/app/knowledge?'+(e.key?'id='+encodeURIComponent(e.key):'reference='+encodeURIComponent(e.id))} target="_blank" rel="noopener noreferrer">查看详情<ArrowUpRight size={15}/></a>}</footer></article>)}</div>}
    {!!drafts.length&&<section className="library-drafts"><h2>正在沉淀的知识<span>{drafts.length}</span></h2>{drafts.map(d=><article className="library-draft" key={d.task}><span className="library-icon"><FlaskConical size={21}/></span><div><h3>{d.title}</h3><p>{phases[d.phase]||d.phase}</p></div><button className="text-button" onClick={()=>onOpenTask(d.task)}>查看任务</button>{['outline','refine','implement','review','complete'].includes(d.phase)&&<a className="text-button" href={'/app/view?task='+encodeURIComponent(d.task)+'&path='+encodeURIComponent(d.document||(['review','complete'].includes(d.phase)?'solution/index.mq.md':'solution/plan.mq.md'))} target="_blank" rel="noopener noreferrer">查看详情<ArrowUpRight size={15}/></a>}{d.phase==='complete'&&<button className="button" disabled={!!busy} onClick={()=>publish(d)}>发布知识</button>}</article>)}</section>}
    {!entries.length&&!drafts.length&&<div className="library-empty"><BookOpen size={42} strokeWidth={1}/><h2>{search?'暂时没有匹配的知识':'从第一份知识开始'}</h2><p>{search?'换一个名称试试。':'公用知识由管理员维护。发布后会在这里供你阅读、引用和运行。'}</p>{!search&&canManage&&<button className="button" onClick={()=>setCreating(true)}><Plus size={15}/>编译第一份知识</button>}</div>}
   </>}
  </>}
 </section>;
}
