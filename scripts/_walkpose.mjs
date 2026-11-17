import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await b.newPage({ viewport: { width: 420, height: 520 } });
await p.goto('http://localhost:5288/skin-preview.html', { waitUntil: 'load' });
await p.waitForTimeout(12000);
await p.evaluate(()=>window.__BONE__?.('walk','idle'));
await p.waitForTimeout(4000);
for (let i=0;i<4;i++){ await p.screenshot({ path: `/tmp/wk${i}.png` }); await p.waitForTimeout(600); }
console.log('ok');
await b.close();
