import test from "node:test";
import assert from "node:assert/strict";
import {File} from "node:buffer";
import {applyEffects,eventArgsFromDom} from "../../../.marqdo/browser-abi.mjs";

test("bounded read_file ABI uses actual Blob ranges and preserves metadata",async()=>{
 const memory=new WebAssembly.Memory({initial:16});let cursor=16;const observed=[];
 const alloc=n=>{const p=cursor;cursor+=n+8;if(cursor>memory.buffer.byteLength)memory.grow(Math.ceil((cursor-memory.buffer.byteLength)/65536));return p;};
 const exports={memory,mq_alloc:alloc,mq_dealloc(){},mq_call(np,nl,ap,al){
  observed.push(JSON.parse(new TextDecoder().decode(new Uint8Array(memory.buffer,ap,al))));
  const raw=new TextEncoder().encode(JSON.stringify({ok:true,value:null}));const p=alloc(raw.length+4);
  new DataView(memory.buffer).setUint32(p,raw.length,true);new Uint8Array(memory.buffer,p+4,raw.length).set(raw);return p;
 }};
 const input={files:[new File([Buffer.alloc(50*1024*1024,97)],"fifty.bin",{type:"application/octet-stream"})]};
 globalThis.document={querySelector:()=>input,querySelectorAll:sel=>sel==="#file"?[input]:[]};
 globalThis.FileReader=class{readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result="data:"+blob.type+";base64,"+Buffer.from(b).toString("base64");this.onload();});}};
 const errors=[];
 const run=spec=>applyEffects(exports,{read_file:{sel:"#file",then:"observed",as:"data_url",...spec}},{onError:e=>errors.push(e)});
 await run({offset:50*1024*1024-32,length:262144});
 assert.equal(observed.at(-1).ok,true,JSON.stringify(observed.at(-1)));assert.equal(observed.at(-1).offset,50*1024*1024-32);
 assert.equal(observed.at(-1).total,50*1024*1024);assert.equal(observed.at(-1).read_size,32);
 assert.equal(Buffer.from(observed.at(-1).data_url.split(",")[1],"base64").toString(),"a".repeat(32));
 await run({offset:-1,length:262144});assert.equal(observed.at(-1).ok,false);
 await run({offset:0,length:1048577});assert.equal(observed.at(-1).ok,false);
 input.files=[new File(["legacy text"],"text.txt")];await run({as:"text"});
 assert.equal(observed.at(-1).body,"legacy text");
 input.files=[];await run({offset:0,length:16});assert.equal(observed.at(-1).ok,false);
 assert.deepEqual(errors,[]);
 delete globalThis.document;delete globalThis.FileReader;
});
test("delegation preserves business data-id independently of DOM id",()=>{
 const args=eventArgsFromDom({type:"click",target:{id:"dom-identity",getAttribute:n=>n==="data-id"?"business-identity":null}});
 assert.equal(args.id,"dom-identity");assert.equal(args.data_id,"business-identity");
});
