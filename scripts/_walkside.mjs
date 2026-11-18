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
// 拖拽把镜头转到侧后方 45 度
await p.mouse.move(200, 900); await p.mouse.down(); await p.mouse.move(420, 900, { steps: 12 }); await p.mouse.up();
await p.waitForTimeout(1500);
await p.evaluate(()=>window.__MD_WALK__(0,20));
for (let i=0;i<4;i++){ await p.waitForTimeout(2200); await p.screenshot({ path: `/tmp/ws${i}.png` }); }
await b.close();
