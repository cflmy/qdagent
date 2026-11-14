import dns from 'node:dns/promises';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';
export function publicAddress(address){
 if(net.isIP(address)===4){
  const value=address.split('.').reduce((n,x)=>(n*256+Number(x))>>>0,0);
  return ![[0,8],[0x0a000000,8],[0x64400000,10],[0x7f000000,8],[0xa9fe0000,16],[0xac100000,12],[0xc0000000,24],[0xc0000200,24],[0xc0586300,24],[0xc0a80000,16],[0xc6120000,15],[0xc6336400,24],[0xcb007100,24],[0xe0000000,4],[0xf0000000,4]].some(([base,bits])=>(value>>>(32-bits))===(base>>>(32-bits)));
 }
 if(net.isIP(address)===6){const parts=address.split(':');const first=parseInt(parts[0],16),second=parseInt(parts[1]||'0',16);return first>=0x2000&&first<0x3fff&&!(first===0x2001&&(second<=0x1ff||second===0xdb8))&&first!==0x2002}
 return false;
}
export async function destination(raw,{lookup=dns.lookup,testOrigin=''}={}){
 const url=new URL(raw);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.hash.length>1024)throw Error('Only public HTTP(S) pages are available');
 const host=url.hostname.replace(/^\[|\]$/g,'');
 const answers=net.isIP(host)?[{address:host,family:net.isIP(host)}]:await lookup(host,{all:true,verbatim:true});
 const fixture=testOrigin&&url.origin===testOrigin;
 if(!answers.length||(!fixture&&answers.some(item=>!publicAddress(item.address))))throw Error('Private and special-use network addresses are blocked');
 return {url,address:answers.find(item=>item.family===4)||answers[0]};
}
export async function fetchPinned(raw,options={}){
 const {url,address}=await destination(raw,options);
 return await new Promise((resolve,reject)=>{
  const transport=url.protocol==='https:'?https:http;const request=transport.request(url,{method:'GET',signal:options.signal,headers:{'user-agent':'QiuDao-ReadOnlyBrowser/0.1','accept':'*/*','accept-encoding':'identity'},lookup:(_host,opts,callback)=>opts.all?callback(null,[address]):callback(null,address.address,address.family),timeout:12000},response=>{
   const chunks=[];let size=0;response.on('data',chunk=>{size+=chunk.length;if(size>3*1024*1024){request.destroy(Error('Page resource exceeds three MiB'));return}chunks.push(chunk)});
   response.on('error',reject);response.on('end',()=>{try{
    let body=Buffer.concat(chunks);const encoding=response.headers['content-encoding'];const bounds={maxOutputLength:3*1024*1024};if(encoding==='gzip')body=zlib.gunzipSync(body,bounds);else if(encoding==='br')body=zlib.brotliDecompressSync(body,bounds);else if(encoding==='deflate')body=zlib.inflateSync(body,bounds);
    const headers={};for(const name of ['content-type','location','cache-control'])if(typeof response.headers[name]==='string')headers[name]=response.headers[name];
    resolve({status:response.statusCode,headers,body});
   }catch(error){reject(error)}})
  });const deadline=setTimeout(()=>request.destroy(Error('Page resource deadline exceeded')),12000);request.on('close',()=>clearTimeout(deadline));request.on('timeout',()=>request.destroy(Error('Page resource timeout')));request.on('error',reject);request.end();
 });
}
// Chromium route handlers do not reliably intercept redirect continuations.
// Resolve redirects here, rechecking and pinning every hop before any connection.
export async function fetchPublic(raw,options={}){
 let current=raw;
 for(let hop=0;hop<7;hop++){
  options.beforeRequest?.();
  const response=await fetchPinned(current,options);options.onResponse?.(response.body.length);
  if([301,302,303,307,308].includes(response.status)){
   if(!response.headers.location)throw Error('Redirect has no destination');
   current=new URL(response.headers.location,current).href;continue;
  }
  return {...response,url:current};
 }
 throw Error('Page redirect limit exceeded');
}
