import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1280,height:800} })).newPage();
await p.goto('http://127.0.0.1:5302/', { waitUntil:'load' });
await p.waitForTimeout(14000);
await p.evaluate(() => window.__MD__.enter());
await p.waitForTimeout(5000);
await p.evaluate(()=>window.__MD_WALK__(-7.3,39.6));
for (let i=0;i<12;i++){
  await p.waitForTimeout(5000);
  const has = await p.evaluate(()=>!!document.querySelector('[data-testid="seat-button"]'));
  const pos = await p.evaluate(()=>{const s=window.__MD__.getSnapshot();return s.player;});
  console.log(i, 'btn=',has, JSON.stringify(pos));
  if (has) break;
}
await p.evaluate(()=>{const el=document.querySelector('[data-testid="seat-button"]'); if(el) el.click();});
await p.waitForTimeout(2600);
await p.evaluate(()=>window.__MD_FIXCAM__([-8.4,1.05,37.6],[-7.25,0.36,39.6]));
await p.waitForTimeout(2200);
await p.screenshot({path:'/tmp/v_bench.png'});
console.log('snap', JSON.stringify(await p.evaluate(()=>window.__MD__.getSnapshot().action)));
await b.close();
