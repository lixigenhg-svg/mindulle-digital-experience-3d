import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1600,height:900}, deviceScaleFactor:2 })).newPage();
await p.goto('http://127.0.0.1:5303/', { waitUntil:'load' });
await p.waitForTimeout(14000);
try { await p.click('text=법당 열기', { timeout:8000 }); } catch { localStorage.setItem('mindulle.entered','1'); await p.reload(); await p.waitForTimeout(14000); }
await p.waitForTimeout(2500);
const variants = [
  {f:'06-기원벽.png', tp:[-5.0,29.0], cam:[2.9,0.14,1.55]},
  {f:'06b.png', tp:[-5.0,29.0], cam:[2.9,0.14,-1.55]},
];
for (const v of variants){
  await p.evaluate(([x,z])=>window.__MD_TP__(x,z), v.tp);
  await p.waitForTimeout(2000);
  await p.evaluate(([d,pi,y])=>window.__MD_CAM__(d,pi,y), v.cam);
  await p.waitForTimeout(2000);
  await p.screenshot({ path:`docs/screenshots/${v.f}`, timeout:120000 });
  console.log('拍完', v.f);
}
await b.close();
