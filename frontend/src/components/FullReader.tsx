import {useState} from 'react';
import {ArrowLeft} from 'lucide-react';
import {DocumentPreview} from './DocumentPreview';

export default function FullReader(){
 const query=new URLSearchParams(location.search),task=query.get('task')||'';
 const [path,setPath]=useState(query.get('path')||'');
 function navigate(value:string){
  setPath(value);
  const url=new URL(location.href);url.searchParams.set('path',value);history.replaceState(null,'',url);
 }
 return <main className="document-fullscreen artifact-fullscreen">
  <a className="document-return" href={'/app'+(task?'?task='+encodeURIComponent(task):'')} aria-label="返回工作台"><ArrowLeft size={16}/><span>工作台</span></a>
  {task?<DocumentPreview task={task} path={path} onSelect={navigate}/>:<p role="alert">缺少文稿信息。请从工作区打开一份文稿。</p>}
 </main>;
}
