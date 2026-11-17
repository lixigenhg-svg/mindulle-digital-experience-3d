import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1280,height:800} })).newPage();
await p.goto('http://127.0.0.1:5302/', { waitUntil:'load' });
await p.waitForTimeout(14000);
await p.evaluate(() => window.__MD__.enter());
await p.waitForTimeout(6000);
console.log('snap0', JSON.stringify(await p.evaluate(()=>window.__MD__.getSnapshot?.()||{}).catch?.(()=>null)));
await p.evaluate(()=>window.__MD_TP__(-7.4,39.6));
await p.waitForTimeout(1500);
console.log('snap1', JSON.stringify(await p.evaluate(()=>window.__MD__.getSnapshot?.()||{})));
await p.evaluate(()=>window.__MD_TP__(-7.0,39.5));
await p.waitForTimeout(2500);
console.log('btn', await p.evaluate(()=>!!document.querySelector('[data-testid="seat-button"]')));
console.log('snap2', JSON.stringify(await p.evaluate(()=>window.__MD__.getSnapshot?.()||{})));
await b.close();
