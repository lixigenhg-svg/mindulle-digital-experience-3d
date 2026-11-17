import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const ctx = await b.newContext({ ...devices['iPhone 13'], isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(16000);
await p.evaluate(()=>window.__MD__?.enter?.());
await p.waitForTimeout(800);
await p.evaluate(()=>window.__MD_TP__(1.74,4.24));
await p.waitForTimeout(600);
for (let i=0;i<4;i++){
  await p.evaluate(()=>window.__MD__.force('kowtow'));
  await p.waitForTimeout(2200*(i+1));
  await p.screenshot({ path: `/tmp/bh${i}.png` });
}
await b.close();
