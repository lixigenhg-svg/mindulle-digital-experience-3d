import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({ viewport:{width:1768,height:952} })).newPage();
await p.goto('http://localhost:5288/',{waitUntil:'load'});
await p.waitForTimeout(9000);
await p.waitForFunction(()=>window.__MD__,null,{timeout:60000});
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(400);
for (const [n,x,z] of [['n1',3.45,2.0],['n2',1.6,1.4],['n3',0.2,2.6]]) {
  await p.evaluate(([x,z])=>{window.__MD_TP__(x,z); window.__MD_FACE__(0);},[x,z]);
  await p.waitForTimeout(1300); await p.screenshot({path:`/tmp/${n}.png`});
}
await b.close();
