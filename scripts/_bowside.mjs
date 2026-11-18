import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const ctx = await b.newContext({ ...devices['iPhone 13'], isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(6000);
await p.waitForFunction(()=>window.__MD__, null, {timeout:30000});
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(1200);
await p.evaluate(()=>window.__MD_TP__(0, 20));
await p.waitForTimeout(1200);
await p.evaluate(()=>window.__MD__.bowNow());
await p.waitForTimeout(9000);
await p.evaluate(()=>window.__MD_CAM__(3.8, 0.42, 1.4));
for (let i=0;i<4;i++){ await p.waitForTimeout(1600); await p.screenshot({path:`/tmp/bs${i}.png`}); }
await b.close();
