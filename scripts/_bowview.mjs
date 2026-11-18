import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const ctx = await b.newContext({ ...devices['iPhone 13'], isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(16000);
await p.evaluate(()=>window.__MD__?.enter?.());
await p.waitForTimeout(700);
await p.evaluate(()=>window.__MD_TP__(1.74,4.24));
await p.waitForTimeout(600);
// 拖拽把镜头拉远、抬高
for (let k=0;k<3;k++){
  await p.mouse.move(585, 900);
  await p.mouse.down();
  await p.mouse.move(585, 700, { steps: 12 });
  await p.mouse.up();
  await p.waitForTimeout(400);
}
await p.evaluate(()=>window.__MD__.force('kowtow'));
for (let i=0;i<5;i++){ await p.waitForTimeout(1400); await p.screenshot({ path: `/tmp/bv${i}.png` }); }
await b.close();
