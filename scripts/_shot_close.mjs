import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({ viewport:{width:1768,height:952} })).newPage();
await p.goto('http://localhost:5288/',{waitUntil:'load'});
await p.waitForTimeout(9000);
await p.waitForFunction(()=>window.__MD__,null,{timeout:60000});
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(400);
for (const [n,x,z,yaw] of [['c1',1.2,3.2,0],['c2',2.6,2.6,-0.35],['c3',0,4.5,0]]) {
  await p.evaluate(([x,z,y])=>{window.__MD_TP__(x,z); window.__MD_FACE__(y);},[x,z,yaw]);
  await p.waitForTimeout(1300); await p.screenshot({path:`/tmp/${n}.png`});
}
await b.close();
