import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await b.newPage({ viewport: { width: 900, height: 1100 } });
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(16000);
await p.evaluate(()=>window.__MD__?.enter?.());
await p.waitForTimeout(2000);
await p.evaluate(()=>window.__MD_WALK__(3.5,58.5));
await p.waitForTimeout(9000);
for(let i=0;i<5;i++){ await p.mouse.move(450,600); await p.mouse.wheel(0,240); await p.waitForTimeout(250);}
await p.mouse.move(450,700); await p.mouse.down(); await p.mouse.move(450,520,{steps:14}); await p.mouse.up();
await p.waitForTimeout(2000);
await p.screenshot({ path: '/tmp/g1a.png' });
console.log(JSON.stringify(await p.evaluate(()=>window.__MD__.getSnapshot().player)));
await b.close();
