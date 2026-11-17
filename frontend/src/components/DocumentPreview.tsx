import {LoaderCircle} from 'lucide-react';
import {type Preview,useResource} from '../api';
import {readableFileName} from '../files';
import {FilePreview} from './FilePreview';
import {Markdown} from './Markdown';
import {NativeView,relativeDocumentPath} from './NativeView';

export function DocumentPreview({task,path,version='',source=false,onSelect}:{task:string;path:string;version?:string;source?:boolean;onSelect:(path:string)=>void}){
 const preview=useResource<Preview>(task&&path?'/api/tasks/'+encodeURIComponent(task)+'/preview?path='+encodeURIComponent(path)+'&v='+encodeURIComponent(version):null);
 const value=preview.data;
 if(!path)return <div className="reader-empty"><p>请先在工作区选择一份文稿。</p></div>;
 if(preview.loading&&!value)return <div className="reader-loading" role="status"><LoaderCircle size={20} className="spin"/>正在读取文稿…</div>;
 if(preview.error)return <div className="reader-error" role="alert"><p>{preview.error.message}</p><button className="button" onClick={preview.reload}>重新读取</button></div>;
 if(!value)return null;
 if(source)return <pre className="document-source">{value.source||'此文件没有可预览的文本源码。'}</pre>;
 if(value.kind==='marqdo-view'&&value.html)return <NativeView key={task+'/'+path} html={value.html} title={value.title||readableFileName(path)} onNavigate={href=>{const next=relativeDocumentPath(path,href);if(next)onSelect(next)}}/>;
 if(value.kind==='binary')return <FilePreview key={task+'/'+path+'/'+version} task={task} path={path} version={version} name={readableFileName(path)}/>;
 return <div className="document-markdown"><Markdown text={value.source||''}/></div>;
}
