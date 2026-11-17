import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({ ...devices['iPhone 13'], isMobile:true, hasTouch:true })).newPage();
await p.goto('http://localhost:5288/',{waitUntil:'load'});
await p.waitForTimeout(6000);
await p.waitForFunction(()=>window.__MD__,null,{timeout:30000});
await p.evaluate(()=>window.__MD__.enter());
await p.evaluate(()=>{window.__MD_LOCK__=true; window.__MD_TP__(0,-5.0);});
await p.waitForTimeout(500);
await p.evaluate(()=>window.__MD_FIXCAM__([6.2,1.75,-4.2],[0,1.1,-5.6]));
const angles=[0,Math.PI/2,Math.PI,-Math.PI/2];
for (let i=0;i<4;i++){
  await p.evaluate(a=>{window.__MD_FACE__(a);}, angles[i]);
  await p.waitForTimeout(1200);
  await p.screenshot({path:`/tmp/pf${i}.png`});
}
await b.close();
