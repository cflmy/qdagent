import {Download, FileCode2, FileText, Presentation} from 'lucide-react';
import {type Artifact, sizeLabel} from '../api';

/** UI projection of persisted deliverables; never infer completion from a file label. */
export function Deliverables({artifacts,task,onPreview}:{artifacts:Artifact[];task:string;onPreview:(path:string)=>void}){
 if(!artifacts.length)return null;
 return <section className="deliverables" aria-label="已生成产物">{artifacts.map(a=>
  <article className="artifact" key={a.id}>
   <div className={`file-mark ${a.kind}`}>{a.kind==='pptx'?<Presentation size={21}/>:<FileText size={21}/>}</div>
   <div className="artifact-copy"><strong>{a.title}</strong><span>{a.kind.toUpperCase()} · {sizeLabel(a.bytes)}</span></div>
   <button className="icon-button" title="阅读源稿" onClick={()=>onPreview(a.source)}><FileCode2 size={17}/></button>
   <a className="icon-button" title="下载文件" href={`/api/tasks/${encodeURIComponent(task)}/download?path=${encodeURIComponent(a.path)}`}><Download size={17}/></a>
  </article>)}</section>;
}
