import {expect,test} from '@playwright/test';
test('execution receipts show native source and decoded diagnostics with protocol closed',async({page})=>{
 const task={id:'receipt-task',title:'执行文稿可读性验收',status:'incomplete',created_ms:Date.now()};
 const source='`article` =\n````markdown\n# 真实正文\n\n这里保留 "引号" 与原生换行。\n````\nReturn *[发表文章](api.write_document(content=`article`,narrative="真实材料依据"))*.\n';
 const messages=[{turn:0,question:'阅读执行记录',answer:'本次验证尚未完成，请核对实际诊断。',run_id:'receipt-run',status:'incomplete'}];
 const events=[{kind:'tool_start',data:{id:'call-1',name:'api.write_document',arguments:{source}}},{kind:'tool_end',data:{id:'call-1',status:'failed',result:{ok:false,error:{code:'root.invalid_source',message:JSON.stringify({syntax:{error:{code:'syntax.unexpected',message:'缺少右括号，请核对当前函数。',span:{file:'article.mq.md',line:14}}}})}}}},{kind:'browser_start',data:{id:'research',url:'https://example.com/'}},{kind:'browser_end',data:{id:'research',status:'succeeded',url:'https://example.com/',title:'实际网页来源',fetched_at:'2026-11-15T00:00:00Z',snapshot:'evidence/browser/research/page.md',screenshot:'evidence/browser/research/page.png',excerpt:'这里只展示实际观察的摘录。'}},{kind:'search_start',data:{id:'research',query:'真实查询'}},{kind:'search_end',data:{id:'research',status:'succeeded',query:'真实查询',results:[{url:'https://example.com/source',title:'候选页面',excerpt:'这条摘要尚未打开。'}],unresponsive_engines:[['example-engine','timeout']]}},{kind:'ocr_start',data:{id:'research',file:'uploads/material.pdf'}},{kind:'ocr_end',data:{id:'research',file:'uploads/material.pdf',state:'pending',status:'pending'}}].map((e,index)=>({...e,seq:index+1,run_id:'receipt-run',created_ms:Date.now()}));
 await page.addInitScript(()=>localStorage.setItem('qd.task.v4','receipt-task'));
 await page.route('**/api/tasks',route=>route.fulfill({json:{tasks:[task]}}));
 await page.route('**/api/tasks/receipt-task',route=>route.fulfill({json:{task,messages}}));
 await page.route('**/api/tasks/receipt-task/files',route=>route.fulfill({json:{files:[]}}));
 await page.route('**/api/runs/receipt-run/events',route=>route.fulfill({contentType:'text/event-stream',body:events.map(e=>'event: update\ndata: '+JSON.stringify(e)+'\n\n').join('')+'event: complete\ndata: {"status":"incomplete"}\n\n'}));
 await page.goto('/app');await expect(page.locator('.trace-step')).toHaveCount(4);
 await expect(page.locator('.message.assistant .timeline')).toHaveCount(1);
 const avatar=await page.locator('.message.assistant>.avatar').boundingBox(),timeline=await page.locator('.message.assistant .timeline').boundingBox();expect(avatar).toBeTruthy();expect(timeline).toBeTruthy();expect(timeline!.y).toBeGreaterThanOrEqual(avatar!.y);expect(timeline!.x).toBeGreaterThan(avatar!.x);
 await expect(page.locator('.trace-step').first()).toHaveAttribute('open','');
 await expect(page.locator('.receipt-source pre')).toHaveText(source);
 await expect(page.locator('.receipt-diagnostic').getByText('缺少右括号，请核对当前函数。',{exact:true})).toBeVisible();
 await expect(page.getByText('article.mq.md:14',{exact:true})).toBeVisible();
 for(const details of await page.locator('.receipt-debug').all())expect(await details.getAttribute('open')).toBeNull();
 await page.locator('.trace-step').nth(1).locator(':scope>summary').click();
 await expect(page.locator('.browser-observation').getByRole('link',{name:'https://example.com/',exact:true})).toHaveAttribute('href','https://example.com/');
 await expect(page.getByRole('button',{name:'查看实际截图',exact:true})).toBeEnabled();
 await page.locator('.trace-step').nth(2).locator(':scope>summary').click();
 await expect(page.locator('.search-observation')).toContainText('搜索摘要 · 尚未打开网页');
 await expect(page.locator('.search-observation').getByRole('link',{name:'候选页面'})).toHaveAttribute('href','https://example.com/source');
 await page.locator('.trace-step').nth(3).locator(':scope>summary').click();
 await expect(page.locator('.trace-step').nth(3).locator('.trace-state')).toContainText('等待文字识别');
 await expect(page.locator('.ocr-observation')).toContainText('已提交，等待识别');
 await page.screenshot({path:'test-results/native-execution-receipts.png',fullPage:true});
});
test('authenticated image upload previews real PNG with safe inline headers',async({page})=>{
 await page.goto('/app');const created=page.waitForResponse(response=>response.url().endsWith('/api/tasks')&&response.request().method()==='POST');await page.getByRole('button',{name:'新建任务',exact:true}).click();const task=await(await created).json();await expect.poll(()=>page.evaluate(()=>localStorage.getItem('qd.task.v4'))).toBe(task.id);await expect(page.locator('input[type=file]')).toBeEnabled();
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jVioAAAAASUVORK5CYII=','base64');
 await page.locator('input[type=file]').setInputFiles({name:'actual-screenshot.png',mimeType:'image/png',buffer:png});
 await expect(page.locator('.attachment-chips')).toContainText('actual-screenshot.png');
 await page.getByRole('button',{name:'文件',exact:true}).click();await page.locator('.file-row').filter({hasText:'actual-screenshot.png'}).click();
 const image=page.frameLocator('iframe[title="多格式文件预览"]').locator('img').first();await expect(image).toBeVisible();await expect(image).toHaveJSProperty('naturalWidth',1);
 const download=await page.locator('.reader-footer').getByRole('link',{name:'下载',exact:true}).getAttribute('href');const response=await page.request.get(download!+'&inline=1');expect(response.headers()['content-type']).toBe('image/png');expect(response.headers()['content-disposition']).toBe('inline');expect(response.headers()['x-content-type-options']).toBe('nosniff');
});
test('parameter checks and repair evidence are readable without opening raw protocol',async({page})=>{
 const task={id:'repair-receipt',title:'可读校验与恢复',status:'incomplete',created_ms:Date.now()};
 const check={function:'api.write_text',intent:'保存正文',parameters:[{name:'content',known:true,type:'text',preview:'当前函数的真实正文'},{name:'narrative',known:false}]};
 const events=[
  {kind:'call_check',data:{id:'x',call_id:'x'}},
  {kind:'call_rejected',data:{id:'x',call_id:'x',result:{ok:false,error:{code:'call.missing_arg',message:'缺少必填参数 content'}}}},
  {kind:'recovery',data:{cause:'缺少必填参数 content',advice:'对照当前参数表补全真实正文，不修改冻结测试。',failed_call:'Return *api.write_text()*.',count:1,saved:true}},
  {kind:'call_check',data:{id:'y',call_id:'y'}},
  {kind:'call_checked',data:{id:'y',call_id:'y',status:'succeeded',validation:{checks:[check]}}},
  {kind:'tool_start',data:{id:'y',call_id:'y',name:'api.write_text',arguments:{source:'Return *[保存正文](api.write_text(content="当前函数的真实正文"))*.'}}},
  {kind:'tool_end',data:{id:'y',call_id:'y',status:'succeeded',result:{ok:true,value:{ready:true,title:'真实正文已保存'}}}},
  {kind:'recovery',data:{cause:'缺少必填参数 content',advice:'对照当前参数表补全真实正文，不修改冻结测试。',count:1,saved:true,followup_succeeded:true,success_call:'Return *[保存正文](api.write_text(content="当前函数的真实正文"))*.'}}
 ].map((e,index)=>({...e,seq:index+1,run_id:'repair-run',created_ms:Date.now()}));
 await page.addInitScript(()=>localStorage.setItem('qd.task.v4','repair-receipt'));
 await page.route('**/api/tasks',route=>route.fulfill({json:{tasks:[task]}}));
 await page.route('**/api/tasks?archived=1',route=>route.fulfill({json:{tasks:[]}}));
 await page.route('**/api/tasks/repair-receipt',route=>route.fulfill({json:{task,messages:[{turn:0,question:'检查实际参数',answer:'请核对实际记录',run_id:'repair-run',status:'incomplete'}]}}));
 await page.route('**/api/tasks/repair-receipt/files',route=>route.fulfill({json:{files:[]}}));
 await page.route('**/api/runs/repair-run/events',route=>route.fulfill({contentType:'text/event-stream',body:events.map(e=>'event: update\ndata: '+JSON.stringify(e)+'\n\n').join('')+'event: complete\ndata: {"status":"incomplete"}\n\n'}));
 await page.goto('/app');await expect(page.locator('.trace-step')).toHaveCount(5);
 await expect(page.locator('.trace-validation').first()).toHaveAttribute('open','');await expect(page.locator('.recovery-advice').first()).toContainText('不修改冻结测试');
 await expect(page.locator('.call-validation').first()).toContainText('当前函数的真实正文');await expect(page.locator('.call-validation').first()).toContainText('执行时复核');
 await expect(page.locator('.recovery-record').last()).toContainText('这次调用成功，原职责是否完成仍以实际验证为准');
 for(const details of await page.locator('.receipt-debug').all())expect(await details.getAttribute('open')).toBeNull();
 await page.locator('.trace-tool>summary').click();await expect(page.locator('.trace-tool .receipt-return')).toContainText('真实正文已保存');
 await page.locator('.trace-validation').first().locator(':scope>summary').click();await expect(page.locator('.trace-validation').first()).not.toHaveAttribute('open','');
 await page.screenshot({path:'test-results/readable-call-recovery.png',fullPage:true});
});
