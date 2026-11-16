import {readableFileName} from '../files';
import {ReadableValue} from './ReadableValue';
import {Markdown} from './Markdown';
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
const codeLabels:Record<string,string>={'narrative.ratio':'函数叙述比例不足','contract.param_drift':'参数契约与源码不一致','contract.return_mismatch':'返回值与契约不一致','root.independent_test_failed':'独立验证未通过','root.invalid_source':'文稿尚未通过检查','root.unit_count':'职责数量与用户确认不符','call.unknown_arg':'参数名称未在文稿中声明','call.missing_arg':'缺少必填参数','call.duplicate_arg':'参数重复填写','contract.arg_mismatch':'参数类型与契约不符'};
function readableDiagnostic(message:string){
 if(message==='Private and special-use network addresses are blocked')return '该网站的 DNS 返回了内网或特殊用途地址，已阻止访问。可使用其他公开来源。';
 if(message.includes('before secure TLS connection was established'))return '与网站建立安全连接失败；该地址目前不可达。';
 if(message.includes('Page has no readable article body'))return '页面没有可读取的正文，未将空页面记为来源。';
 if(message.includes('Page is an access verification screen'))return '网站返回了访问验证页面，未将其记为资料。';
 return message;
}
export function ExecutionReceipt({value,onPreview}:{value:unknown;onPreview?:(path:string)=>void}){
 const record=value&&typeof value==='object'?value as RecordValue:{};
 const normalized=decode(value) as RecordValue;
 const diagnostics=receiptDiagnostics(value);
 const argumentsValue=record.arguments&&typeof record.arguments==='object'?record.arguments as RecordValue:{};
 const source=typeof argumentsValue.source==='string'?argumentsValue.source:typeof record.source==='string'?record.source:undefined;
 const evidence=record.evidence&&typeof record.evidence==='object'?record.evidence as RecordValue:undefined;
 const call=Array.isArray(evidence?.call)?evidence.call:undefined;
 const command=call?['marqdo',String(call[0]),readableFileName(String(call[1]||'')),String(call[2]||'')].join(' '):typeof record.command==='string'?record.command:undefined;
 const returned=record.result&&typeof record.result==='object'?record.result as RecordValue:record;
 const resultValue=returned.value&&typeof returned.value==='object'?returned.value as RecordValue:returned;
 const path=typeof resultValue.path==='string'?resultValue.path:undefined;
 const browser=typeof resultValue.url==='string'&&/^https?:\/\//.test(resultValue.url)&&typeof resultValue.snapshot==='string'?resultValue:undefined;
 const search=typeof resultValue.query==='string'&&Array.isArray(resultValue.results)?resultValue:undefined;
 const ocr=typeof resultValue.file==='string'&&typeof resultValue.state==='string'?resultValue:undefined;
 const failed=record.status==='failed'||record.ok===false||returned.ok===false||diagnostics.length>0;
 const requestedURL=typeof argumentsValue.url==='string'&&/^https?:\/\//.test(argumentsValue.url)?argumentsValue.url:undefined;
 const validation=record.validation&&typeof record.validation==='object'?record.validation as RecordValue:undefined;
 const checks=Array.isArray(validation?.checks)?validation.checks as RecordValue[]:Array.isArray(evidence?.checks)?evidence.checks as RecordValue[]:[];
 const recovery=typeof record.cause==='string'&&typeof record.advice==='string'?record:undefined;
 const parameters=Object.fromEntries(Object.entries(argumentsValue).filter(([key])=>key!=='source'));
 const primitive=value===null||typeof value!=='object';
 const generic=primitive?normalized:typeof record.result!=='object'&&record.result!==undefined?record.result:returned.ok===true&&'value' in returned?returned.value:resultValue;
 const showGeneric=primitive||!browser&&!search&&!ocr&&!recovery&&!checks.length&&(!diagnostics.length)&&((record.result!==undefined)||('ok' in record));
 const empty=!source&&!diagnostics.length&&!command&&!path&&!requestedURL&&!browser&&!search&&!ocr;
 return <div className={'execution-receipt '+(failed?'has-error':'')}>
  {requestedURL&&<a className="receipt-request-url" href={requestedURL} target="_blank" rel="noopener noreferrer">{requestedURL}</a>}
  {Object.keys(parameters).length>0&&<div className="receipt-parameters"><ReadableValue value={parameters}/></div>}
  {command&&<div className="receipt-command"><Terminal size={14}/><code>{command}</code></div>}
  {source&&<details className="receipt-source" open={source.length<1200}><summary><FileCode2 size={14}/>本次调用的 Marqdo 文稿</summary><pre>{source}</pre></details>}
  {checks.length>0&&<div className="call-validation"><strong>调用前检查通过</strong>{checks.map((check,index)=>{const params=Array.isArray(check.parameters)?check.parameters as RecordValue[]:[];const deferred=params.filter(param=>!param.known).length;return <article key={index}><header><span>{String(check.intent||check.function)}</span><code>{String(check.function)}</code></header><table><thead><tr><th>参数</th><th>实际值 / 类型</th><th>检查</th></tr></thead><tbody>{params.map((param,i)=><tr key={i}><td><code>{String(param.name)}</code></td><td>{param.known?<><span>{String(param.preview??'无')}</span><small>{String(param.type||'any')}</small></>:<span>运行时确定</span>}</td><td>{param.known?'已核对':'执行时复核'}</td></tr>)}</tbody></table><p>{deferred?`${deferred} 项动态值将在实际调用前按契约复核。`:'已核对参数名、必填项及已知值类型。'}校验不会提前执行工具。</p></article>})}</div>}
  {recovery&&<article className="recovery-record"><strong>{recovery.followup_succeeded?'已记录后续成功调用':recovery.saved===false?'当前诊断与修复依据（经验缓存未保存）':'已保存错误与修复依据'}</strong><p>{String(recovery.cause)}</p><div className="recovery-advice"><span>下一次如何修复</span><Markdown text={String(recovery.advice)}/></div>{typeof recovery.failed_call==='string'&&<details className="receipt-source"><summary>当时失败的调用</summary><pre>{recovery.failed_call}</pre></details>}{typeof recovery.success_call==='string'&&<details className="receipt-source" open><summary>后续实际成功的调用片段</summary><pre>{recovery.success_call}</pre></details>}<small>{recovery.followup_succeeded?'这次调用成功，原职责是否完成仍以实际验证为准。':`本次运行中相同调用已失败 ${Number(recovery.count||1)} 次。`}</small></article>}
  {diagnostics.map((diagnostic,index)=><article className="receipt-diagnostic" key={index}><AlertCircle size={15}/><div><strong>{diagnostic.code&&codeLabels[diagnostic.code]||'执行诊断'}</strong><p>{readableDiagnostic(diagnostic.message)}</p>{diagnostic.file&&<code>{diagnostic.file.split('/').pop()}{diagnostic.line?`:${diagnostic.line}`:''}</code>}</div></article>)}
  {browser&&<article className="browser-observation"><strong>{String(browser.title||'网页观察')}</strong><a href={String(browser.url)} target="_blank" rel="noopener noreferrer">{String(browser.url)}</a><small>{String(browser.fetched_at||'')} · Chromium 隔离会话</small>{typeof browser.excerpt==='string'&&<p>{browser.excerpt.slice(0,480)}</p>}<div><button className="text-button" disabled={!onPreview} onClick={()=>onPreview?.(String(browser.snapshot))}>阅读网页快照</button>{typeof browser.screenshot==='string'&&<button className="text-button" disabled={!onPreview} onClick={()=>onPreview?.(String(browser.screenshot))}>查看实际截图</button>}</div></article>}
  {path&&<button className="text-button receipt-artifact" onClick={()=>onPreview?.(path)} disabled={!onPreview}><FileCode2 size={14}/>{readableFileName(path)}</button>}
  {search&&<article className="search-observation"><strong>搜索：{String(search.query)}</strong><small>搜索摘要 · 尚未打开网页</small>{(search.results as RecordValue[]).map((item,index)=><div key={index}><a href={String(item.url)} target="_blank" rel="noopener noreferrer">{String(item.title||item.url)}</a><p>{String(item.excerpt||'')}</p></div>)}{!(search.results as unknown[]).length&&<p>本次查询没有返回结果。</p>}{Array.isArray(search.unresponsive_engines)&&search.unresponsive_engines.length>0&&<small>部分引擎未响应：{search.unresponsive_engines.map(item=>Array.isArray(item)?item.join(' · '):String(item)).join('；')}</small>}</article>}
  {ocr&&<article className="ocr-observation"><strong>{readableFileName(String(ocr.file))}</strong><small>{({'pending':'已提交，等待识别','running':'正在识别','done':'识别完成，请对照原件核对','failed':'识别失败'} as Record<string,string>)[String(ocr.state)]||String(ocr.state)}</small>{typeof ocr.excerpt==='string'&&<p>{ocr.excerpt.slice(0,800)}</p>}</article>}
  {showGeneric&&<div className="receipt-return"><span className="field-caption">实际返回</span><ReadableValue value={generic}/></div>}
  {empty&&!Object.keys(parameters).length&&!checks.length&&!recovery&&!showGeneric&&<p className="receipt-observation">{failed?<AlertCircle size={14}/>:<CheckCircle2 size={14}/>}<span>{failed?'本次调用未完成，查看下方详细记录。':record.status==='running'||record.status===undefined?'已记录实际调用；成功与否以完成后的验证为准。':'本次调用已完成，结果已保存。'}</span></p>}
  <details className="receipt-debug"><summary>原始协议（调试）</summary><pre>{JSON.stringify(normalized??value,null,2)}</pre></details>
 </div>;
}
