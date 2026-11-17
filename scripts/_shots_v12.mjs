import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1280,height:800} })).newPage();
await p.goto('http://127.0.0.1:5302/', { waitUntil:'load' });
await p.waitForTimeout(14000);
await p.evaluate(() => window.__MD__.enter());
await p.waitForTimeout(5000);
await p.evaluate(()=>window.__MD_TP__(-7.3,41.2));
await p.waitForTimeout(800);
await p.evaluate(()=>window.__MD_WALK__(-7.3,39.9));  // 走 1.3m 触发 onMove
for (let i=0;i<8;i++){
  await p.waitForTimeout(4000);
  const has = await p.evaluate(()=>!!document.querySelector('[data-testid="seat-button"]'));
  const pos = await p.evaluate(()=>window.__MD__.getSnapshot().player);
  console.log(i,'btn=',has,pos.x.toFixed(2),pos.z.toFixed(2));
  if (has) break;
}
await p.evaluate(()=>{const el=document.querySelector('[data-testid="seat-button"]'); if(el) el.click();});
await p.waitForTimeout(2600);
await p.evaluate(()=>window.__MD_FIXCAM__([-8.4,1.05,37.5],[-7.25,0.36,39.65]));
await p.waitForTimeout(2200);
await p.screenshot({path:'/tmp/w_bench.png'});
console.log('action=', await p.evaluate(()=>window.__MD__.getSnapshot().action));
await b.close();
