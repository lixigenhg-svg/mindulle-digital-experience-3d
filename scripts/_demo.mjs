import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1})).newPage();
const shot = async (f,w=1600) => { await p.waitForTimeout(w); await p.screenshot({path:f,timeout:120000}); console.log('shot',f); };
await p.goto('http://localhost:5298/3d/',{waitUntil:'load',timeout:120000});
await p.waitForTimeout(11000);
await shot('/tmp/d_intro.png',1200);
await p.evaluate(()=>window.__MD__ && window.__MD__.enter());
await p.waitForTimeout(9000);
// 上香演示
await p.evaluate(()=>window.__MD_TP__(0,7.0)); await p.waitForTimeout(1600);
await p.evaluate(()=>window.__MD_FACE__(0));
await p.evaluate(()=>window.__MD_FIXCAM__([0.4,1.95,9.6],[0.05,1.05,-2.2]));
await p.waitForTimeout(1200);
await p.evaluate(()=>window.__MD__.incenseNow());
await shot('/tmp/d_incense.png',4200);
await b.close();
