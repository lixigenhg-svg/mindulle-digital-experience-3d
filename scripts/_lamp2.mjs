import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
await p.goto('http://localhost:5298/3d/',{waitUntil:'load',timeout:120000});
await p.waitForTimeout(10000);
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(8000);
await p.evaluate(()=>window.__MD_TP__(0,33.5));
await p.waitForTimeout(1800);
const shots=[
  ['L1',[0,2.35,34.2],[0,2.6,28.6]],
  ['L2',[5.2,2.4,32.5],[-1.5,2.55,28.8]],
  ['L3',[0,2.2,26.5],[0,2.55,33.0]]
];
for (const [name,pos,tgt] of shots){
  await p.evaluate(a=>window.__MD_FIXCAM__(a.pos,a.tgt),{pos,tgt});
  await p.waitForTimeout(1500);
  await p.screenshot({path:'/tmp/'+name+'.png',timeout:120000});
  console.log('ok',name);
}
await b.close();
