import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1280,height:800} })).newPage();
await p.goto('http://127.0.0.1:5302/', { waitUntil:'load' });
await p.waitForTimeout(14000);
await p.evaluate(() => window.__MD__.enter());
await p.waitForTimeout(5000);
await p.evaluate(()=>window.__MD_TP__(-7.3,42.6));
await p.waitForTimeout(600);
await p.evaluate(()=>window.__MD_WALK__(-7.2,41.6));
for (let i=0;i<6;i++){ await p.waitForTimeout(3000); if (await p.evaluate(()=>!!document.querySelector('[data-testid="seat-button"]'))) break; }
await p.click('[data-testid="seat-button"]');
await p.waitForTimeout(1400);
await p.evaluate(()=>window.__MD_FIXCAM__([-4.5,1.15,41.5],[-7.2,0.42,41.5]));
await p.waitForTimeout(1800);
console.log('action=', await p.evaluate(()=>window.__MD__.getSnapshot().action));
await p.screenshot({path:'/tmp/y_bench.png'});
await p.waitForTimeout(2400);
await p.screenshot({path:'/tmp/y_bench2.png'});
await b.close();
