import {chromium} from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {destination,fetchPublic} from './network.mjs';
const token=fs.readFileSync(process.env.BROWSER_KEY_FILE,'utf8').trim();if(token.length<32)throw Error('Browser service secret is missing');
const policy={testOrigin:process.env.BROWSER_TEST_MODE==='1'?(process.env.BROWSER_TEST_ORIGIN||''):''};
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true,chromiumSandbox:true,proxy:{server:'http://127.0.0.1:9'},args:['--force-webrtc-ip-handling-policy=disable_non_proxied_udp','--disable-quic','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1']});
let active=0;const pending=[];
async function acquire(signal){
 signal.throwIfAborted();if(active<2){active++;return}
 if(pending.length>=16)throw Error('Browser queue full');
 await new Promise((resolve,reject)=>{
  const entry={resolve(){signal.removeEventListener('abort',cancel);resolve()}};
  function cancel(){const index=pending.indexOf(entry);if(index>=0)pending.splice(index,1);reject(signal.reason||Error('Browser operation cancelled'))}
  pending.push(entry);signal.addEventListener('abort',cancel,{once:true});
 });
}
function release(){const next=pending.shift();if(next)next.resolve();else active--}
async function openPage(url,signal){
 await destination(url,policy);await acquire(signal);let context;
 const cancel=()=>context?.close().catch(()=>{});signal.addEventListener('abort',cancel,{once:true});
 try{
  const started=Date.now();let total=0,requests=0;const blocked=[];
  const policyBudget={...policy,signal,beforeRequest(){signal.throwIfAborted();if(++requests>80||Date.now()-started>30000)throw Error('Page request budget exceeded')},onResponse(size){total+=size;if(total>12*1024*1024)throw Error('Page byte budget exceeded')}};
  const document=await fetchPublic(url,policyBudget);
  context=await browser.newContext({viewport:{width:1280,height:800},javaScriptEnabled:false,serviceWorkers:'block',acceptDownloads:false,ignoreHTTPSErrors:false});
  signal.throwIfAborted();
  await context.routeWebSocket('**/*',socket=>socket.close());
  await context.route('**/*',async route=>{
   try{
    const request=route.request();if(request.method()!=='GET'&&request.method()!=='HEAD')throw Error('Read-only browser blocks writes');
    if(['image','font','media'].includes(request.resourceType())){await route.abort();return}
    const response=request.isNavigationRequest()&&request.url()===document.url?document:await fetchPublic(request.url(),policyBudget);
    await route.fulfill(response);
   }catch(error){blocked.push({url:route.request().url(),message:String(error.message)});await route.abort().catch(()=>{})}
  });
  const page=await context.newPage();page.on('dialog',dialog=>dialog.dismiss());page.on('popup',popup=>popup.close());
  const response=await page.goto(document.url,{waitUntil:'commit',timeout:30000});
  await page.locator('body').waitFor({state:'attached',timeout:10000});
  await page.waitForTimeout(500);
  if(!response||response.status()>=400)throw Error('Page navigation failed: '+(response?.status()||'no response'));
  const text=(await page.locator('body').innerText({timeout:5000})).slice(0,24000);
  const links=await page.locator('a[href]').evaluateAll(nodes=>nodes.map(node=>({text:(node.textContent||'').trim().slice(0,160),url:node.href})).filter(link=>link.url.startsWith('https://')||link.url.startsWith('http://')).slice(0,80));
  const screenshot=await page.screenshot({type:'png',timeout:10000});if(screenshot.length>3*1024*1024)throw Error('Screenshot exceeds bound');
  return {ok:true,url:page.url(),title:await page.title(),text,excerpt:text.slice(0,3000),links,status:response.status(),fetched_at:new Date().toISOString(),screenshot:screenshot.toString('base64'),requests,blocked:blocked.slice(0,10),sandbox:'chromium-user-namespace'};
 }finally{signal.removeEventListener('abort',cancel);await context?.close();release()}
}
function send(response,status,value){const body=Buffer.from(JSON.stringify(value));response.writeHead(status,{'content-type':'application/json','content-length':body.length,'connection':'close','cache-control':'no-store'});response.end(body)}
const server=http.createServer(async(request,response)=>{
 if(request.url==='/healthz'&&request.method==='GET'){send(response,browser.isConnected()?200:503,{ok:browser.isConnected(),sandbox:'chromium-user-namespace'});return}
 const provided=Buffer.from((request.headers.authorization||'').replace(/^Bearer /,''));const expected=Buffer.from(token);
 if(provided.length!==expected.length||!crypto.timingSafeEqual(provided,expected)){send(response,401,{ok:false,message:'Browser authentication required'});return}
 if(request.url!=='/open'||request.method!=='POST'){send(response,404,{ok:false,message:'Unknown browser operation'});return}
 const controller=new AbortController();response.once('close',()=>controller.abort());
 try{
  const chunks=[];let size=0;for await(const chunk of request){size+=chunk.length;if(size>8192)throw Error('Browser request exceeds bound');chunks.push(chunk)}
  const input=JSON.parse(Buffer.concat(chunks));if(typeof input.url!=='string'||input.url.length>4096)throw Error('A bounded URL is required');
  send(response,200,await openPage(input.url,controller.signal));
 }catch(error){if(response.destroyed)return;send(response,400,{ok:false,message:String(error.message).slice(0,800)})}
});
server.requestTimeout=65000;server.headersTimeout=10000;server.listen(Number(process.env.PORT||7318),'0.0.0.0');
process.on('SIGTERM',()=>{server.close();browser.close().finally(()=>process.exit())});
