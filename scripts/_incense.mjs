import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({ ...devices['iPhone 13'], isMobile:true, hasTouch:true })).newPage();
await p.goto('http://localhost:5288/',{waitUntil:'load'});
await p.waitForTimeout(7000);
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(14000);
await p.evaluate(()=>{window.__MD_TP__(0,0.62); window.__MD_FACE__(0);});
await p.waitForTimeout(800);
await p.click('[data-testid="action-incense"]');
const marks=[[800,'i1'],[900,'i2'],[2700,'i3'],[800,'i4'],[1200,'i5']];
for(const [ms,n] of marks){ await p.waitForTimeout(ms); await p.screenshot({path:`/tmp/${n}.png`}); }
await b.close();
