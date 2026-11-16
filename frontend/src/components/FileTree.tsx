import {useMemo,useState} from 'react';
import {ChevronRight,FileText,Folder,FolderOpen} from 'lucide-react';
import {type WorkspaceFile,sizeLabel} from '../api';
import {readableFileName} from '../files';
interface Node {name:string;path:string;file?:WorkspaceFile;children:Map<string,Node>}
function nodeName(node:Node){return node.file?readableFileName(node.path,node.file.name):node.name}
export function FileTree({files,selected,onSelect}:{files:WorkspaceFile[];selected:string;onSelect:(path:string)=>void}){
 const roots=useMemo(()=>{const roots=new Map<string,Node>();for(const file of files){let parent=roots;let path='';const parts=file.path.split('/');parts.forEach((name,i)=>{path+=(path?'/':'')+name;let node=parent.get(name);if(!node){node={name,path,children:new Map()};parent.set(name,node)}if(i===parts.length-1)node.file=file;parent=node.children})}return roots},[files]);
 return <div className="workspace-tree" role="tree" aria-label="工作区文件树"><Branches nodes={roots} selected={selected} onSelect={onSelect} depth={0}/></div>;
}
function Branches({nodes,selected,onSelect,depth}:{nodes:Map<string,Node>;selected:string;onSelect:(path:string)=>void;depth:number}){
 const sorted=[...nodes.values()].sort((a,b)=>Number(!!a.file)-Number(!!b.file)||nodeName(a).localeCompare(nodeName(b),'zh-CN')||a.path.localeCompare(b.path));
 const counts=new Map<string,number>();for(const node of sorted){const name=nodeName(node);counts.set(name,(counts.get(name)||0)+1)}const seen=new Map<string,number>();
 return <>{sorted.map((node,i)=>{const name=nodeName(node);const order=(seen.get(name)||0)+1;seen.set(name,order);return node.file?<button data-file-path={node.path} role="treeitem" aria-level={depth+1} aria-selected={selected===node.path} className={'file-row tree-file '+(selected===node.path?'selected':'')} key={node.path} style={{paddingLeft:12+depth*16}} onClick={()=>onSelect(node.path)} title={name}><FileText size={15}/><span><strong>{name}</strong><small>{sizeLabel(node.file.size)}{(counts.get(name)||0)>1?` · 同名文件 ${order}`:''}</small></span></button>:<FolderBranch key={node.path} node={node} selected={selected} onSelect={onSelect} depth={depth} label={/^[a-f0-9]{24,}$/i.test(node.name)?`资料目录 ${i+1}`:node.name}/>})}</>;
}
function FolderBranch({node,selected,onSelect,depth,label}:{node:Node;selected:string;onSelect:(path:string)=>void;depth:number;label:string}){
 const [expanded,setExpanded]=useState(true);
 return <div role="treeitem" aria-level={depth+1} aria-expanded={expanded} aria-label={label} className="tree-folder"><button onClick={()=>setExpanded(v=>!v)} style={{paddingLeft:10+depth*16}}><ChevronRight size={13} className={expanded?'expanded':''}/>{expanded?<FolderOpen size={16}/>:<Folder size={16}/>}<span>{label}</span><small>{node.children.size}</small></button>{expanded&&<div role="group"><Branches nodes={node.children} selected={selected} onSelect={onSelect} depth={depth+1}/></div>}</div>;
}
