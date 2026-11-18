import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1280,height:800} })).newPage();
p.on('pageerror', e => console.log('ERR:', e.message.slice(0,100)));
await p.goto('http://127.0.0.1:5302/', { waitUntil:'load' });
await p.waitForTimeout(14000);
await p.evaluate(() => window.__MD__.enter());
await p.waitForTimeout(8000);
const tp=(x,z)=>p.evaluate(([a,c])=>window.__MD_TP__(a,c),[x,z]);
const cam=(a,b2)=>p.evaluate(([x,y])=>window.__MD_FIXCAM__(x,y),[a,b2]);

await tp(10.6,36.4); await p.waitForTimeout(400);
await cam([9.2,1.45,40.2],[11.2,0.5,36.4]);
await p.waitForTimeout(2200);
await p.evaluate(()=>window.__MD__.sitNow());
await p.waitForTimeout(2400); await p.screenshot({path:'/tmp/f_tea_pour.png'});
await p.waitForTimeout(2500); await p.screenshot({path:'/tmp/f_tea_drink.png'});
await p.evaluate(()=>window.__MD__.sitNow()); await p.waitForTimeout(900);

await tp(-7.2,37.7); await p.waitForTimeout(400);
await cam([-3.2,1.7,40.6],[-7.2,0.5,37.6]);
await p.waitForTimeout(2000);
await p.evaluate(()=>window.__MD__.sitNow());
await p.waitForTimeout(2100); await p.screenshot({path:'/tmp/f_bench.png'});
await p.evaluate(()=>window.__MD__.sitNow()); await p.waitForTimeout(900);

await tp(0,2.2); await p.waitForTimeout(400);
await cam([0.0,1.9,4.6],[0,0.9,-0.6]);
await p.waitForTimeout(1800);
await p.evaluate(()=>{ const m=document.querySelector('[data-testid="action-offer"]'); m && m.click(); });
await p.waitForTimeout(1400); await p.screenshot({path:'/tmp/f_offer.png'});

await tp(-6.4,34.0); await p.waitForTimeout(400);
await cam([-6.8,1.5,33.0],[-9.8,1.4,30.2]);
await p.waitForTimeout(2400); await p.screenshot({path:'/tmp/f_wall.png'});
console.log('终稿截图完成');
await b.close();
