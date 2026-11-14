import http from 'node:http';
http.createServer((request,response)=>{
 if(request.url==='/slow'){setTimeout(()=>response.end('<body>slow fixture</body>'),6000);return}
 if(request.url==='/redirect-private'){response.writeHead(302,{location:'http://127.0.0.1:7432/secret'});response.end();return}
 if(request.url==='/redirect-public'){response.writeHead(302,{location:'http://127.0.0.1:7431/article'});response.end();return}
 if(request.url==='/cookie'){response.setHeader('set-cookie','fixture=private; SameSite=Lax');response.end('<body>cookie set</body>');return}
 if(request.url==='/echo'){response.end('<body>cookie='+(request.headers.cookie||'absent')+'</body>');return}
 response.setHeader('content-type','text/html; charset=utf-8');response.end('<!doctype html><title>恒星资料测试页</title><link rel="stylesheet" href="http://127.0.0.1:7432/private.css"><body><h1>恒星演化的可核对资料</h1><p>这是本地确定性浏览器验收材料，并非科学结论。保留真实引号 "资料"、换行与来源。</p><a href="https://science.nasa.gov/universe/stars/">NASA 恒星资料入口</a><script>document.body.innerHTML="site JavaScript executed"</script></body>');
}).listen(7431,'127.0.0.1');
