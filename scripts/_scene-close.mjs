import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await b.newPage({ viewport: { width: 720, height: 900 } });
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(9000);
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(1500);
await p.mouse.move(360,500);
for (let i=0;i<6;i++){ await p.mouse.wheel(0,-260); await p.waitForTimeout(300); }
await p.waitForTimeout(1500);
for (const a of ['IDLE','PRAY','BOW','WOODFISH']) {
  await p.evaluate((a)=>window.__MD__.play(a), a);
  await p.waitForTimeout(2200);
  await p.screenshot({ path: `/tmp/c-${a}.png` });
}
await b.close(); console.log('ok');
