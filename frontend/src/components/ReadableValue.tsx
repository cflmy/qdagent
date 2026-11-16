import type {ReactNode} from 'react';
import {readableFileName} from '../files';
const labels:Record<string,string>={model:'模型',role:'角色',sources:'指令来源',context_bytes:'上下文字节',attempt:'尝试次数',path:'文件',file:'文件',title:'标题',ready:'验证就绪',phase:'阶段',status:'状态',count:'数量',passed:'验证通过',assurance:'证据类型',unit_id:'函数段',sha256:'版本摘要',source_sha256:'源码摘要',execution_sha256:'实际执行摘要',api_sha256:'接口版本',exit_code:'退出码',function:'函数',source:'源文稿',bytes:'大小',waiting_for_user:'等待用户确认',saved:'已保存',state:'状态',kind:'类型',error:'错误',message:'说明',query:'查询',url:'网址',value:'返回值',result:'返回内容',required:'必填参数',ok:'操作成功',revision:'版本',concurrency:'并发数',tests:'独立测试',trial:'试运行'};
export function valueText(value:unknown):string {
 if(value===null||value===undefined)return '无';if(value===true)return '是';if(value===false)return '否';if(typeof value==='string')return value;
 if(typeof value==='number')return String(value);if(Array.isArray(value))return `${value.length} 项`;
 return `${Object.keys(value as object).length} 个字段`;
}
export function ReadableValue({value,depth=0}:{value:unknown;depth?:number}):ReactNode{
 if(value===null||typeof value!=='object'){
  const text=valueText(value);if(text.length>700)return <div className="receipt-long-text"><span>{text.slice(0,700)}…</span><details><summary>展开完整文本 · {text.length} 字符</summary><pre>{text}</pre></details></div>;
  return <span className="receipt-scalar">{text}</span>;
 }
 if(depth>=3)return <span className="receipt-scalar">{valueText(value)}，完整内容见原始记录</span>;
 if(Array.isArray(value))return <ol className="receipt-list">{value.slice(0,6).map((item,i)=><li key={i}><ReadableValue value={item} depth={depth+1}/></li>)}{value.length>6&&<li><details><summary>展开其余 {value.length-6} 项</summary>{value.slice(6,50).map((item,i)=><div key={i}><ReadableValue value={item} depth={depth+1}/></div>)}</details></li>}</ol>;
 const entries=Object.entries(value as Record<string,unknown>).filter(([key])=>!['api_key','authorization','client_secret','credential','token'].includes(key.toLowerCase()));
 return <dl className="receipt-fields">{entries.slice(0,12).map(([key,item])=><div key={key}><dt>{labels[key]||key}</dt><dd>{['path','file'].includes(key)&&typeof item==='string'?<span title={readableFileName(item)}>{readableFileName(item)}</span>:key==='role'&&typeof item==='string'?({intent:'意图拆解',outline:'基本方案',test:'独立测试',implement:'函数实现',deliver:'整合交付'} as Record<string,string>)[item]||item:<ReadableValue value={item} depth={depth+1}/>}</dd></div>)}{entries.length>12&&<div><dt>其他字段</dt><dd>另有 {entries.length-12} 项，完整内容见原始记录</dd></div>}</dl>;
}
