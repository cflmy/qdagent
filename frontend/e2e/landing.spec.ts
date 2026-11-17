import {expect,test} from '@playwright/test';

test('public homepage follows the design grid without authentication requests',async({page})=>{
 await page.setViewportSize({width:1003,height:1568});
 const errors:string[]=[];const privateRequests:string[]=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/api/'))privateRequests.push(r.url())});
 await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 await expect(page.getByRole('heading',{level:1})).toHaveText('让知识，成为行动。');
 await expect(page.getByRole('link',{name:'进入工作台'})).toHaveAttribute('href','/app');
 await expect(page.getByRole('link',{name:'开始使用求道',exact:true})).toHaveAttribute('href','/login');
 const positions=await page.evaluate(()=>Object.fromEntries(['.lp-header','.lp-hero','.lp-document','.lp-workflow','.lp-section-heading','.lp-feature-grid','.lp-cta','.lp-footer'].map(selector=>{const r=document.querySelector(selector)!.getBoundingClientRect();return [selector,{x:r.x,y:r.y,width:r.width,height:r.height}]})));
 console.log('design grid',positions);
 expect(positions['.lp-document'].x).toBeCloseTo(486,0);expect(positions['.lp-document'].y).toBeCloseTo(130,0);
 expect(positions['.lp-workflow'].y).toBeCloseTo(785,0);
 expect(Math.abs(positions['.lp-feature-grid'].y-1070)).toBeLessThan(1);expect(Math.abs(positions['.lp-cta'].y-1329)).toBeLessThan(1);expect(Math.abs(positions['.lp-footer'].y-1500)).toBeLessThan(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(1003);
 expect(errors).toEqual([]);expect(privateRequests).toEqual([]);
 await page.screenshot({path:'docs/design/assets/landing-v1-implemented.png',fullPage:true});
});

test('homepage adapts to mobile without clipped text or horizontal overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
 await expect(page.getByRole('heading',{level:1})).toBeVisible();await expect(page.getByRole('link',{name:'进入工作台'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
 for(const selector of ['.lp-document','.lp-workflow','.lp-feature-grid','.lp-cta']){const box=await page.locator(selector).boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(390)}
 await page.screenshot({path:'docs/design/assets/landing-v1-mobile.png',fullPage:true});
});

test('login failure returns a readable retry state and workspace requires authentication',async({page})=>{
 await page.goto('/?auth_error=discovery');await expect(page.getByRole('alert')).toContainText('暂时未能连接统一身份站');await expect(page.getByRole('link',{name:'重新登录'})).toHaveAttribute('href','/login');
 await page.getByRole('button',{name:'关闭登录提示'}).click();await expect(page.getByRole('alert')).not.toBeVisible();
 await page.route('**/api/me',route=>route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({error:{message:'请先登录'}})}));
 await page.goto('/app');await expect(page.getByRole('alert')).toContainText('登录后，进入你的工作台');await expect(page.getByRole('button',{name:'新建任务',exact:true})).not.toBeVisible();
});


test('wide desktop and tablet preserve containment and navigation',async({page})=>{
 for(const width of [1440,1920,820]){
  await page.setViewportSize({width,height:1000});await page.goto('/');await page.evaluate(()=>document.fonts.ready);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
  for(const selector of ['.lp-header','.lp-document','.lp-workflow','.lp-cta']){const box=await page.locator(selector).boundingBox();expect(box!.x).toBeGreaterThanOrEqual(0);expect(box!.x+box!.width).toBeLessThanOrEqual(width)}
 }
});
