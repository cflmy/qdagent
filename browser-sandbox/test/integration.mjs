import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const token=fs.readFileSync(process.env.BROWSER_KEY_FILE,'utf8').trim();
async function open(url){return (await fetch('http://127.0.0.1:7318/open',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({url})})).json()}
test('empty and verification pages cannot become successful observations',async()=>{
 for(const route of ['empty','challenge']){const page=await open('http://127.0.0.1:7431/'+route);assert.equal(page.ok,false);assert.match(page.message,/readable article body|verification screen/)}
});
test('browser requires authentication and keeps Chromium namespace sandbox',async()=>{
 assert.equal((await fetch('http://127.0.0.1:7318/open',{method:'POST',body:'{}'})).status,401);
 const health=await(await fetch('http://127.0.0.1:7318/healthz')).json();assert.equal(health.sandbox,'chromium-user-namespace');assert.equal(health.ok,true);
});
test('real rendering preserves observation, blocks private subresources and site scripts',async()=>{
 const page=await open('http://127.0.0.1:7431/article');assert.equal(page.ok,true,page.message);assert.equal(page.title,'恒星资料测试页');assert.match(page.text,/恒星演化/);assert.doesNotMatch(page.text,/site JavaScript executed/);assert.equal(page.links[0].url,'https://science.nasa.gov/universe/stars/');assert.ok(page.blocked.some(item=>item.url.includes('7432/private.css')));assert.ok(Buffer.from(page.screenshot,'base64').subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));assert.equal(page.excerpt,page.text.slice(0,3000));
});
test('redirects are rechecked and cookies never cross operations',async()=>{
 const denied=await open('http://127.0.0.1:7431/redirect-private');assert.equal(denied.ok,false);
 assert.equal((await open('http://127.0.0.1:7431/redirect-public')).url,'http://127.0.0.1:7431/article');
 await open('http://127.0.0.1:7431/cookie');assert.match((await open('http://127.0.0.1:7431/echo')).text,/cookie=absent/);
 for(const url of ['http://169.254.169.254/','http://127.0.0.1:7432/','file:///etc/passwd'])assert.equal((await open(url)).ok,false,url);
});

test('disconnect cancels active browser work and releases both slots',async()=>{
 const controllers=[new AbortController(),new AbortController()];
 const waiting=controllers.map(controller=>fetch('http://127.0.0.1:7318/open',{method:'POST',signal:controller.signal,headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({url:'http://127.0.0.1:7431/slow'})}).catch(()=>null));
 await new Promise(resolve=>setTimeout(resolve,250));controllers.forEach(controller=>controller.abort());await Promise.all(waiting);
 const start=Date.now();const actual=await open('http://127.0.0.1:7431/article');assert.equal(actual.ok,true,actual.message);assert.ok(Date.now()-start<3000,'Cancelled pages retained their execution slots');
});
