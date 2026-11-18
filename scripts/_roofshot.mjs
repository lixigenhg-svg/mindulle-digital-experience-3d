import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const ctx = await b.newContext({ viewport:{width:1400,height:760}, deviceScaleFactor:1 });
const p = await ctx.newPage();
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(6000);
await p.waitForFunction(()=>window.__MD__, null, {timeout:30000});
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(1500);
// 站到殿外（山门方向）看大殿屋顶
await p.evaluate(()=>{window.__MD_TP__(0,44); window.__MD_FACE__(Math.PI); window.__MD_CAM__(8.0,0.95,0.0);});
await p.waitForTimeout(4000);
await p.screenshot({path:'/tmp/roof_out.png'});
await b.close();
