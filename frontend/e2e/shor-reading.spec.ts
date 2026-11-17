import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const project=fileURLToPath(new URL('../../',import.meta.url));
test('manual Shor article follows the paper and renders its formulas and connected calls',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/app');const origin=new URL(page.url()).origin;
 const response=await page.request.post('/api/tasks',{headers:{Origin:origin},data:{title:'Shor 手工编译阅读验收'}});expect(response.ok()).toBeTruthy();
 const task=await response.json(),root=path.join(project,'data/workspaces',task.id);
 try{
  const book=path.join(root,'solution');fs.mkdirSync(root,{recursive:true});
  fs.cpSync(path.join(project,'knowledge/quantum-classics/shor'),book,{recursive:true});
  fs.mkdirSync(path.join(book,'uploads'),{recursive:true});fs.copyFileSync(path.join(project,'.marqdo/quantum-classics/raw/Shor-1996-quant-ph-9508027v2.pdf'),path.join(book,'uploads/Shor-1996-quant-ph-9508027v2.pdf'));
  await page.goto('/app/view?task='+task.id+'&path=solution/index.mq.md');
  await expect(page.locator('.file-browser,.reader-tabs,.workspace-header')).toHaveCount(0);
  const frame=page.frameLocator('iframe.native-view');
  await expect(frame.getByRole('heading',{name:'Shor：从量子干涉到整数分解',exact:true})).toBeVisible();
  const titles=await frame.locator('.doc-fun-title').allTextContents();
  expect(titles.slice(0,8)).toEqual(['引言','量子计算','可逆逻辑与模幂','量子傅里叶变换','质因数分解','离散对数','讨论与开放问题','附录：调用与复现']);
  await expect.poll(()=>frame.locator('.katex-display').count()).toBeGreaterThanOrEqual(20);
  await expect.poll(()=>frame.locator('.doc-prose .katex').count()).toBeGreaterThan(40);
  await expect(frame.locator('.katex-error')).toHaveCount(0);
  const prose=(await frame.locator('.doc-prose').allTextContents()).join('\n');
  expect(prose).not.toContain('用户交流记录');expect(prose).not.toContain('测试不得');expect(prose).not.toContain('We **');expect(prose).not.toContain('&&#35;');
  expect(prose).toContain('相对的正负号改变了干涉');expect(prose).toContain('没有把三寄存器求解器宣称为已经实现');
  await expect.poll(()=>frame.locator('.reader-connector').count()).toBeGreaterThan(0);
  await page.screenshot({path:'test-results/shor-manual-reading.png'});
  await page.setViewportSize({width:390,height:844});
  await expect.poll(()=>frame.locator('body').evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  expect(errors).toEqual([]);
 }finally{await page.request.patch('/api/tasks/'+task.id+'/archive',{headers:{Origin:origin},data:{archived:true}});await page.request.delete('/api/tasks/'+task.id,{headers:{Origin:origin}});}
});
