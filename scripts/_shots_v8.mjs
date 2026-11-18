import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1280,height:800} })).newPage();
await p.goto('http://127.0.0.1:5302/', { waitUntil:'load' });
await p.waitForTimeout(14000);
await p.evaluate(() => window.__MD__.enter());
await p.waitForTimeout(8000);
await p.evaluate(()=>window.__MD_TP__(-7.2,39.4)); await p.waitForTimeout(1200);
await p.evaluate(()=>window.__MD_FIXCAM__([-8.1,1.05,37.4],[-7.2,0.40,39.5]));
await p.waitForTimeout(1500);
await p.evaluate(()=>window.__MD__.sitNow()); await p.waitForTimeout(2500);
await p.screenshot({path:'/tmp/t_bench.png'});
await p.waitForTimeout(2200);
await p.screenshot({path:'/tmp/t_bench2.png'});
console.log('ok');
await b.close();
