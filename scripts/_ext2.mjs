import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await b.newPage({ viewport: { width: 900, height: 1200 } });
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(16000);
await p.evaluate(()=>window.__MD__?.enter?.());
await p.waitForTimeout(2500);
await p.evaluate(()=>window.__MD_WALK__(0,40));
for (let i=0;i<5;i++){ await p.waitForTimeout(2500); console.log(JSON.stringify(await p.evaluate(()=>window.__MD__.getSnapshot().player))); }
await p.screenshot({ path: '/tmp/e3.png' });
await b.close();
