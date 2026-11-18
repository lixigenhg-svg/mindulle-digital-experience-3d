import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1280,height:800} })).newPage();
const errs=[]; p.on('pageerror', e=>errs.push(e.message.slice(0,100)));
await p.goto('http://127.0.0.1:5302/', { waitUntil:'load' });
await p.waitForTimeout(14000);
await p.evaluate(() => window.__MD__.enter());
await p.waitForTimeout(8000);
const tp=(x,z)=>p.evaluate(([a,c])=>window.__MD_TP__(a,c),[x,z]);
const cam=(a,b2)=>p.evaluate(([x,y])=>window.__MD_FIXCAM__(x,y),[a,b2]);

await tp(-1.0,38.0); await p.waitForTimeout(600);
await cam([-2.0,1.7,39.5],[-11.2,1.5,30.9]);
await p.waitForTimeout(2400); await p.screenshot({path:'/tmp/k_wall_path.png'});
await tp(-7.4,32.6); await p.waitForTimeout(600);
await cam([-6.2,1.55,33.4],[-11.2,1.45,30.9]);
await p.waitForTimeout(1800); await p.screenshot({path:'/tmp/k_wall_near.png'});
console.log('报错:', errs.length);
await b.close();
