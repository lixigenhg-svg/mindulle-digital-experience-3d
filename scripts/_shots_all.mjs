import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1280,height:800} })).newPage();
p.on('pageerror', e => console.log('ERR:', e.message.slice(0,120)));
await p.goto('http://127.0.0.1:5302/', { waitUntil:'load' });
await p.waitForTimeout(14000);
await p.evaluate(() => window.__MD__.enter());
await p.waitForTimeout(8000);
const tp=(x,z)=>p.evaluate(([a,c])=>window.__MD_TP__(a,c),[x,z]);
const cam=(a,b2)=>p.evaluate(([x,y])=>window.__MD_FIXCAM__(x,y),[a,b2]);

// ① 茶室（机位往里退，能看清坐姿与茶桌关系）
await tp(10.3,36.45); await p.waitForTimeout(400);
await cam([9.0,1.5,40.6],[11.2,0.55,36.4]);
await p.waitForTimeout(2200);
await p.evaluate(()=>window.__MD__.sitNow());
await p.waitForTimeout(2200); await p.screenshot({path:'/tmp/w_tea_pour.png'});
await p.waitForTimeout(2600); await p.screenshot({path:'/tmp/w_tea_drink.png'});
await p.evaluate(()=>window.__MD__.sitNow()); await p.waitForTimeout(800);

// ② 长凳
await tp(-7.2,37.7); await p.waitForTimeout(400);
await cam([-3.6,1.6,40.4],[-7.2,0.5,37.6]);
await p.waitForTimeout(2000);
await p.evaluate(()=>window.__MD__.sitNow());
await p.waitForTimeout(2000); await p.screenshot({path:'/tmp/w_bench.png'});
await p.evaluate(()=>window.__MD__.sitNow()); await p.waitForTimeout(800);

// ③ 供养（退到案前 2.4m 拍全身）
await tp(0,1.6); await p.waitForTimeout(400);
await cam([0.0,1.5,3.6],[0,0.75,-0.6]);
await p.waitForTimeout(1800);
await p.evaluate(()=>{ const m=document.querySelector('[data-testid="action-offer"]'); m && m.click(); });
await p.waitForTimeout(1300); await p.screenshot({path:'/tmp/w_offer.png'});

// ④ 祈愿壁（站到殿门前，模拟玩家视角）
await cam([-7.0,1.6,35.0],[-9.6,1.4,30.4]);
await p.waitForTimeout(2400); await p.screenshot({path:'/tmp/w_wall.png'});

// ⑤ 茶室外景：看有没有小和尚穿进茶室
await cam([18.0,3.4,44.0],[11.4,1.0,36.6]);
await p.waitForTimeout(2600); await p.screenshot({path:'/tmp/w_teahouse_out.png'});
console.log('全部拍完');
await b.close();
