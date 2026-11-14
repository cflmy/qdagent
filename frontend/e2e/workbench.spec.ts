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

test('real local model follows the mandatory root skill and human gates',async({page})=>{
 test.setTimeout(360000);
 await page.goto('/app');await page.getByRole('button',{name:'新建任务',exact:true}).click();
 await page.locator('.model-button').click();await page.locator('.model-card-select').filter({hasText:'本机 Qwen'}).click();await page.getByRole('button',{name:'确定',exact:true}).click();
 await page.getByRole('textbox',{name:'任务内容'}).fill('这是软件开发验收。请形成一个可调用的 Marqdo 文稿工程，只有两个独立函数：第一个返回用户给出的文本「材料甲」，第二个返回文本「材料乙」。不需要研究、联网或 Office，不要编造外部事实。请按根 SKILL 的所有阶段推进。');
 await page.getByRole('button',{name:'发送任务',exact:true}).click();
 const flow=page.getByRole('region',{name:'根 SKILL 流程'});
 await expect(flow.getByRole('button',{name:'确认意图并规划'})).toBeVisible({timeout:90000});
 await flow.getByRole('combobox',{name:'业务函数数量',exact:true}).selectOption('2');await flow.locator('input[type=radio]').first().check();await flow.locator('.root-freeform textarea').fill('确认固定文本就是‘材料甲’和‘材料乙’这两个字符串本身，各函数无论输入都直接返回这个字符串；不是等待我另行上传材料，不做输入转换，也不要实际研究。');
 await expect(flow.getByRole('button',{name:'确认意图并规划'})).toBeEnabled({timeout:15000});await flow.getByRole('button',{name:'确认意图并规划'}).click();
 await expect(flow.getByRole('button',{name:'确认框架，开始细化'})).toBeVisible({timeout:90000});
 await expect(page.frameLocator('.native-view').locator('body')).toContainText('尚未接通',{timeout:35000});
 const plannedTask=await page.evaluate(()=>localStorage.getItem('qd.task.v4'));
 let planned=(await (await page.request.get(`/api/tasks/${plannedTask}/workflow`)).json()).workflow;
 // Review the real proposal as a user would; a model proposal is not approval.
 for(let review=0;review<2&&JSON.stringify(planned.units.map((unit:any)=>unit.constant_text).sort())!==JSON.stringify(['材料甲','材料乙'].sort());review++){
  await flow.locator('.root-freeform textarea').fill('框架正文与我的原意不同，请重新规划两个固定正文职责。第一个 text_unit 的 content 逐字等于材料甲，第二个 content 逐字等于材料乙；不要包含“用户给出的文本”等描述、引号、书名号或其他字符。两个函数都忽略输入。');
  await flow.getByRole('button',{name:'调整方案',exact:true}).click();
  await expect(flow.getByRole('button',{name:'确认框架，开始细化'})).not.toBeVisible({timeout:15000});
  await expect(flow.getByRole('button',{name:'确认框架，开始细化'})).toBeVisible({timeout:90000});
  planned=(await (await page.request.get(`/api/tasks/${plannedTask}/workflow`)).json()).workflow;
 }
 expect(planned.units).toHaveLength(2);expect(planned.units.map((unit:any)=>unit.constant_text).sort()).toEqual(['材料甲','材料乙'].sort());
 await flow.locator('.root-settings-grid select').first().selectOption('2');
 await expect(flow.getByRole('button',{name:'确认框架，开始细化'})).toBeEnabled({timeout:15000});
 await page.screenshot({path:'test-results/root-framework-desktop.png',fullPage:true});
 await flow.getByRole('button',{name:'确认框架，开始细化'}).click();
 await expect(flow.getByRole('button',{name:'确认验收',exact:true})).toBeVisible({timeout:200000});
 await expect(page.frameLocator('.native-view').locator('body')).toContainText('用户交流记录',{timeout:35000});
 await expect(page.locator('.trace-step.succeeded').filter({hasText:'子智能体'}).first()).toBeVisible();
 await page.screenshot({path:'test-results/root-delivery-desktop.png',fullPage:true});
 await expect(flow.getByRole('button',{name:'确认验收',exact:true})).toBeEnabled({timeout:15000});await flow.getByRole('button',{name:'确认验收',exact:true}).click();
 await expect(flow).toContainText('四阶段流程已完成');
 const taskId=await page.evaluate(()=>localStorage.getItem('qd.task.v4'));const state=await (await page.request.get(`/api/tasks/${taskId}/workflow`)).json();
 expect(state.workflow.phase).toBe('complete');expect(state.workflow.units.every((unit:any)=>unit.trial.passed)).toBe(true);
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
  const taskId=await page.evaluate(()=>localStorage.getItem('qd.task.v4'));const listed=await (await page.request.get(`/api/tasks/${taskId}/files`)).json();const uploaded=listed.files.find((file:any)=>file.name.endsWith('native-acceptance.mq.md'));
  const {writeFile}=await import('node:fs/promises');const {fileURLToPath}=await import('node:url');await writeFile(fileURLToPath(new URL(`../../data/workspaces/${taskId}/${uploaded.path}`,import.meta.url)),content.replace('这里是一份通过官方 View 阅读的文稿','文稿更新已生效'));
  await page.locator('input[type=file]').setInputFiles({name:'refresh-evidence.md',mimeType:'text/markdown',buffer:Buffer.from('触发真实文件清单刷新。')});await expect(page.locator('.attachment-chips')).toContainText('refresh-evidence.md');await expect(page.locator('.document-source')).toContainText('文稿更新已生效',{timeout:35000});
  await page.locator('.document-toolbar').getByRole('button',{name:'阅读文稿',exact:true}).click();await expect(frame.locator('body')).toContainText('文稿更新已生效');
});
