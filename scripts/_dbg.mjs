import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({ ...devices['iPhone 13'], isMobile:true, hasTouch:true })).newPage();
p.on('pageerror', e=>console.log('PAGEERR:', String(e).slice(0,300)));
await p.goto('http://localhost:5288/',{waitUntil:'load'});
await p.waitForTimeout(7000);
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(15000);
await p.evaluate(()=>{window.__MD_TP__(0,14); window.__MD_FACE__(0);});
await p.waitForTimeout(800);
await p.evaluate(()=>{window.__MD_SPEED_K__=3.6; window.__MD_WALK__(0,0.6);});
for(const i of [1,2,3,4,5]){ await p.waitForTimeout(700); console.log(i, await p.evaluate(()=>window.__MD_POS__())); }
await b.close();
