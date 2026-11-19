// Isolated document: receives a File, never authentication or a workspace URL.
import {createViewer,imagePlugin,officePlugin,audioPlugin,videoPlugin,textPlugin,fallbackPlugin} from '@open-file-viewer/core';
import {localPdfPlugin} from './pdf-page-plugin';
import '@open-file-viewer/core/style.css';
import './file-viewer.css';
let viewer:ReturnType<typeof createViewer>|undefined;
window.addEventListener('message',event=>{
 if(event.source!==parent||event.data?.type!=='qd-file'||!(event.data.file instanceof File))return;
 viewer?.destroy();
 const file=event.data.file as File;
 viewer=createViewer({container:'#file-viewer',file,fileName:file.name,width:'100%',height:'100%',theme:'light',locale:'zh-CN',fit:'contain',
  plugins:[imagePlugin(),localPdfPlugin() as never,officePlugin(),audioPlugin(),videoPlugin(),textPlugin(),fallbackPlugin()],
  toolbar:{zoom:true,search:true,rotate:false,download:false,fullscreen:false,print:false},
  onError:()=>parent.postMessage({type:'qd-preview-error'},'*'),
  onLoad:()=>parent.postMessage({type:'qd-preview-loaded'},'*')});
});
parent.postMessage({type:'qd-preview-ready'},'*');
