import {useEffect,useState} from 'react';
import {ArrowLeft,BookOpen,CheckCircle2,Code2,FileCode2,FlaskConical,LoaderCircle,Play} from 'lucide-react';
import {api,type Preview,useResource} from '../api';
import {Markdown} from './Markdown';
import {FilePreview} from './FilePreview';
import {ReadableValue} from './ReadableValue';
import {readableFileName} from '../files';
import {Dialog} from './Dialog';
import {NativeView,relativeDocumentPath} from './NativeView';
import type {KnowledgeEntry} from './KnowledgeLibrary';
function KnowledgeResult({value}:{value:unknown}){
 const result=value as {passed?:boolean;replayed?:number;cases?:unknown[]};
 if(!result||!Array.isArray(result.cases))return <ReadableValue value={value}/>;
 return <div className="knowledge-verification"><strong className={result.passed?'passed':'failed'}>{result.passed?'验证通过':'需要复核'} · {result.replayed||0} 个冻结案例</strong>{result.cases.map((item,i)=>{
  if(!item||typeof item!=='object')return <ReadableValue key={i} value={item}/>;
  const c=item as {function?:string;passed?:boolean;input?:unknown;expected?:unknown;actual?:{ok?:boolean;value?:{result?:unknown};error?:unknown}};
  return <article key={i}><header><code>{c.function||'文档契约'}</code><span>{c.passed?'通过':'未通过'}</span></header><dl><dt>输入</dt><dd><ReadableValue value={c.input}/></dd><dt>预期</dt><dd><ReadableValue value={c.expected}/></dd><dt>实际</dt><dd><ReadableValue value={c.actual?.ok?c.actual.value?.result:c.actual?.error||item}/></dd></dl></article>
 })}</div>;
}

