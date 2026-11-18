import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const ctx = await b.newContext({ viewport:{width:1200,height:800}, deviceScaleFactor:1 });
const p = await ctx.newPage();
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(6000);
await p.waitForFunction(()=>window.__MD__, null, {timeout:30000});
await p.evaluate(()=>{window.__MD__.enter();});
await p.waitForTimeout(1200);
await p.evaluate(()=>{window.__MD_TP__(-1.74,20.2); window.__MD_FACE__(Math.PI); window.__MD_CAM__(3.0,0.42,-1.3);});
await p.waitForTimeout(1500);
await p.evaluate(()=>window.__MD__.sitNow());
for (let i=0;i<3;i++){ await p.waitForTimeout(1200); await p.screenshot({path:`/tmp/sit${i}.png`}); }
await p.evaluate(()=>{const o={}; window.__SCENE__.traverse(b=>{if(b.isBone&&['hips','head','footL','shinL'].includes(b.name)){const v=new b.position.constructor(); b.getWorldPosition(v); o[b.name]=[+v.x.toFixed(2),+v.y.toFixed(2),+v.z.toFixed(2)];}}); console.log(JSON.stringify(o)); return o;}).then(r=>console.log(JSON.stringify(r)));
await b.close();
