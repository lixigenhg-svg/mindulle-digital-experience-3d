import { chromium } from '@playwright/test';
const FAKE = { ok: true, lamps: [
  { name: '이희건', message: '가족의 건강과 평안을 빌며', date: '2026-11-15 14:20:26', type: 'lamp' },
  { name: '김영희', message: '어머니의 극락왕생을 빌며', date: '2026-11-10 09:11:02', type: 'lamp' },
  { name: '박보살', message: '아이의 무병장수를 빌며', date: '2026-11-08 18:40:00', type: 'lamp' },
  { name: '최영수', message: '새해 복 많이 받으세요', date: '2026-11-05 12:00:00', type: 'lamp' },
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
  await p.screenshot({ path:`/tmp/v2_${name}.png` });
  console.log('拍好', name);
};
// 茶屋正面（从 +Z 开口方向看）
await shot('tea_front', [-9.4, 1.9, 48.2], [-11.6, 1.55, 44.0]);
// 茶屋内部（从门口往里）
await shot('tea_inside', [-10.4, 1.5, 46.6], [-11.5, 0.95, 43.4]);
// 祈愿墙正面
await shot('wall', [-9.6, 1.9, 36.6], [-9.6, 1.6, 31.5]);
// 长香案
await shot('altar', [0.35, 1.45, 1.9], [0, 0.55, -0.6]);
await b.close();
