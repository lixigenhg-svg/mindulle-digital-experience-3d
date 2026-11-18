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

// ① 茶室：正坐（侧面看清头部朝向）
await tp(10.5,36.4); await p.waitForTimeout(400);
await cam([9.0,1.35,39.4],[11.0,0.55,36.4]);
await p.waitForTimeout(2200);
await p.evaluate(()=>window.__MD__.sitNow());
await p.waitForTimeout(2400); await p.screenshot({path:'/tmp/g_tea_1.png'});
await p.waitForTimeout(2600); await p.screenshot({path:'/tmp/g_tea_2.png'});
await p.evaluate(()=>window.__MD__.sitNow()); await p.waitForTimeout(900);

// ② 长凳：坐在长凳旁的地上
await tp(-6.05,37.6); await p.waitForTimeout(500);
await cam([-2.6,1.7,40.8],[-6.1,0.5,37.6]);
await p.waitForTimeout(2000);
await p.evaluate(()=>window.__MD__.sitNow());
await p.waitForTimeout(2200); await p.screenshot({path:'/tmp/g_bench.png'});
await p.evaluate(()=>window.__MD__.sitNow()); await p.waitForTimeout(900);

// ③ 祈愿壁：从石道走过来看到的视角
await tp(0,44); await p.waitForTimeout(600);
await cam([0.6,2.0,45.5],[-11.0,1.9,39.0]);
await p.waitForTimeout(2200); await p.screenshot({path:'/tmp/g_wall_far.png'});
await tp(-7.6,38.2); await p.waitForTimeout(600);
await cam([-6.6,1.6,38.0],[-11.0,1.5,39.0]);
await p.waitForTimeout(1800); await p.screenshot({path:'/tmp/g_wall_near.png'});
console.log('报错数:', errs.length, errs.slice(0,2));
await b.close();
