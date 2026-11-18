import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const ctx = await b.newContext({ viewport:{width:1768,height:766}, deviceScaleFactor:1 });
const p = await ctx.newPage();
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(6000);
await p.waitForFunction(()=>window.__MD__, null, {timeout:30000});
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(2000);
await p.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW'})));
await p.evaluate(()=>window.__MD_CAM__(2.4,0.22,-1.0));
for (let i=0;i<3;i++){ await p.waitForTimeout(1400); await p.screenshot({path:`/tmp/wk${i}.png`}); }
await p.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW'})));
await b.close();