export default function KnowledgePage(){
 const query=new URLSearchParams(location.search),key=query.get('id')||'',reference=query.get('reference')||'';
 const [related,setRelated]=useState(false),[sourceIndex,setSourceIndex]=useState(-1),[code,setCode]=useState(false),[tools,setTools]=useState(false),[fn,setFn]=useState('run'),[input,setInput]=useState('{}'),[writeBack,setWriteBack]=useState(false),[busy,setBusy]=useState(''),[error,setError]=useState(''),[result,setResult]=useState<unknown>();
 const base=reference?'/api/knowledge/reference?path='+encodeURIComponent(reference):'/api/knowledge/'+encodeURIComponent(key);
 const documentURL=reference?base:base+'/document';
 const doc=useResource<{source:string;record:KnowledgeEntry}>((key||reference)?documentURL:null);
 const view=useResource<Preview>((key||reference)?documentURL+(reference?'&':'?')+'view=1'+(related?'&related=decisions.mq.md':''):null);
 const contract=useResource<{contract:string}>(key?base+'/contract?function='+encodeURIComponent(fn):null);
 const entry=doc.data?.record;
 useEffect(()=>{if(!key&&!reference)location.replace('/app?section=knowledge')},[key,reference]);
 async function verify(){
  setBusy('verify');setError('');
  try{setResult(await api(base+'/verify',{method:'POST',body:'{}'}))}catch(e){setError((e as Error).message)}finally{setBusy('')}
 }
 async function execute(){
  setBusy('execute');setError('');setResult(undefined);
  try{
   const data=JSON.parse(input);setResult(await api(base+'/execute',{method:'POST',body:JSON.stringify({function:fn,input:data,write_back:writeBack})}));
   if(writeBack){doc.reload();view.reload()}
  }catch(e){setError(e instanceof SyntaxError?'参数需是合法业务数据，例如 {"x": 2}。':(e as Error).message)}finally{setBusy('')}
 }
 function navigate(href:string){
  if(reference){const path=relativeDocumentPath(reference,href);if(path&&path.endsWith('.md'))location.assign('/app/knowledge?reference='+encodeURIComponent(path));return}
  const path=relativeDocumentPath(related?'decisions.mq.md':'index.mq.md',href);
  if(path==='decisions.mq.md'){setRelated(true);setSourceIndex(-1);setCode(false);return}
  if(path==='index.mq.md'){setRelated(false);setSourceIndex(-1);setCode(false);return}
  const index=entry?.sources?.findIndex(s=>s.path===path)??-1;
  if(index>=0){setSourceIndex(index);setCode(false)}
  else setError('这份关联材料没有附在当前知识版本中。');
 }
 const failure=doc.error||view.error;
 return <main className="document-fullscreen knowledge-detail">
  <a className="document-return" href="/app?section=knowledge" aria-label="返回知识库"><ArrowLeft size={16}/><span>知识库</span></a>
  <div className="document-actions">
   <button className="icon-button" title="View 阅读" aria-label="View 阅读" aria-pressed={!code} onClick={()=>{setCode(false);setSourceIndex(-1)}}><BookOpen size={17}/></button>
   <button className="icon-button" title="源码" aria-label="源码" aria-pressed={code} onClick={()=>{setCode(v=>!v);setSourceIndex(-1)}}><Code2 size={17}/></button>
   {!!entry?.sources?.length&&<select aria-label="查看知识来源" value={sourceIndex} onChange={e=>{setSourceIndex(Number(e.target.value));setCode(false)}}><option value={-1}>原始来源</option>{entry.sources.map((s,i)=><option key={s.path} value={i}>{readableFileName(s.path)}</option>)}</select>}
   {!reference&&<button className="button" onClick={()=>setTools(true)}><FlaskConical size={16}/>运行与验证</button>}
  </div>
  {failure?<div className="reader-error" role="alert"><p>{failure.message}</p><a href="/app?section=knowledge">返回知识库</a></div>:sourceIndex>=0&&entry?.sources?.[sourceIndex]?<FilePreview task="" path={entry.sources[sourceIndex].path} name={readableFileName(entry.sources[sourceIndex].path)} version={entry.sources[sourceIndex].sha256} url={base+'/source?index='+sourceIndex}/>:code?<pre className="document-source">{related?view.data?.source:doc.data?.source}</pre>:reference&&view.data?.kind==='markdown'?<div className="document-markdown"><Markdown text={doc.data?.source||''}/></div>:view.data?.html?<NativeView html={view.data.html} title={related?'用户交流与验收记录':entry?.name||view.data.title} label="知识的 Marqdo View" onNavigate={navigate}/>:<div className="reader-loading" role="status"><LoaderCircle className="spin" size={20}/>正在打开 Marqdo View…</div>}
  {error&&!tools&&<div className="document-notice" role="alert">{error}<button className="text-button" onClick={()=>setError('')}>关闭</button></div>}
  <Dialog open={tools} onClose={()=>setTools(false)} title="运行与验证" description="阅读不会执行程序。这里调用文稿的真实函数，显式保存时才写回结果。" wide>
   <div className="panel-body knowledge-tools">
    {error&&<div className="knowledge-error" role="alert">{error}</div>}
    <div className="knowledge-experiment-inputs">
     <label className="knowledge-label">函数<select value={fn} onChange={e=>setFn(e.target.value)}>{(entry?.functions||['run']).map(f=><option key={f} value={f}>{f}</option>)}</select></label>
     <label className="knowledge-label">业务参数<textarea rows={7} value={input} onChange={e=>setInput(e.target.value)} spellCheck={false}/></label>
    </div>
    {contract.data&&<details className="knowledge-contract"><summary>函数公开契约</summary><Markdown text={contract.data.contract}/></details>}
    <label className="knowledge-writeback"><input type="checkbox" checked={writeBack} onChange={e=>setWriteBack(e.target.checked)}/>将实际结果写回文稿</label>
    <div className="knowledge-run-actions"><button className="button primary" disabled={!!busy} onClick={execute}>{busy==='execute'?<LoaderCircle size={15} className="spin"/>:<Play size={15}/>}运行函数</button><button className="button" disabled={!!busy} onClick={verify}>{busy==='verify'?<LoaderCircle size={15} className="spin"/>:<CheckCircle2 size={15}/>}复核冻结案例</button></div>
    {result!==undefined&&<section className="knowledge-result"><h3>实际执行结果</h3><KnowledgeResult value={result}/></section>}
    <section className="knowledge-provenance"><h3>来源与审阅</h3>{(entry?.sources||[]).map(s=><article key={s.path}><FileCode2 size={16}/><strong>{readableFileName(s.path)}</strong><small>{new Set(s.chunks?.map(c=>c.page)).size} 个来源页 · SHA256 {s.sha256.slice(0,12)}…</small></article>)}<button className="text-button" onClick={()=>{setRelated(v=>!v);setSourceIndex(-1);setCode(false);setTools(false)}}>{related?'返回知识文稿':'查看用户交流与验收记录'}</button><p>契约测试不代替领域判断。外联执行没有自动授予进程或网络权限。</p></section>
   </div>
  </Dialog>
 </main>;
}
