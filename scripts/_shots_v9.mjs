import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1280,height:800} })).newPage();
const errs=[]; p.on('pageerror', e=>errs.push(e.message.slice(0,120)));
await p.goto('http://127.0.0.1:5302/', { waitUntil:'load' });
await p.waitForTimeout(14000);
await p.evaluate(() => window.__MD__.enter());
await p.waitForTimeout(8000);
await p.evaluate(()=>window.__MD_TP__(-6.9,39.6)); await p.waitForTimeout(2000);
const hasBtn = await p.evaluate(()=>!!document.querySelector('[data-testid="seat-button"]'));
console.log('seat-btn:', hasBtn);
if (hasBtn) {
  await p.evaluate(()=>document.querySelector('[data-testid="seat-button"]').click());
  await p.waitForTimeout(1500);
  await p.evaluate(()=>window.__MD_FIXCAM__([-8.2,1.05,37.6],[-7.2,0.40,39.5]));
  await p.waitForTimeout(2000);
  await p.screenshot({path:'/tmp/u_bench.png'});
}
console.log('报错:', errs.length);
await b.close();
