import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
const project=fileURLToPath(new URL('../../',import.meta.url)),owner='migration-verification';
const proof=path.join(project,'.marqdo/studio-proof');
let knowledge:{key:string;name:string};
// The rendering proof runs inside the repository's own container image (no
// network, read-only root, unprivileged user) because it needs LibreOffice.
// Without Docker the proof cannot be produced, so these two cases are skipped
// explicitly instead of failing as if the product were broken.
const dockerAvailable=():boolean=>{try{execFileSync('docker',['version'],{stdio:'ignore'});return true}catch{return false}};
const needsDocker='requires Docker and the qdagent:local image (LibreOffice PDF export)';
test.beforeAll(()=>{test.setTimeout(240000);test.skip(!dockerAvailable(),needsDocker);
 const stamp=createHash('sha256');for(const file of ['ext/office/templates.json','ext/office/themes/index.mq.md','ext/office/package.mq.md','ext/native/libqdagent_transport.so','tests/verify_studio_render.py'])stamp.update(fs.readFileSync(path.join(project,file)));
 const digest=stamp.digest('hex');
 if(!fs.existsSync(path.join(proof,'stamp'))||fs.readFileSync(path.join(proof,'stamp'),'utf8')!==digest){
  fs.rmSync(proof,{recursive:true,force:true});fs.mkdirSync(proof,{recursive:true,mode:0o777});fs.chmodSync(proof,0o777);
  execFileSync('docker',['run','--rm','--network','none','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--user','10001:10001','--pids-limit','384','--memory','1536m','--tmpfs','/tmp:uid=10001,gid=10001,mode=1777,size=256m','--tmpfs','/app/data:uid=10001,gid=10001,mode=0700,size=128m','--mount',`type=bind,source=${project}/tests,target=/app/tests,readonly`,'--mount',`type=bind,source=${proof},target=/verification`,'--entrypoint','python3','qdagent:local','/app/tests/verify_studio_render.py','/verification'],{cwd:project,timeout:180000,stdio:'pipe'});
  fs.writeFileSync(path.join(proof,'stamp'),digest);
 }
 knowledge=JSON.parse(execFileSync('python3',['tests/prepare_knowledge_browser.py',owner],{cwd:project,timeout:120000,encoding:'utf8'}));
});
test.afterAll(()=>{if(knowledge?.key)fs.rmSync(path.join(project,'data/knowledge/public',knowledge.key),{recursive:true,force:true})});
test('actual parallel styles switch, compare and open in a separate large reader',async({page})=>{
 test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('/app');const response=await page.request.post('/api/tasks',{headers:{Origin:new URL(page.url()).origin},data:{title:'多风格产物体验验收'}});expect(response.ok()).toBeTruthy();const task=await response.json();fs.cpSync(path.join(proof,'workspace'),path.join(project,'data/workspaces',task.id),{recursive:true});
 await page.goto(`/app?task=${task.id}`);await expect(page.locator('.conversation .artifact-gallery').getByRole('heading',{name:'同一想法，不同表达'})).toBeVisible();await expect(page.locator('.reader-panel .artifact-gallery')).toHaveCount(0);await expect(page.locator('.reader-panel').getByRole('button',{name:'多方案',exact:true})).toHaveCount(0);await expect(page.locator('.artifact-variant')).toHaveCount(3);await expect.poll(()=>page.locator('.artifact-variant canvas').first().evaluate(c=>(c as HTMLCanvasElement).width),{timeout:25000}).toBeGreaterThan(500);await expect(page.locator('.artifact-variant .artifact-rendering')).toHaveCount(0);
 await page.locator('.artifact-variant').filter({hasText:'极夜星图'}).click();await expect(page.locator('.artifact-stage')).toHaveClass(/theme-midnight/);await page.getByRole('button',{name:'并排比较',exact:true}).click();await expect(page.locator('.artifact-stage')).toHaveCount(2);await page.getByRole('button',{name:'下一页',exact:true}).click();await expect(page.locator('.artifact-pagination')).toContainText('2');
 await expect(page.locator('.artifact-stage .artifact-rendering')).toHaveCount(0);await page.screenshot({path:'test-results/product-studio-comparison.png',fullPage:true});const popupPromise=page.waitForEvent('popup');await page.locator('.artifact-stage').first().getByTitle('在大屏中打开').click();const popup=await popupPromise;await expect(popup.locator('.artifact-fullscreen')).toBeVisible();await expect(popup.getByTitle('多格式文件预览')).toBeVisible();await popup.close();expect(errors).toEqual([]);
 expect((await page.request.patch(`/api/tasks/${task.id}/archive`,{headers:{Origin:new URL(page.url()).origin},data:{archived:true}})).ok()).toBeTruthy();expect((await page.request.delete(`/api/tasks/${task.id}`,{headers:{Origin:new URL(page.url()).origin}})).ok()).toBeTruthy();
});
test('knowledge has official View, frozen contracts, actual execution and source replay',async({page})=>{
 test.setTimeout(90000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`/app/knowledge?id=${knowledge.key}`);await expect(page.frameLocator('iframe[title="知识的 Marqdo View"]').getByRole('heading',{name:knowledge.name,exact:true})).toBeVisible();await expect(page.getByTitle('知识的 Marqdo View')).toBeVisible();const frame=page.frameLocator('iframe[title="知识的 Marqdo View"]');await expect(frame.locator('body')).toContainText('unit_u0',{timeout:25000});await frame.getByRole('link',{name:'查看原始来源',exact:true}).first().click();await expect(page.frameLocator('iframe[title="多格式文件预览"]').locator('body')).toContainText('Source evidence',{timeout:20000});await page.getByLabel('查看知识来源').selectOption('-1');await page.getByRole('button',{name:'运行与验证',exact:true}).click();await page.getByLabel('业务参数').fill('{"x": 3}');await page.getByRole('button',{name:'运行函数',exact:true}).click();await expect(page.locator('.knowledge-result .receipt-scalar').filter({hasText:/^9$/})).toBeVisible();
 await page.getByLabel('将实际结果写回文稿').check();await page.getByLabel('业务参数').fill('{"x": 4}');await page.getByRole('button',{name:'运行函数',exact:true}).click();await expect(page.locator('.knowledge-result .receipt-scalar').filter({hasText:/^16$/})).toBeVisible();await page.getByRole('button',{name:'关闭',exact:true}).click();await page.getByRole('button',{name:'源码',exact:true}).click();await expect(page.locator('.document-source')).toContainText('marqdo-out');
 await page.getByRole('button',{name:'运行与验证',exact:true}).click();await page.getByRole('button',{name:'复核冻结案例',exact:true}).click();await expect(page.locator('.knowledge-result')).toContainText('验证通过');await page.getByRole('button',{name:'关闭',exact:true}).click();await page.getByLabel('查看知识来源').selectOption('0');await expect(page.getByTitle('多格式文件预览')).toBeVisible();await expect(page.frameLocator('iframe[title="多格式文件预览"]').locator('body')).toContainText('Source evidence',{timeout:20000});await page.getByLabel('查看知识来源').selectOption('-1');await page.getByRole('button',{name:'View 阅读',exact:true}).click();await expect(page.frameLocator('iframe[title="知识的 Marqdo View"]').locator('body')).toContainText('unit_u0',{timeout:20000});await page.screenshot({path:'test-results/knowledge-studio-reproduction.png',fullPage:true});
 await page.getByRole('link',{name:'返回知识库'}).click();await page.getByRole('button',{name:'编译新知识',exact:true}).click();await expect(page.getByRole('heading',{name:'让知识，真正运行起来。'})).toBeVisible();await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();expect(errors).toEqual([]);
});
