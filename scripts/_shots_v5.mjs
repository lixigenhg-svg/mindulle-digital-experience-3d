import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1280,height:800} })).newPage();
await p.goto('http://127.0.0.1:5302/', { waitUntil:'load' });
await p.waitForTimeout(14000);
await p.evaluate(() => window.__MD__.enter());
await p.waitForTimeout(8000);
const tp=(x,z)=>p.evaluate(([a,c])=>window.__MD_TP__(a,c),[x,z]);
const cam=(a,b2)=>p.evaluate(([x,y])=>window.__MD_FIXCAM__(x,y),[a,b2]);
// 长凳坐地：从东侧近距离、低机位
await tp(-6.05,37.6); await p.waitForTimeout(500);
await cam([-3.4,1.25,37.2],[-6.05,0.55,37.6]);
await p.waitForTimeout(2000);
await p.evaluate(()=>window.__MD__.sitNow());
await p.waitForTimeout(2200); await p.screenshot({path:'/tmp/m_bench.png'});
// 茶室：正面平视
await p.evaluate(()=>window.__MD__.sitNow()); await p.waitForTimeout(600);
await tp(10.5,36.4); await p.waitForTimeout(500);
await cam([10.6,1.15,39.6],[11.0,0.55,36.4]);
await p.waitForTimeout(1800);
await p.evaluate(()=>window.__MD__.sitNow());
await p.waitForTimeout(2500); await p.screenshot({path:'/tmp/m_tea.png'});
console.log('ok');
await b.close();
