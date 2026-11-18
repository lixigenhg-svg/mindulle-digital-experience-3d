import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({ ...devices['iPhone 13'], isMobile:true, hasTouch:true })).newPage();
await p.goto('http://localhost:5288/',{waitUntil:'load'});
await p.waitForTimeout(6000);
await p.waitForFunction(()=>window.__MD__,null,{timeout:30000});
await p.evaluate(()=>window.__MD__.enter());
await p.evaluate(()=>{window.__MD_TP__(0,4); window.__MD_FACE__(0);});
await p.waitForTimeout(600);
await p.evaluate(()=>{window.__MD_LOCK__=true; window.__MD__.force('bowing');});
await p.waitForTimeout(6500);

for(let i=0;i<8;i++){ await p.screenshot({path:`/tmp/bws${i}.png`}); await p.waitForTimeout(800); }
await b.close();
