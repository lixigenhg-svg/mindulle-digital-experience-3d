import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const ctx = await b.newContext({ ...devices['iPhone 13'], isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(6000);
await p.waitForFunction(()=>window.__MD__, null, {timeout:30000});
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(1200);
await p.evaluate(()=>window.__MD_TP__(0.85, -5.3));
await p.evaluate(()=>window.__MD_FACE__(Math.atan2(-0.85, -1.65)));
await p.waitForTimeout(1200);
await p.evaluate(()=>window.__MD__.incenseNow());
const vs=[[4.4,0.30,-1.05],[4.0,0.34,-0.92],[4.8,0.32,-1.20]];
for (let i=0;i<vs.length;i++){ await p.evaluate(([d,pi,y])=>window.__MD_CAM__(d,pi,y), vs[i]); await p.waitForTimeout(1800); await p.screenshot({path:`/tmp/cx${i}.png`}); }
await b.close();
