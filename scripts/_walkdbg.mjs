import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await b.newPage({ viewport: { width: 800, height: 1000 } });
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(15000);
await p.evaluate(()=>window.__MD__?.enter?.());
await p.waitForTimeout(1500);
console.log('before', JSON.stringify(await p.evaluate(()=>window.__MD__.getSnapshot().player)));
await p.evaluate(()=>window.__MD_WALK__(0,40));
for (let i=0;i<4;i++){ await p.waitForTimeout(2000); console.log(i, JSON.stringify(await p.evaluate(()=>window.__MD__.getSnapshot().player))); }
await b.close();
