import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1280,height:800} })).newPage();
const errs=[]; p.on('pageerror', e=>errs.push(e.message.slice(0,120)));
await p.goto('http://127.0.0.1:5302/', { waitUntil:'load' });
await p.waitForTimeout(14000);
await p.evaluate(() => window.__MD__.enter());
await p.waitForTimeout(6000);
await p.evaluate(()=>window.__MD_TP__(0,21));
await p.waitForTimeout(2500);
const has = await p.evaluate(()=>!!document.querySelector('[data-testid="action-incense"]'));
console.log('incense-btn:', has);
if (has) await p.click('[data-testid="action-incense"]');
for (let i=0;i<6;i++){
  await p.waitForTimeout(1700);
  await p.screenshot({path:`/tmp/inc_${i}.png`});
  console.log(i, await p.evaluate(()=>window.__MD__.getSnapshot().action));
}
console.log('报错:', errs.length);
await b.close();
