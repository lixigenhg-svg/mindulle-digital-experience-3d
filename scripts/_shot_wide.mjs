import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({ viewport:{width:1768,height:952}, deviceScaleFactor:1 })).newPage();
await p.goto('http://localhost:5288/',{waitUntil:'load'});
await p.waitForTimeout(9000);
await p.waitForFunction(()=>window.__MD__,null,{timeout:60000});
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(400);
for (const [name, x, z] of [['w_back',0,20],['w_mid',0,12],['w_near',0,6.5]]) {
  await p.evaluate(([x,z])=>{window.__MD_TP__(x,z); window.__MD_FACE__(0);},[x,z]);
  await p.waitForTimeout(1400);
  await p.screenshot({path:`/tmp/${name}.png`});
}
await b.close();
