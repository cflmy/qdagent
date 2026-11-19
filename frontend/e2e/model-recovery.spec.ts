import {test,expect} from '@playwright/test';
test('restored local Qwen completes real Marqdo calls and displays execution below its avatar',async({page})=>{
 test.skip(process.env.QDAGENT_LIVE_LOCAL!=='1','需要已启动的本机 Qwen，显式选择真实模型验收。');
 test.setTimeout(1200000);
 await page.goto('/app');
 const origin=new URL(page.url()).origin,headers={Origin:origin};
 const created=await page.request.post('/api/tasks',{headers,data:{title:'本机模型恢复验收'}});expect(created.status()).toBe(201);const task=await created.json();let run='';
 try{
  await page.goto('/app?task='+task.id);await expect(page.getByLabel('任务内容')).toBeVisible();
  const requested=page.waitForResponse(r=>r.url().endsWith('/tasks/'+task.id+'/runs')&&r.request().method()==='POST');
  await page.getByLabel('任务内容').fill('请编写一个无参数的 Marqdo 函数，返回固定文字“连接恢复验证”。请先向我确认函数名。');
  await page.getByTitle('发送任务',{exact:true}).click();const response=await requested;expect(response.status()).toBe(202);run=(await response.json()).id;
  await expect(page.locator('.message.assistant .timeline')).toBeVisible();
  await expect.poll(async()=> (await(await page.request.get('/api/runs/'+run)).json()).run.status,{timeout:900000,intervals:[2000,4000]}).toBe('waiting_user');
  const receipt=await(await page.request.get('/api/runs/'+run)).json();
  expect(receipt.events.filter((e:any)=>e.kind==='provider_failure')).toHaveLength(0);
  expect(receipt.events.filter((e:any)=>e.kind==='call_checked').length).toBeGreaterThan(0);
  const usage=receipt.events.filter((e:any)=>e.kind==='model_usage');expect(usage.length).toBeGreaterThan(0);expect(usage.every((e:any)=>e.data.model==='builtin-local')).toBeTruthy();
  const avatar=await page.locator('.message.assistant>.avatar').last().boundingBox(),trace=await page.locator('.message.assistant .timeline').boundingBox();expect(trace!.y).toBeGreaterThanOrEqual(avatar!.y);
  await page.screenshot({path:'test-results/local-model-recovery.png',fullPage:true});
 }finally{
  if(run){await page.request.post('/api/runs/'+run+'/stop',{headers});await expect.poll(async()=>(await(await page.request.get('/api/runs/'+run)).json()).run.status,{timeout:15000}).not.toBe('running')}
  await page.request.patch('/api/tasks/'+task.id+'/archive',{headers,data:{archived:true}});await page.request.delete('/api/tasks/'+task.id,{headers});
 }
});
