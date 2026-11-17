/* Navigation only. Syntax, disclosures and annotation geometry belong to the official reader.js. */
(function(){
 'use strict';
 var script=document.currentScript,channel=script.dataset.channel,parentOrigin=script.dataset.parentOrigin;
 document.addEventListener('click',function(event){
  var anchor=event.target.closest('a[href]');
  if(!anchor)return;
  var href=anchor.getAttribute('href')||'';
  if(!href||href[0]==='#')return;
  if(/^https?:\/\//i.test(href)||/^mailto:/i.test(href)){
   anchor.target='_blank';anchor.rel='noopener noreferrer';return;
  }
  if(/^[a-z][a-z0-9+.-]*:/i.test(href)||href.startsWith('//')){event.preventDefault();return;}
  event.preventDefault();
  window.parent.postMessage({channel:channel,type:'document-link',href:href},parentOrigin);
 },true);
 if(typeof window.renderMathInElement==='function'){
  window.renderMathInElement(document.body,{
   delimiters:[{left:'$$',right:'$$',display:true},{left:'\\(',right:'\\)',display:false}],
   ignoredTags:['script','noscript','style','textarea','pre','code','kbd'],throwOnError:false
  });
 }
 if(window.MarqdoReader)window.MarqdoReader.refreshAnnotations();
})();
