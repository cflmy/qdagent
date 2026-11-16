// Storage paths remain the identity for requests, selection and React keys.
export function readableFileName(path:string,name?:string){
 const stored=path.split('/').pop()||'文件';if(name&&name!==stored)return name;
 return path.startsWith('uploads/')?stored.replace(/^[a-f0-9]{12}-/i,''):stored;
}
export function readableFilePath(path:string){
 const parts=path.split('/');return parts.map((part,i)=>i===parts.length-1?readableFileName(path,part):/^[a-f0-9]{24,}$/i.test(part)?'资料目录':part).join('/');
}

export function readableQuestion(text:string){
 const marker='\n\n附件（工作区相对路径）：\n';const start=text.lastIndexOf(marker);if(start<0)return text;
 const lines=text.slice(start+marker.length).split('\n');if(!lines.every(line=>line.startsWith('- uploads/')))return text;
 return text.slice(0,start)+'\n\n附件：\n'+lines.map(line=>'- '+readableFileName(line.slice(2))).join('\n');
}
