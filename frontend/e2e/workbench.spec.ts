import {expect,test} from '@playwright/test';
test('real Go API: models, plugins, workspace, upload and reader',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/app');await expect(page.getByRole('button',{name:'新建任务',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'新建任务',exact:true}).click();await expect(page.getByRole('textbox',{name:'任务内容'})).toBeVisible();
 await page.getByRole('textbox',{name:'任务内容'}).fill('这是一份尚未发送的草稿');
 await page.locator('.model-button').click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('heading',{name:'选择模型',exact:true})).toBeVisible();await expect(page.getByRole('dialog').getByText('本机 Qwen',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'添加模型',exact:true}).click();await expect(page.getByRole('heading',{name:'连接模型服务'})).toBeVisible();await expect(page.getByLabel('服务名称')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('textbox',{name:'任务内容'})).toHaveValue('这是一份尚未发送的草稿');
 await page.getByRole('button',{name:'插件',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('heading',{name:'标准库',exact:true})).toBeVisible();await expect(page.getByRole('dialog').getByText('隔离浏览器与真实来源',{exact:true})).toBeVisible();await expect(page.locator('.plugin-card').first().getByRole('checkbox')).toBeDisabled();await page.keyboard.press('Escape');
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
 expect(state.workflow.units.every((unit:any)=>unit.path==='solution/index.mq.md'&&unit.function===`unit_${unit.id}`)).toBe(true);
 const titled=await(await page.request.get(`/api/tasks/${taskId}`)).json();expect(titled.task.title).not.toBe('新任务');
 expect(state.workflow.intent_tasks.length).toBeGreaterThan(0);expect(state.workflow.units.every((unit:any)=>unit.intent_id&&unit.route?.document)).toBe(true);
 const listed=await(await page.request.get(`/api/tasks/${taskId}/files`)).json();
 for(const unit of state.workflow.units){if(!unit.artifact)continue;
  const file=listed.files.find((file:any)=>file.path===unit.artifact.path);expect(file).toBeTruthy();expect(file.name).not.toMatch(/^u\d+\.md$/);
  await page.locator(`.tree-file[data-file-path="${file.path}"]`).click();await expect(page.locator('.reader-file strong')).toHaveText(file.name);await expect(page.locator('.document-markdown')).toContainText(unit.constant_text);
  const download=await page.request.get(`/api/tasks/${taskId}/download?path=${encodeURIComponent(file.path)}`);expect(download.headers()['content-disposition']).not.toMatch(/filename=u\d+\.md/);
 }

 let writes=0;page.on('request',request=>{if(request.method()==='POST'&&/\/(runs|workflow\/respond)$/.test(new URL(request.url()).pathname))writes++});
 for(const title of ['意图拆解','基本方案','按函数段并行','方案落地']){
  await flow.getByRole('button',{name:`查看${title}`,exact:true}).click();
  const history=flow.getByRole('region',{name:'阶段回看'});await expect(history).toBeVisible();await expect(history).toContainText('只读回看');
  await expect(history.getByRole('button',{name:/确认/})).toHaveCount(0);
  if(title==='意图拆解')await expect(history).toContainText('材料甲');
  if(title==='基本方案'){
   await history.getByRole('button',{name:'阅读当时的实际文稿',exact:false}).click();
   await expect(page.frameLocator('.native-view').locator('body')).toContainText('尚未接通',{timeout:35000});
  }
 }
 expect(writes).toBe(0);await page.reload();await page.getByRole('button',{name:'查看意图拆解',exact:true}).click();await expect(page.getByRole('region',{name:'阶段回看'})).toContainText('材料甲');
 const preserved=await(await page.request.get(`/api/tasks/${taskId}/workflow`)).json();expect(preserved.workflow.phase).toBe('complete');
 await page.screenshot({path:'test-results/completed-intent-history.png',fullPage:true});

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

test('workspace tree keeps duplicate readable filenames and exact download identity',async({page})=>{
 await page.goto('/app');await page.getByRole('button',{name:'新建任务',exact:true}).click();
 for(const content of ['第一份上传材料','第二份上传材料']){
  await page.locator('input[type=file]').setInputFiles({name:'项目说明.md',mimeType:'text/markdown',buffer:Buffer.from(content)});
  await expect(page.locator('.attachment-chips')).toContainText('项目说明.md');
  await expect(page.locator('.attachment-chips>span')).toHaveCount(content.startsWith('第一')?1:2);
 }
 const taskId=await page.evaluate(()=>localStorage.getItem('qd.task.v4'));
 const listing=await(await page.request.get(`/api/tasks/${taskId}/files`)).json();
 expect(listing.files).toHaveLength(2);expect(listing.files.every((file:any)=>file.name==='项目说明.md')).toBe(true);
 const {mkdir,writeFile}=await import('node:fs/promises');const {fileURLToPath}=await import('node:url');
 const nested=fileURLToPath(new URL(`../../data/workspaces/${taskId}/solution/chapters`,import.meta.url));await mkdir(nested,{recursive:true});await writeFile(`${nested}/概述.md`,'工程中的可读概述');
 await page.reload();await page.getByRole('button',{name:'文件',exact:true}).click();
 const tree=page.getByRole('tree',{name:'工作区文件树'});await expect(tree.getByRole('treeitem',{name:'solution',exact:true})).toBeVisible();
 const rows=tree.locator('.tree-file').filter({hasText:'项目说明.md'});await expect(rows).toHaveCount(2);await expect(rows.nth(0)).toContainText('同名文件 1');await expect(rows.nth(1)).toContainText('同名文件 2');
 for(let i=0;i<2;i++){
  await rows.nth(i).click();await expect(page.locator('.reader-file strong')).toHaveText('项目说明.md');
  const stored=await page.locator('.reader-footer a').getAttribute('href');expect(stored).toContain(encodeURIComponent('uploads/'));
  const expected=await(await page.request.get(stored!)).text();await expect(page.locator('.document-markdown')).toHaveText(expected);
  const download=await page.request.get(stored!);expect(download.headers()['content-disposition']).toContain(encodeURIComponent('项目说明.md'));expect(download.headers()['content-disposition']).not.toMatch(/[a-f0-9]{12}-/);
 }
 await expect(tree).not.toContainText(/[a-f0-9]{12}-/);
 const folder=tree.getByRole('treeitem',{name:'solution',exact:true});await folder.getByRole('button',{name:'solution',exact:false}).first().click();await expect(tree.getByRole('treeitem').filter({hasText:'概述.md'}).last()).not.toBeVisible();
 await folder.getByRole('button').first().click();await tree.locator('.tree-file').filter({hasText:'概述.md'}).click();await expect(page.locator('.document-markdown')).toContainText('工程中的可读概述');
 await page.screenshot({path:'test-results/workspace-readable-tree.png',fullPage:true});
});
