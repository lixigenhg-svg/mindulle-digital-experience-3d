import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1280,height:800} })).newPage();
await p.goto('http://127.0.0.1:5302/', { waitUntil:'load' });
await p.waitForTimeout(14000);
await p.evaluate(() => window.__MD__.enter());
await p.waitForTimeout(5000);
await p.evaluate(()=>window.__MD_TP__(-7.4,40.6));
await p.waitForTimeout(600);
await p.evaluate(()=>window.__MD_WALK__(-7.25,39.8));
for (let i=0;i<6;i++){
  await p.waitForTimeout(3000);
  if (await p.evaluate(()=>!!document.querySelector('[data-testid="seat-button"]'))) break;
}
await p.evaluate(()=>window.__MD_FIXCAM__([-8.6,1.0,37.8],[-7.25,0.34,39.6]));
await p.waitForTimeout(1200);
await p.click('[data-testid="seat-button"]');
await p.waitForTimeout(1600);
console.log('action=', await p.evaluate(()=>window.__MD__.getSnapshot().action));
await p.screenshot({path:'/tmp/x_bench.png'});
await p.waitForTimeout(2000);
await p.screenshot({path:'/tmp/x_bench2.png'});
await b.close();
