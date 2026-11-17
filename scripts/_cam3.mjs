import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({ ...devices['iPhone 13'], isMobile:true, hasTouch:true })).newPage();
await p.goto('http://localhost:5288/',{waitUntil:'load'});
await p.waitForTimeout(6000);
await p.waitForFunction(()=>window.__MD__,null,{timeout:30000});
await p.evaluate(()=>window.__MD__.enter());
await p.evaluate(()=>{window.__MD_LOCK__=true; window.__MD_TP__(0,-5.0); window.__MD_FACE__(0); window.__MD_SCALE__(1.15);});
await p.waitForTimeout(600);
const cams=[[-4.2,1.55,-5.2],[0.6,1.5,-2.2],[2.9,1.5,-2.6]];
for(let i=0;i<3;i++){
  await p.evaluate(c=>window.__MD_FIXCAM__(c,[0,1.05,-5.8]), cams[i]);
  await p.waitForTimeout(1300);
  await p.screenshot({path:`/tmp/cm${i}.png`});
}
await b.close();
