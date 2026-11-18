import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1280,height:800} })).newPage();
const errs=[]; p.on('pageerror', e=>errs.push(e.message.slice(0,120)));
await p.goto('http://127.0.0.1:5302/', { waitUntil:'load' });
await p.waitForTimeout(14000);
await p.evaluate(() => window.__MD__.enter());
await p.waitForTimeout(8000);
const tp=(x,z)=>p.evaluate(([a,c])=>window.__MD_TP__(a,c),[x,z]);
const cam=(a,b2)=>p.evaluate(([x,y])=>window.__MD_FIXCAM__(x,y),[a,b2]);
// 坐矮长凳（侧面 1.2m 高）
await tp(-7.2,39.4); await p.waitForTimeout(1000);
await cam([-2.6,1.1,39.6],[-7.2,0.42,38.9]); await p.waitForTimeout(1500);
await p.evaluate(()=>window.__MD__.sitNow()); await p.waitForTimeout(2600);
await p.screenshot({path:'/tmp/s_bench.png'});
// 祈愿壁正面（站在石道上向左看）
await p.evaluate(()=>window.__MD__.sitNow()); await p.waitForTimeout(700);
await tp(0,32.5); await p.waitForTimeout(700);
await cam([0.3,1.7,33.6],[-8.6,1.45,29.2]); await p.waitForTimeout(2000);
await p.screenshot({path:'/tmp/s_wall.png'});
console.log('报错:', errs.length, errs.slice(0,2));
await b.close();
