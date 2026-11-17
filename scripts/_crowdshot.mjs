import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({ ...devices['iPhone 13'], isMobile:true, hasTouch:true })).newPage();
p.on('console', m => { if (m.type()==='error') console.log('ERR:', m.text().slice(0,200)); });
p.on('pageerror', e => console.log('PAGEERR:', String(e).slice(0,200)));
await p.goto('http://localhost:5288/',{waitUntil:'load'});
await p.waitForTimeout(7000);
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(2500);
await p.waitForTimeout(1200);
await p.evaluate(()=>{window.__MD_TP__(2.6,3.2); window.__MD_FACE__(0);});
await p.waitForTimeout(2000);
await p.screenshot({path:'/tmp/cr1.png'});
await p.evaluate(()=>{window.__MD_TP__(-6,10); window.__MD_FACE__(0);});
await p.waitForTimeout(1500);
await p.screenshot({path:'/tmp/cr2.png'});

await b.close();
