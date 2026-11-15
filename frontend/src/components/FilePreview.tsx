import {useEffect,useRef,useState} from 'react';
import {LoaderCircle} from 'lucide-react';

export function FilePreview({task,path,version}:{task:string;path:string;version:string}){
 const frame=useRef<HTMLIFrameElement>(null);
 const [ready,setReady]=useState(false),[file,setFile]=useState<File>(),[error,setError]=useState('');
 useEffect(()=>{
  const controller=new AbortController();setFile(undefined);setError('');
  (async()=>{try{
   const response=await fetch(`/api/tasks/${encodeURIComponent(task)}/download?path=${encodeURIComponent(path)}&v=${encodeURIComponent(version)}`,{signal:controller.signal});
   if(!response.ok)throw Error('文件读取失败，请重试。');
   const size=Number(response.headers.get('Content-Length')||0);if(size>50*1024*1024)throw Error('此阅读器最多预览 50 MB 文件，请下载查看。');
   const blob=await response.blob();if(blob.size>50*1024*1024)throw Error('文件超过预览上限，请下载查看。');
   setFile(new File([blob],path.split('/').pop()||'file',{type:blob.type}));
  }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'无法读取文件。')}})();
  return()=>controller.abort();
 },[task,path,version]);
 useEffect(()=>{const receive=(event:MessageEvent)=>{if(event.source!==frame.current?.contentWindow)return;if(event.data?.type==='qd-preview-ready')setReady(true);if(event.data?.type==='qd-preview-error')setError('此文件无法完整解析，可下载原文件查看。')};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive)},[]);
 useEffect(()=>{if(ready&&file)frame.current?.contentWindow?.postMessage({type:'qd-file',file},'*')},[ready,file]);
 return <div className="multi-file-preview">{error&&<p className="file-preview-error" role="status">{error}</p>}{!file&&!error&&<div className="reader-loading"><LoaderCircle size={18} className="spin"/> 正在读取文件…</div>}<iframe ref={frame} title="多格式文件预览" src="/file-viewer.html" sandbox="allow-scripts" referrerPolicy="no-referrer"/></div>;
}
