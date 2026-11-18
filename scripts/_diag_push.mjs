import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await (await b.newContext({viewport:{width:800,height:520}})).newPage();
await p.goto('http://localhost:5296/3d/',{waitUntil:'load',timeout:90000});
await p.waitForTimeout(4000);
await p.waitForFunction(()=>window.__MD__,null,{timeout:90000});
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(6000);
const cases = [
  ['殿内长供桌', 0, -0.6],
  ['佛坛底座', 0, -2.05],
  ['佛后禁入', 0, -3.9],
  ['佛后禁入(侧)', 4.5, -3.9],
  ['立柱左(z=10.23)', -6.32, 10.23],
  ['立柱右(z=5.89)', 6.32, 5.89],
  ['殿门沙弥', -3.0, 26.3],
  ['殿门立柱', 2.55, 28.4],
  ['第一层枫树', -8.8, 36.6],
  ['第二层枫树', 13.2, 37.0],
  ['门前石灯', 5.4, 34.2],
  ['石道石灯', -4.3, 44.5],
  ['木长椅', -7.2, 37.5],
  ['木长椅2', 8.6, 46.5],
  ['左莲池', -11.2, 38.5],
  ['右莲池', 10.4, 48.4],
  ['幢幡柱', -5.4, 40.5],
  ['石塔', -8.8, 47.6],
  ['山门柱', 3.6, 51.6],
  ['左护墙', -9.6, 6.0],
  ['右护墙', 9.6, 12.0],
  ['左经柜', -9.05, 1.8],
  ['右经柜', 9.05, 4.53],
  ['钟架', -8.18, 5.89],
  ['鼓架', 8.18, 5.89],
  ['功德箱', 4.35, -0.3],
  ['殿内空地(0,10)', 0, 10],
  ['殿内空地(5,15)', 5, 15],
];
const out = await p.evaluate((list) => list.map(([name,x,z]) => {
  const r = window.__MD_TEST_PUSH__(x, z);
  return { name, x, z, rx: +r.x.toFixed(2), rz: +r.z.toFixed(2), moved: +Math.hypot(r.x-x, r.z-z).toFixed(2) };
}), cases);
for (const o of out) console.log(`${o.name.padEnd(16)} (${o.x},${o.z}) → (${o.rx},${o.rz}) 推开 ${o.moved}m`);
await b.close();
