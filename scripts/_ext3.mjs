import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await b.newPage({ viewport: { width: 900, height: 1200 } });
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(16000);
await p.evaluate(()=>window.__MD__?.enter?.());
await p.waitForTimeout(2500);
await p.evaluate(()=>window.__MD_WALK__(0,41));
await p.waitForTimeout(9000);
await p.screenshot({ path: '/tmp/x1.png' });
// 拖拽转镜头 180 度
await p.mouse.move(450, 700); await p.mouse.down(); await p.mouse.move(450, 120, { steps: 25 }); await p.mouse.up();
await p.waitForTimeout(2500);
await p.screenshot({ path: '/tmp/x2.png' });
await b.close();
