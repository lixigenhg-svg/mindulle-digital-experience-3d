import { chromium } from '@playwright/test';
const FAKE = { ok: true, lamps: [
  { name: '이희건', message: '가족의 건강과 평안을 빌며', date: '2026-11-15 14:20:26', type: 'lamp' },
  { name: '김영희', message: '어머니의 극락왕생을 빌며', date: '2026-11-10 09:11:02', type: 'lamp' },
  { name: '박보살', message: '아이의 무병장수를 빌며', date: '2026-11-08 18:40:00', type: 'lamp' },
  { name: '정미숙', message: '가족 모두 평안하기를', date: '2026-11-02 08:30:00', type: 'flower' },
  { name: '한상우', message: '부모님 건강하시기를', date: '2026-10-30 07:20:00', type: 'water' },
]};
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium', args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader'] });
const ctx = await b.newContext({ viewport:{width:1280,height:760} });
await ctx.addInitScript((payload) => {
  const orig = window.fetch.bind(window);
  window.fetch = async (u, o) => {
    if (String(u).includes('lamp-list.php')) return new Response(JSON.stringify(payload), { status:200, headers:{'Content-Type':'application/json'} });
    return orig(u, o);
  };
}, FAKE);
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:5302/', { waitUntil:'load', timeout:120000 });
await p.waitForTimeout(14000);
await p.evaluate(() => window.__MD__?.enter());
await p.waitForTimeout(9000);
const shot = async (name, cam, target) => {
  await p.evaluate(([c, t]) => window.__MD_FIXCAM__(c, t), [cam, target]);
  await p.waitForTimeout(2600);
  await p.screenshot({ path:`/tmp/g_${name}.png` });
  console.log('拍好', name, await p.evaluate(() => window.__MD_POS__()));
};
await shot('tea',   [7.2, 2.4, 41.6], [11.4, 1.3, 36.6]);
await shot('teain', [10.0, 1.5, 39.6], [11.4, 0.9, 35.4]);
await shot('wall',  [-9.6, 1.7, 36.2], [-9.6, 1.5, 31.5]);
await shot('altar', [0.2, 1.2, 1.5],  [-1.3, 0.7, -0.6]);
await shot('altar2',[1.5, 1.2, 1.7],  [1.3, 0.62, -0.6]);
await b.close();
