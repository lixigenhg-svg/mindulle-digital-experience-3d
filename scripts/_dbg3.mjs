import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({ ...devices['iPhone 13'], isMobile:true, hasTouch:true })).newPage();
await p.goto('http://localhost:5288/',{waitUntil:'load'});
await p.waitForTimeout(7000);
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(14000);
await p.evaluate(()=>{window.__MD_TP__(0,0.62); window.__MD_FACE__(0);});
await p.waitForTimeout(700);
await p.click('[data-testid="action-incense"]');
for(let i=0;i<9;i++){ await p.waitForTimeout(700); console.log(i, JSON.stringify(await p.evaluate(()=>({pos:window.__MD_POS__(),cam:window.__MD_CAMPOS__()})))); }
await b.close();
