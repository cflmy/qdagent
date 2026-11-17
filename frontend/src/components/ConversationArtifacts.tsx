import {ArtifactGallery} from './ArtifactGallery';
import {Deliverables} from './Workbench';
import type {Files,RunEvent} from '../api';
import '../conversation-artifacts.css';

export function ConversationArtifacts({task,files,events,onPreview}:{task:string;files?:Files;events:RunEvent[];onPreview:(path:string)=>void}){
 const artifacts=files?.artifacts||[];
 const styled=artifacts.filter(a=>(a.kind==='pptx'||a.kind==='docx')&&!!a.group_id);
 const live=events.some(event=>event.kind==='artifact_variant_start');
 const others=artifacts.filter(a=>!styled.includes(a));
 if(!artifacts.length&&!live)return null;
 return <section className="conversation-artifacts" aria-label="对话中的产物">
  {(styled.length>0||live)&&<div className="conversation-variants"><ArtifactGallery task={task} artifacts={styled} events={events} onOpen={onPreview} themes={files?.workflow?.settings.office_themes}/></div>}
  <Deliverables task={task} artifacts={others} onPreview={onPreview}/>
 </section>;
}
