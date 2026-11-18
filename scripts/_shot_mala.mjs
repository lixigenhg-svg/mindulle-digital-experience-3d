import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1600,height:900}, deviceScaleFactor:2 })).newPage();
await p.goto('http://127.0.0.1:5303/', { waitUntil:'load' });
await p.waitForSelector('text=법당 열기', { timeout:70000 }).catch(()=>{});
await p.click('text=법당 열기', { timeout:25000 }).catch(()=>{});
await p.waitForTimeout(8000);
// 打开 108 佛珠轮盘
for (const sel of ['text=염주','[data-testid="mala-button"]','text=108 염주']) {
  try { await p.click(sel, { timeout:6000 }); console.log('打开轮盘:', sel); break; } catch {}
}
await p.waitForTimeout(3500);
await p.screenshot({ path:'docs/screenshots/11-108-염주.png', timeout:120000 });
console.log('拍完 11 佛珠');
await b.close();
