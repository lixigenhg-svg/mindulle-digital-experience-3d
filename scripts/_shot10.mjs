import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1600,height:900}, deviceScaleFactor:2 })).newPage();
await p.goto('http://127.0.0.1:5303/', { waitUntil:'load' });
await p.waitForTimeout(14000);
await p.waitForSelector('text=법당 열기', { timeout:70000 }).catch(()=>{});
await p.click('text=법당 열기', { timeout:25000 }).catch(async ()=>{
  await p.evaluate(()=>localStorage.setItem('mindulle.entered','1'));
  await p.reload(); await p.waitForTimeout(16000);
});
await p.waitForTimeout(2500);
await p.evaluate(()=>window.__MD_TP__(0,33));
await p.waitForTimeout(2000);
await p.evaluate(()=>window.__MD_FACE__(Math.PI));
await p.evaluate(()=>window.__MD_CAM__(2.3,0.18,0));
await p.waitForTimeout(2500);
await p.screenshot({ path:'docs/screenshots/10-동승-근경.png', timeout:120000 });
console.log('拍完 10 正面');
await b.close();
