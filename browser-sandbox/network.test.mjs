import {test} from 'node:test';
import assert from 'node:assert/strict';
import {destination,publicAddress} from './network.mjs';
test('private, mapped and special addresses are never public',()=>{
 for(const address of ['127.0.0.1','10.1.2.3','169.254.169.254','172.17.0.1','192.168.0.1','100.64.0.1','0.0.0.0','224.0.0.1','::1','::ffff:127.0.0.1','fc00::1','fe80::1','2001::1','2001:db8::1','2002:7f00:1::'])assert.equal(publicAddress(address),false,address);
 for(const address of ['1.1.1.1','8.8.8.8','2606:4700:4700::1111'])assert.equal(publicAddress(address),true,address);
});
test('DNS rebinding and credentials cannot reach the transport',async()=>{
 await assert.rejects(()=>destination('https://example.com',{lookup:async()=>[{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}]}));
 for(const url of ['file:///etc/passwd','http://user:pass@example.com','http://169.254.169.254/latest/meta-data'])await assert.rejects(()=>destination(url));
});
