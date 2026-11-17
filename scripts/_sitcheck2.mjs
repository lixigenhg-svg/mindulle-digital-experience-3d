import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const ctx = await b.newContext({ ...devices['iPhone 13'], isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(16000);
await p.evaluate(()=>window.__MD__?.enter?.());
await p.waitForTimeout(1000);
await p.evaluate(()=>window.__MD_TP__(2.2,4));
await p.waitForTimeout(1000);
await p.getByText('坐禅').first().click();
for (let i=0;i<3;i++){ await p.waitForTimeout(4000); await p.screenshot({ path: `/tmp/sv${i}.png` }); }
await b.close();
