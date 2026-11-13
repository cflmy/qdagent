import {expect,test} from '@playwright/test';
test('real Go API: models, plugins, workspace, upload and reader',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/app');await expect(page.getByRole('button',{name:'新建任务',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'新建任务',exact:true}).click();await expect(page.getByRole('textbox',{name:'任务内容'})).toBeVisible();
 await page.getByRole('textbox',{name:'任务内容'}).fill('这是一份尚未发送的草稿');
 await page.locator('.model-button').click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('heading',{name:'选择模型',exact:true})).toBeVisible();await expect(page.getByRole('dialog').getByText('本机 Qwen',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'添加模型',exact:true}).click();await expect(page.getByRole('heading',{name:'连接模型服务'})).toBeVisible();await expect(page.getByLabel('服务名称')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('textbox',{name:'任务内容'})).toHaveValue('这是一份尚未发送的草稿');
 await page.getByRole('button',{name:'插件',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('heading',{name:'标准库',exact:true})).toBeVisible();await expect(page.locator('.plugin-card').first().getByRole('checkbox')).toBeDisabled();await page.keyboard.press('Escape');
 const content='# 原生工作区文稿\n\n这份文件由真实上传接口保存，**并非静态示例**。';
 await page.locator('input[type=file]').setInputFiles({name:'browser-acceptance.md',mimeType:'text/markdown',buffer:Buffer.from(content)});
 await expect(page.locator('.attachment-chips')).toContainText('browser-acceptance.md');await page.getByRole('button',{name:'文件',exact:true}).click();await page.locator('.file-row').filter({hasText:'browser-acceptance.md'}).click();await expect(page.locator('.document-markdown')).toContainText('原生工作区文稿');
 await page.getByRole('button',{name:'打开源码',exact:true}).click();await expect(page.locator('.document-source')).toContainText('**并非静态示例**');
 const separator=page.getByRole('separator',{name:'调整侧栏宽度'});await separator.focus();await page.keyboard.press('ArrowRight');await expect(separator).toHaveAttribute('aria-valuenow','283');await separator.dblclick();await expect(separator).toHaveAttribute('aria-valuenow','267');
 await page.screenshot({path:'test-results/react-workbench-desktop.png',fullPage:true});expect(errors).toEqual([]);
 const icon=await page.request.get('/favicon.ico');expect(icon.status()).toBe(200);
});
test('mobile navigation, model dialog and composer fit viewport',async({page})=>{
 await page.setViewportSize({width:420,height:844});await page.goto('/app');await page.getByRole('button',{name:'展开导航'}).click();await expect(page.getByRole('button',{name:'新建任务',exact:true})).toBeVisible();await page.getByRole('button',{name:'新建任务',exact:true}).click();await page.locator('.model-button').click();await expect(page.getByRole('dialog')).toBeVisible();const box=await page.getByRole('dialog').boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(421);await page.getByRole('dialog').evaluate(async el=>{await Promise.all(el.getAnimations().map(a=>a.finished))});await page.screenshot({path:'test-results/react-model-mobile.png'});await page.keyboard.press('Escape');await expect(page.getByRole('textbox',{name:'任务内容'})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(420);
});

test('real local model invokes Marqdo tools and preserves expanded receipts',async({page})=>{
 test.setTimeout(180000);
 await page.goto('/app');await page.getByRole('button',{name:'新建任务',exact:true}).click();
 await page.locator('.model-button').click();await page.locator('.model-card-select').filter({hasText:'本机 Qwen'}).click();await page.getByRole('button',{name:'确定',exact:true}).click();
 await page.getByRole('textbox',{name:'任务内容'}).fill('这是浏览器开发验收。请实际用 write_file 创建 browser-tool-check.md，内容必须原样为「浏览器工具链已通过」，不要扩写、添加标题或日期，然后用 read_file 读取确认。不要只回复计划，完成后简短回复结果。');
 await page.getByRole('button',{name:'发送任务',exact:true}).click();
 const write=page.locator('.trace-step').filter({hasText:'write_file'}).first();await expect(write).toBeVisible({timeout:120000});await write.locator('summary').first().click();
 await expect(page.locator('.trace-step.succeeded').filter({hasText:'read_file'}).first()).toBeVisible({timeout:120000});await expect(write).toHaveAttribute('open','');
 await expect(page.locator('.message.assistant')).toBeVisible({timeout:120000});
 await page.getByRole('button',{name:'文件',exact:true}).click();await page.locator('.file-row').filter({hasText:'browser-tool-check.md'}).click();await expect(page.locator('.document-markdown')).toBeVisible();
 const taskId=await page.evaluate(()=>localStorage.getItem('qd.task.v4'));
 const snapshot=await (await page.request.get(`/api/tasks/${taskId}`)).json();const run=await (await page.request.get(`/api/runs/${snapshot.messages.at(-1).run_id}`)).json();
 const written=run.events.filter((event:any)=>event.kind==='tool_start'&&event.data.name==='write_file'&&event.data.arguments.path==='browser-tool-check.md').at(-1);expect(written).toBeTruthy();
 const saved=await (await page.request.get(`/api/tasks/${taskId}/preview?path=browser-tool-check.md`)).json();expect(saved.source).toBe(written.data.arguments.text);
 await page.getByRole('button',{name:'打开源码',exact:true}).click();await expect(page.locator('.document-source')).toHaveText(written.data.arguments.text);
 await page.screenshot({path:'test-results/react-live-agent.png',fullPage:true});
});


test('uploaded Marqdo source uses official read-only View',async({page})=>{
 await page.goto('/app');await page.getByRole('button',{name:'新建任务',exact:true}).click();
 const content='---\nmarkup: occlusion\ntitle: 原生文稿验收\n---\n\n## greeting\n\n这里是一份通过官方 View 阅读的文稿。我们[计算一个值](2 + 3)。\n\nReturn *2 + 3*.\n';
 await page.locator('input[type=file]').setInputFiles({name:'native-acceptance.mq.md',mimeType:'text/markdown',buffer:Buffer.from(content)});
 await expect(page.locator('.attachment-chips')).toContainText('native-acceptance.mq.md');
 await page.getByRole('button',{name:'文件',exact:true}).click();await page.locator('.file-row').filter({hasText:'native-acceptance.mq.md'}).click();
 await expect(page.frameLocator('.native-view').locator('body')).toContainText('这里是一份通过官方 View 阅读的文稿',{timeout:35000});
 await expect(page.frameLocator('.native-view').locator('body')).not.toContainText('View 无法完整解析');
 const frame=page.frameLocator('.native-view'),label=frame.locator('.occl-label').filter({hasText:'计算一个值'});await expect(label).toBeVisible();const note=await label.getAttribute('aria-describedby');await label.click();await expect(frame.locator(`[id="${note}"]`)).toHaveAttribute('open','');
 await page.getByRole('button',{name:'阅读文稿',exact:true}).click();await expect(frame.locator(`[id="${note}"]`)).toHaveAttribute('open','');
 await page.getByRole('button',{name:'打开源码',exact:true}).click();await expect(page.locator('.document-source')).toContainText('Return *2 + 3*');
});
