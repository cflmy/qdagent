import {AlertCircle,CheckCircle2,FileCode2,Terminal} from 'lucide-react';

type RecordValue=Record<string,unknown>;
type Diagnostic={message:string;code?:string;file?:string;line?:number};
function decode(value:unknown,depth=0):unknown{
 if(depth>7)return value;
 if(typeof value==='string'&&value.length<262144){
  const text=value.trim();if(/^[{["]/.test(text)){try{return decode(JSON.parse(text),depth+1)}catch{/* A message is allowed to be plain text. */}}
  const lines=text.split('\n');if(lines.length>1&&lines.every(line=>!line.trim()||line.trim().startsWith('{'))){try{return lines.filter(Boolean).map(line=>decode(JSON.parse(line),depth+1))}catch{/* Preserve malformed transport diagnostics verbatim. */}}
 }
 if(Array.isArray(value))return value.map(item=>decode(item,depth+1));
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,decode(item,depth+1)]));
 return value;
}
export function receiptDiagnostics(value:unknown):Diagnostic[]{
 const found:Diagnostic[]=[];const seen=new Set<string>();
 function visit(node:unknown,depth=0){
  if(depth>14||found.length>=20)return;
  if(Array.isArray(node)){node.forEach(item=>visit(item,depth+1));return}
  if(!node||typeof node!=='object')return;
  const record=node as RecordValue,span=record.span&&typeof record.span==='object'?record.span as RecordValue:undefined;
  if(typeof record.message==='string'&&(record.code||span||Object.keys(record).length<=3)){
   const message=record.message;const key=String(record.code)+'|'+String(span?.file)+'|'+String(span?.line)+'|'+message;
   if(!seen.has(key)&&!message.trim().startsWith('{')){seen.add(key);found.push({message,code:typeof record.code==='string'?record.code:undefined,file:typeof span?.file==='string'?span.file:undefined,line:typeof span?.line==='number'?span.line:undefined})}
  }
  for(const item of Object.values(record))visit(item,depth+1);
 }
 visit(decode(value));return found;
}
const codeLabels:Record<string,string>={'narrative.ratio':'函数叙述比例不足','contract.param_drift':'参数契约与源码不一致','contract.return_mismatch':'返回值与契约不一致','root.independent_test_failed':'独立验证未通过','root.invalid_source':'文稿尚未通过检查','root.unit_count':'职责数量与用户确认不符'};
export function ExecutionReceipt({value,onPreview}:{value:unknown;onPreview?:(path:string)=>void}){
 const record=value&&typeof value==='object'?value as RecordValue:{};
 const normalized=decode(value) as RecordValue;
 const diagnostics=receiptDiagnostics(value);
 const argumentsValue=record.arguments&&typeof record.arguments==='object'?record.arguments as RecordValue:{};
 const source=typeof argumentsValue.source==='string'?argumentsValue.source:typeof record.source==='string'?record.source:undefined;
 const evidence=record.evidence&&typeof record.evidence==='object'?record.evidence as RecordValue:undefined;
 const call=Array.isArray(evidence?.call)?evidence.call:undefined;
 const command=call?['marqdo',...call.slice(0,3)].map(String).join(' '):typeof record.command==='string'?record.command:undefined;
 const returned=record.result&&typeof record.result==='object'?record.result as RecordValue:record;
 const resultValue=returned.value&&typeof returned.value==='object'?returned.value as RecordValue:returned;
 const path=typeof resultValue.path==='string'?resultValue.path:undefined;
 const browser=typeof resultValue.url==='string'&&/^https?:\/\//.test(resultValue.url)&&typeof resultValue.snapshot==='string'?resultValue:undefined;
 const failed=record.status==='failed'||record.ok===false||returned.ok===false||diagnostics.length>0;
 const requestedURL=typeof argumentsValue.url==='string'&&/^https?:\/\//.test(argumentsValue.url)?argumentsValue.url:undefined;
 const empty=!source&&!diagnostics.length&&!command&&!path&&!requestedURL;
 return <div className={'execution-receipt '+(failed?'has-error':'')}>
  {requestedURL&&<a className="receipt-request-url" href={requestedURL} target="_blank" rel="noopener noreferrer">{requestedURL}</a>}
  {command&&<div className="receipt-command"><Terminal size={14}/><code>{command}</code></div>}
  {source&&<details className="receipt-source" open><summary><FileCode2 size={14}/>本次调用的 Marqdo 文稿</summary><pre>{source}</pre></details>}
  {diagnostics.map((diagnostic,index)=><article className="receipt-diagnostic" key={index}><AlertCircle size={15}/><div><strong>{diagnostic.code&&codeLabels[diagnostic.code]||'执行诊断'}</strong><p>{diagnostic.message}</p>{diagnostic.file&&<code>{diagnostic.file.split('/').pop()}{diagnostic.line?`:${diagnostic.line}`:''}</code>}</div></article>)}
  {browser&&<article className="browser-observation"><strong>{String(browser.title||'网页观察')}</strong><a href={String(browser.url)} target="_blank" rel="noopener noreferrer">{String(browser.url)}</a><small>{String(browser.fetched_at||'')} · Chromium 隔离会话</small>{typeof browser.excerpt==='string'&&<p>{browser.excerpt.slice(0,480)}</p>}<div><button className="text-button" disabled={!onPreview} onClick={()=>onPreview?.(String(browser.snapshot))}>阅读网页快照</button>{typeof browser.screenshot==='string'&&<button className="text-button" disabled={!onPreview} onClick={()=>onPreview?.(String(browser.screenshot))}>查看实际截图</button>}</div></article>}
  {path&&<button className="text-button receipt-artifact" onClick={()=>onPreview?.(path)} disabled={!onPreview}><FileCode2 size={14}/>{path}</button>}
  {empty&&<p className="receipt-observation">{failed?<AlertCircle size={14}/>:<CheckCircle2 size={14}/>}<span>{failed?'本次调用未完成，查看下方详细记录。':record.status==='running'||record.status===undefined?'已记录实际调用；成功与否以完成后的验证为准。':'本次调用已完成，结果已保存。'}</span></p>}
  <details className="receipt-debug"><summary>原始协议（调试）</summary><pre>{JSON.stringify(normalized??value,null,2)}</pre></details>
 </div>;
}
