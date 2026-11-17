import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
const project=fileURLToPath(new URL('../../',import.meta.url));let knowledge:{key:string;name:string};
test.beforeAll(()=>{test.setTimeout(120000);knowledge=JSON.parse(execFileSync('python3',['tests/prepare_knowledge_browser.py','permissions-fixture'],{cwd:project,timeout:100000,encoding:'utf8'}))});
test.afterAll(()=>{if(knowledge?.key)fs.rmSync(path.join(project,'data/knowledge/public',knowledge.key),{recursive:true,force:true})});
test('real account permissions, public reading and visible quotas',async({page})=>{
 await page.goto('/app?section=knowledge');
 const origin=new URL(page.url()).origin,account=await (await page.request.get('/api/me')).json();
 await expect(page.getByRole('heading',{name:'公用知识库',exact:true})).toBeVisible();
 const card=page.locator('.library-card').filter({hasText:knowledge.name});await expect(card).toBeVisible();
 const popupPromise=page.waitForEvent('popup');await card.getByRole('link',{name:'查看详情'}).click();const popup=await popupPromise;
 await expect(popup.frameLocator('iframe.native-view').getByRole('heading',{name:knowledge.name,exact:true})).toBeVisible();
 await popup.getByRole('button',{name:'运行与验证',exact:true}).click();await popup.getByLabel('业务参数').fill('{"x":3}');await popup.getByRole('button',{name:'运行函数',exact:true}).click();await expect(popup.locator('.knowledge-result .receipt-scalar').filter({hasText:/^9$/})).toBeVisible();
 await expect(popup.getByLabel('将实际结果写回文稿')).toHaveCount(account.access.can_manage?1:0);await popup.close();
 if(account.access.can_manage){
  await expect(page.getByRole('button',{name:'编译新知识',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'权限与用量管理',exact:true}).click();
  await expect(page.getByRole('heading',{name:'普通用户默认额度',exact:true})).toBeVisible();
  const limits=page.getByLabel('智能模型每日请求',{exact:true});await limits.fill('51');
  await page.getByRole('button',{name:'保存默认额度',exact:true}).click();await expect(page.getByRole('status')).toContainText('额度已保存');
  await expect.poll(async()=> (await (await page.request.get('/api/admin/access')).json()).policy.smart_daily_limit).toBe(51);
  await limits.fill('50');await page.getByRole('button',{name:'保存默认额度',exact:true}).click();
  await expect.poll(async()=> (await (await page.request.get('/api/admin/access')).json()).policy.smart_daily_limit).toBe(50);
  await page.screenshot({path:'test-results/access-admin.png'});
 }else{
  await expect(page.getByRole('button',{name:'编译新知识',exact:true})).toHaveCount(0);
  for(const endpoint of ['prepare','publish']){const result=await page.request.post('/api/tasks/no-access/knowledge/'+endpoint,{headers:{Origin:origin},data:{}});expect(result.status()).toBe(403)}
  expect((await page.request.put('/api/admin/access',{headers:{Origin:origin},data:{task_limit:99,smart_daily_limit:99}})).status()).toBe(403);
  await page.getByRole('button',{name:'我的用量',exact:true}).click();await expect(page.locator('.access-metrics')).toContainText('50');await expect(page.locator('.access-metrics')).toContainText('4B 参数');await expect(page.getByRole('button',{name:'保存默认额度',exact:true})).toHaveCount(0);
  await page.screenshot({path:'test-results/access-reader.png'});
  await page.getByRole('button',{name:'关闭',exact:true}).click();
  const created:string[]=[];try{
   for(let i=0;i<3;i++){const result=await page.request.post('/api/tasks',{headers:{Origin:origin},data:{title:'额度浏览器验收 '+i}});expect(result.status()).toBe(201);created.push((await result.json()).id)}
   const excess=await page.request.post('/api/tasks',{headers:{Origin:origin},data:{title:'第四个任务应拒绝'}});expect(excess.status()).toBe(409);expect((await excess.json()).error.code).toBe('task_limit_reached');
  }finally{for(const id of created){await page.request.patch('/api/tasks/'+id+'/archive',{headers:{Origin:origin},data:{archived:true}});await page.request.delete('/api/tasks/'+id,{headers:{Origin:origin}})}}
 }
 await page.setViewportSize({width:390,height:844});await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});
