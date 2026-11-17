import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const ctx = await b.newContext({ ...devices['iPhone 13'], isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(6000);
await p.waitForFunction(()=>window.__MD__, null, {timeout: 30000});
await p.evaluate(()=>window.__MD__?.enter?.());
await p.waitForTimeout(1200);
await p.evaluate(()=>window.__MD__.bowNow());
for (let i=0;i<5;i++){ await p.waitForTimeout(4000); console.log(i, await p.evaluate(()=>window.__MD__.getSnapshot().action)); await p.screenshot({path:`/tmp/bf${i}.png`}); }
await b.close();
