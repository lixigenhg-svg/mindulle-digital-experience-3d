import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({ viewport:{width:1768,height:952} })).newPage();
await p.goto('http://localhost:5288/',{waitUntil:'load'});
await p.waitForTimeout(9000);
await p.waitForFunction(()=>window.__MD__,null,{timeout:60000});
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(300);
await p.evaluate(()=>{window.__MD_TP__(3.4, 2.5);});
await p.waitForTimeout(300);
const shots = [
  ['f1', [0.7,1.9,2.2], [3.45,0.5,-0.15]],
  ['f2', [2.0,1.3,1.8], [3.45,0.5,-0.15]],
  ['f3', [-0.5,1.0,4.6], [3.2,0.6,0.2]],
];
for (const [n,pos,tgt] of shots) {
  await p.evaluate(([pp,tt])=>window.__MD_FIXCAM__(pp,tt),[pos,tgt]);
  await p.waitForTimeout(900); await p.screenshot({path:`/tmp/${n}.png`});
}
await b.close();
