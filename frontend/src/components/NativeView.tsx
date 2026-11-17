import {useEffect,useMemo,useRef,useState} from 'react';
import DOMPurify from 'dompurify';
import '../document-reader.css';

function escapeHTML(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!))}

export function relativeDocumentPath(current:string,href:string){
 try{
  const base=new URL(current,'https://document.invalid/');
  const next=new URL(href,base);
  if(next.origin!==base.origin)return null;
  return decodeURIComponent(next.pathname.slice(1));
 }catch{return null}
}

/** Official, unmodified View assets; only the sanitized document is supplied here.
 * The opaque frame cannot access account APIs or the parent document.
 */
export function NativeView({html,title,label,onNavigate}:{html:string;title:string;label?:string;onNavigate?:(href:string)=>void}){
 const frame=useRef<HTMLIFrameElement>(null),navigate=useRef(onNavigate);
 navigate.current=onNavigate;
 const [channel]=useState(()=>crypto.randomUUID());
 useEffect(()=>{
  const receive=(event:MessageEvent)=>{
   if(event.source!==frame.current?.contentWindow||event.origin!=='null'||event.data?.channel!==channel)return;
   if(event.data.type==='document-link'&&typeof event.data.href==='string')navigate.current?.(event.data.href);
  };
  window.addEventListener('message',receive);
  return()=>window.removeEventListener('message',receive);
 },[channel]);
 const document=useMemo(()=>{
  const origin=location.origin;
  const content=DOMPurify.sanitize(html,{
   ADD_TAGS:['details','summary'],ADD_ATTR:['target','open'],
   FORBID_TAGS:['script','style','iframe','object','embed','form','base','meta','link'],
  });
  return '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">'+
   '<meta name="viewport" content="width=device-width, initial-scale=1">'+
   '<meta http-equiv="Content-Security-Policy" content="default-src &#39;none&#39;; script-src '+escapeHTML(origin)+'; style-src '+escapeHTML(origin)+' &#39;unsafe-inline&#39;; img-src '+escapeHTML(origin)+' data: blob:; font-src '+escapeHTML(origin)+' data:; connect-src &#39;none&#39;; form-action &#39;none&#39;; base-uri &#39;none&#39;">'+
   '<title>'+escapeHTML(title)+'</title>'+
   '<link rel="stylesheet" href="/reader-assets/view-assets/vendor/katex.min.css">'+
   '<link rel="stylesheet" href="/reader-assets/view-base.css">'+
   '<link rel="stylesheet" href="/reader-assets/reader.css">'+
   '<link rel="stylesheet" href="/reader-assets/reader-ornament.css">'+
   '<script defer src="/reader-assets/view-assets/vendor/katex.min.js"></script>'+
   '<script defer src="/reader-assets/view-assets/vendor/auto-render.min.js"></script>'+
   '<script defer src="/reader-assets/reader.js"></script>'+
   '<script defer src="/reader-assets/document-bridge.js" data-channel="'+escapeHTML(channel)+'" data-parent-origin="'+escapeHTML(origin)+'"></script>'+
   '</head><body class="reader-page">'+
   '<div class="reader-ornament reader-blossom-top" aria-hidden="true"></div>'+
   '<div class="shell"><div class="panel-wrap"><main class="panel">'+
   '<h1 class="page">'+escapeHTML(title)+'</h1>'+
   '<section class="structure-block"><div class="struct-wrap"><div class="structure" id="structure">'+content+'</div></div></section>'+
   '</main></div></div>'+
   '<div class="reader-ornament reader-blossom-bottom" aria-hidden="true"></div>'+
   '<div class="reader-toast" role="status" aria-live="polite" hidden></div>'+
   '<dialog id="reader-dialog" class="reader-dialog" aria-labelledby="reader-dialog-title"><div class="reader-dialog-head"><h2 id="reader-dialog-title"></h2><button type="button" class="icon-button" data-reader-action="close-dialog" aria-label="关闭">×</button></div><div id="reader-dialog-content"></div></dialog>'+
   '</body></html>';
 },[html,title,channel]);
 return <iframe ref={frame} className="native-view" title={label||title} srcDoc={document} sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer"/>;
}
