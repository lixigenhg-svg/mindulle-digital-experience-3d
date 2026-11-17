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

// 祈愿壁：从石道走近
await tp(-2,40); await p.waitForTimeout(600);
await cam([-3.0,1.9,42.0],[-11.0,1.6,33.2]);
await p.waitForTimeout(2400); await p.screenshot({path:'/tmp/h_wall_from_path.png'});
await tp(-8.6,35.0); await p.waitForTimeout(600);
await cam([-7.6,1.7,36.6],[-11.0,1.5,33.2]);
await p.waitForTimeout(2000); await p.screenshot({path:'/tmp/h_wall_near.png'});

// 长凳坐地：换无遮挡机位
await tp(-6.05,37.6); await p.waitForTimeout(500);
await cam([-2.0,1.9,41.4],[-6.1,0.4,37.6]);
await p.waitForTimeout(2000);
await p.evaluate(()=>window.__MD__.sitNow());
await p.waitForTimeout(2200); await p.screenshot({path:'/tmp/h_bench.png'});
console.log('报错:', errs.length, errs.slice(0,2));
await b.close();
