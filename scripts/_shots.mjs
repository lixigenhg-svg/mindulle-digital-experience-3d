import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({viewport:{width:1600,height:900}})).newPage();
const errs=[]; p.on('pageerror',e=>errs.push(String(e).slice(0,100)));
await p.goto('http://localhost:5298/3d/',{waitUntil:'load',timeout:120000});
await p.waitForTimeout(8000);
await p.screenshot({path:'/tmp/shot_intro.png',timeout:120000});   // 入口页
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(12000);
// 殿内正面全景
await p.evaluate(()=>window.__MD_TP__(0, 7.0));
await p.waitForTimeout(2500);
await p.evaluate(()=>window.__MD_FACE__(0));
await p.evaluate(()=>window.__MD_FIXCAM__([0,2.3,11.0],[0,1.3,-2.6]));
await p.waitForTimeout(2500);
await p.screenshot({path:'/tmp/shot_hall.png',timeout:120000});
// 佛像近景
await p.evaluate(()=>window.__MD_TP__(1.2, 3.2));
await p.waitForTimeout(2000);
await p.evaluate(()=>window.__MD_FIXCAM__([2.6,1.9,1.4],[0,1.55,-3.0]));
await p.waitForTimeout(2200);
await p.screenshot({path:'/tmp/shot_buddha.png',timeout:120000});
// 庭院
await p.evaluate(()=>window.__MD_TP__(-4.0, 36.0));
await p.waitForTimeout(2500);
await p.evaluate(()=>window.__MD_FIXCAM__([-1.5,3.4,32.0],[-8.0,1.4,40.0]));
await p.waitForTimeout(2500);
await p.screenshot({path:'/tmp/shot_yard.png',timeout:120000});
console.log('pageerror:', errs.length, errs.slice(0,2));
await b.close();
