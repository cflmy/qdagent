import {expect,test,type Page} from '@playwright/test';
import JSZip from 'jszip';

function pdfFixture(){
 const content='BT /F1 20 Tf 40 740 Td (QIUD AO PREVIEW 123456) Tj ET\n%'+ ' '.repeat(600000)+'\n';
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${content.length} >>\nstream\n${content}endstream`];
 let pdf='%PDF-1.4\n';const offsets=[0];objects.forEach((obj,index)=>{offsets.push(pdf.length);pdf+=`${index+1} 0 obj\n${obj}\nendobj\n`});const start=pdf.length;
 pdf+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
 return Buffer.from(pdf);
}
async function createTask(page:Page){
 await page.goto('/app');const saved=page.waitForResponse(r=>r.url().endsWith('/api/tasks')&&r.request().method()==='POST');await page.getByRole('button',{name:'新建任务',exact:true}).click();const task=await(await saved).json();await expect.poll(()=>page.evaluate(()=>localStorage.getItem('qd.task.v4'))).toBe(task.id);await expect(page.locator('input[type=file]')).toBeEnabled();return task;
}
async function openUpload(page:Page,name:string,mimeType:string,buffer:Buffer){
 await page.locator('input[type=file]').setInputFiles({name,mimeType,buffer});await expect(page.locator('.attachment-chips')).toContainText(name);await page.getByRole('button',{name:'文件',exact:true}).click();await page.locator('.file-row').filter({hasText:name}).click();
}
test('large PDF renders locally in isolated reader without exposing authenticated APIs',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await createTask(page);
 await openUpload(page,'large-preview.pdf','application/pdf',pdfFixture());
 const frame=page.frameLocator('iframe[title="多格式文件预览"]');await expect(frame.locator('canvas').first()).toBeVisible({timeout:30000});
 const child=page.frames().find(f=>f.url().endsWith('/file-viewer.html'))!;
 expect(await child.evaluate(()=>self.origin)).toBe('null');
 expect(await child.evaluate(async()=>{try{await fetch('/api/models',{credentials:'include'});return 'readable'}catch{return 'blocked'}})).toBe('blocked');
 await expect(page.getByText('文件过大，请下载查看',{exact:true})).toHaveCount(0);
 expect(errors).toEqual([]);await page.screenshot({path:'test-results/file-preview-pdf.png'});
});
test('editable DOCX previews text inside the same contained file reader',async({page})=>{
 await createTask(page);const zip=new JSZip();
 zip.file('[Content_Types].xml','<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
 zip.file('_rels/.rels','<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
 zip.file('word/document.xml','<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>求道真实文档预览 123456</w:t></w:r></w:p><w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr></w:body></w:document>');
 await openUpload(page,'editable-preview.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document',await zip.generateAsync({type:'nodebuffer'}));
 await expect(page.frameLocator('iframe[title="多格式文件预览"]').getByText('求道真实文档预览 123456',{exact:true})).toBeVisible({timeout:30000});
 await page.screenshot({path:'test-results/file-preview-docx.png'});
});
test('actual Marqdo-generated presentation previews in the isolated Office reader',async({page})=>{
 const {mkdtempSync,readFileSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');const {spawnSync}=await import('node:child_process');const {fileURLToPath}=await import('node:url');
 const project=fileURLToPath(new URL('../../',import.meta.url));const workspace=mkdtempSync(join(tmpdir(),'qd-ppt-preview-'));
 try{
  const result=spawnSync('marqdo',['call',join(project,'ext/office/presentation.mq.md'),'create','--args-json','-','--fs-root',project,'--effects','plugin,fs.read,fs.write,process.exec,environment.read,random.read','--json'],{cwd:project,input:JSON.stringify({title:'演示预览验收',slides:[{heading:'真实演示页',body:'这里是 Marqdo 实际生成的可编辑演示文字。'}],context:{project,workspace}}),encoding:'utf8',env:{...process.env,MARQDO_LIB:join(project,'lib'),MARQDO_EXT:join(project,'ext')}});
  const outer=JSON.parse(result.stdout);expect(outer.ok,JSON.stringify(outer.error)).toBe(true);expect(outer.result.ok,JSON.stringify(outer.result.error)).toBe(true);
  await createTask(page);await openUpload(page,'演示预览验收.pptx','application/vnd.openxmlformats-officedocument.presentationml.presentation',readFileSync(join(workspace,outer.result.value.path)));
  const frame=page.frameLocator('iframe[title="多格式文件预览"]');await expect(frame.locator('#file-viewer')).toContainText('演示预览验收',{timeout:30000});
  await expect(page.locator('.file-preview-error')).toHaveCount(0);await page.screenshot({path:'test-results/file-preview-marqdo-pptx.png'});
 }finally{rmSync(workspace,{recursive:true,force:true})}
});
