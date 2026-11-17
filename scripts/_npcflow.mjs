import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({ ...devices['iPhone 13'], isMobile:true, hasTouch:true })).newPage();
p.on('pageerror', e=>console.log('PAGEERR:', String(e).slice(0,300)));
await p.goto('http://localhost:5288/',{waitUntil:'load'});
await p.waitForTimeout(7000);
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(15000);
await p.evaluate(()=>{window.__MD_TP__(0,26); window.__MD_FACE__(0); window.__MD_FIXCAM__([0,3.0,22],[0,0.9,4]);});
for (let i=0;i<4;i++){ await p.waitForTimeout(i?15000:1500); await p.screenshot({path:`/tmp/np${i}.png`}); }
await b.close();
