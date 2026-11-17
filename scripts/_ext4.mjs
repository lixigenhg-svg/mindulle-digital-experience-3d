import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await b.newPage({ viewport: { width: 900, height: 1200 } });
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(16000);
await p.evaluate(()=>window.__MD__?.enter?.());
await p.waitForTimeout(2500);
await p.evaluate(()=>window.__MD_WALK__(0,20));
await p.waitForTimeout(9000);
// 滚轮拉远 + 下压俯角
for (let i=0;i<6;i++){ await p.mouse.move(450,600); await p.mouse.wheel(0, 240); await p.waitForTimeout(300); }
await p.mouse.move(450, 900); await p.mouse.down(); await p.mouse.move(450, 620, { steps: 20 }); await p.mouse.up();
await p.waitForTimeout(2500);
await p.screenshot({ path: '/tmp/y1.png' });
// 转 180 度看殿门与庭院
await p.mouse.move(200, 600); await p.mouse.down(); await p.mouse.move(800, 600, { steps: 30 }); await p.mouse.up();
await p.waitForTimeout(2500);
await p.screenshot({ path: '/tmp/y2.png' });
await b.close();
