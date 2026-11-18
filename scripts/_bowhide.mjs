import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const ctx = await b.newContext({ ...devices['iPhone 13'], isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(16000);
await p.evaluate(()=>window.__MD__?.enter?.());
await p.waitForTimeout(700);
await p.evaluate(()=>window.__MD_TP__(1.74,4.24));
await p.waitForTimeout(500);
await p.evaluate(()=>{ document.querySelectorAll('div,button,span,a').forEach(e=>{ e.style.visibility='hidden'; }); });
await p.evaluate(()=>window.__MD__.force('kowtow'));
for (let i=0;i<6;i++){ await p.waitForTimeout(1300); await p.screenshot({ path: `/tmp/bn${i}.png` }); }
await b.close();
