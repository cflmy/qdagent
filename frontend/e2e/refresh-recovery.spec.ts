import {test,expect} from '@playwright/test';
test('a browser reload mid-run restores the same run and its pending question',async({page})=>{
 test.skip(process.env.QDAGENT_LIVE_LOCAL!=='1','需要已启动的本机 Qwen，显式选择真实模型验收。');
 test.setTimeout(1200000);
 await page.goto('/app');
 const origin=new URL(page.url()).origin,headers={Origin:origin};
 const created=await page.request.post('/api/tasks',{headers,data:{title:'刷新恢复验收'}});
 expect(created.status()).toBe(201);
 const task=await created.json();let run='';
 try{
  await page.goto('/app?task='+task.id);
  await expect(page.getByLabel('任务内容')).toBeVisible();
  const requested=page.waitForResponse(r=>r.url().endsWith('/tasks/'+task.id+'/runs')&&r.request().method()==='POST');
  await page.getByLabel('任务内容').fill('请用两句话说明你的能力。');
  await page.getByTitle('发送任务',{exact:true}).click();
  const response=await requested;expect(response.status()).toBe(202);run=(await response.json()).id;
  await expect(page.locator('.message.assistant .timeline')).toBeVisible();
  // Reload while the run is still working: the page must resubscribe instead of
  // starting a second run, and it must still show the same run's progress.
  await page.reload();
  await expect(page.locator('.message.assistant .timeline')).toBeVisible({timeout:60000});
  const detail=await (await page.request.get(`/api/tasks/${task.id}`)).json();
  const ids=new Set((detail.messages||[]).map((item:any)=>item.run_id).filter(Boolean));
  expect(ids.size).toBe(1);
  expect(ids.has(run)).toBe(true);
  await expect.poll(async()=>(await(await page.request.get('/api/runs/'+run)).json()).run.status,{timeout:900000,intervals:[3000,5000]}).not.toBe('running');
  const receipt=await(await page.request.get('/api/runs/'+run)).json();
  // A reload must not change the run's truthful outcome: a small model may end
  // in an honest incomplete state, but never in a fabricated success and never
  // with transport failures blamed on the refresh.
  expect(['waiting_user','incomplete','failed']).toContain(receipt.run.status);
  expect(receipt.events.filter((e:any)=>e.kind==='provider_failure')).toHaveLength(0);
  if(receipt.run.status==='waiting_user'){
   // The restored page shows the same run's pending question without resubmitting.
   const flow=page.getByRole('region',{name:'根 SKILL 流程'});
   await expect(flow.getByRole('button',{name:'确认意图并规划'})).toBeVisible({timeout:120000});
  }else{
   await expect(page.locator('.message.assistant .timeline')).toBeVisible();
  }
  const before=await (await page.request.get(`/api/tasks/${task.id}`)).json();
  expect((before.messages||[]).length).toBe(1);
  expect((before.messages||[])[0].run_id).toBe(run);
  await page.screenshot({path:'test-results/refresh-recovery.png',fullPage:true});
 }finally{
  if(run){await page.request.post('/api/runs/'+run+'/stop',{headers})}
  await page.request.patch('/api/tasks/'+task.id+'/archive',{headers,data:{archived:true}});
  await page.request.delete('/api/tasks/'+task.id,{headers});
 }
});
