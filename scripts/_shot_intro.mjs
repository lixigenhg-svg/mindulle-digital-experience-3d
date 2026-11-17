import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1600,height:900}, deviceScaleFactor:2 })).newPage();
await p.goto('http://127.0.0.1:5303/', { waitUntil:'load' });
// 先拍真正的入口封面（还没点进入）
await p.waitForSelector('text=법당 열기', { timeout:70000 }).catch(()=>{});
await p.waitForTimeout(3000);
await p.screenshot({ path:'docs/screenshots/01-입구-데스크톱.png', timeout:120000 });
console.log('拍完 01 封面');
await p.click('text=법당 열기', { timeout:25000 }).catch(()=>{});
await p.waitForTimeout(6000);
await p.evaluate(()=>window.__MD_TP__(0,24.8));
await p.waitForTimeout(2500);
await p.evaluate(()=>window.__MD_CAM__(2.6,0.30,0));
await p.waitForTimeout(2500);
await p.screenshot({ path:'docs/screenshots/05-불상-근경.png', timeout:120000 });
console.log('拍完 05 佛坛近景');
await b.close();
