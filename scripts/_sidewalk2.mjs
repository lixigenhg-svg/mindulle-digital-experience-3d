import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const ctx = await b.newContext({ ...devices['iPhone 13'], isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(16000);
await p.evaluate(()=>window.__MD__?.enter?.());
await p.waitForTimeout(1500);
await p.evaluate(()=>window.__MD_TP__(0,44));
await p.waitForTimeout(1200);
await p.mouse.move(600, 880); await p.mouse.down(); await p.mouse.move(1150, 880, { steps: 20 }); await p.mouse.up();
await p.waitForTimeout(1200);
await p.evaluate(()=>window.__MD_WALK__(0,24));
for (let i=0;i<5;i++){ await p.waitForTimeout(1100); await p.screenshot({ path: `/tmp/sd${i}.png` }); }
const bones = await p.evaluate(()=>{ const s=window.__SCENE__; return window.__BONES__?.() ?? null; });
console.log('bones', JSON.stringify(bones));
await b.close();
