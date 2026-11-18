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

// ① 坐矮长凳：侧面看清坐姿
await tp(-6.9,37.6); await p.waitForTimeout(600);
await cam([-4.2,1.15,37.3],[-7.2,0.5,37.6]);
await p.waitForTimeout(1800);
await p.evaluate(()=>window.__MD__.sitNow());
await p.waitForTimeout(2600); await p.screenshot({path:'/tmp/n_bench.png'});
await p.waitForTimeout(2200); await p.screenshot({path:'/tmp/n_bench2.png'});
await p.evaluate(()=>window.__MD__.sitNow()); await p.waitForTimeout(800);

// ② 祈愿壁：站在石道上向左转身看到的正面
await tp(0,33.0); await p.waitForTimeout(600);
await cam([0.2,1.75,33.4],[-8.6,1.5,29.2]);
await p.waitForTimeout(2200); await p.screenshot({path:'/tmp/n_wall.png'});
await tp(-4.0,30.5); await p.waitForTimeout(600);
await cam([-3.4,1.55,31.3],[-8.6,1.4,29.2]);
await p.waitForTimeout(1800); await p.screenshot({path:'/tmp/n_wall2.png'});
console.log('报错:', errs.length, errs.slice(0,2));
await b.close();
