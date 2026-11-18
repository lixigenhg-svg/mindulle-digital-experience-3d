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
const ctx = await b.newContext({ viewport:{width:1280,height:760}, deviceScaleFactor:1 });
await ctx.addInitScript((payload) => {
  const orig = window.fetch.bind(window);
  window.fetch = async (u, o) => {
    if (String(u).includes('lamp-list.php')) {
      return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return orig(u, o);
  };
}, FAKE);
const p = await ctx.newPage();
await p.goto('http://127.0.0.1:5302/', { waitUntil:'load', timeout: 120000 });
await p.waitForTimeout(14000);
await p.evaluate(() => window.__MD__?.enter());
await p.waitForTimeout(10000);
await p.evaluate(() => { document.querySelector('canvas')?.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true})); });

const shot = async (name, cam, target) => {
  await p.evaluate(([c, t]) => window.__MD_FIXCAM__(c, t), [cam, target]);
  await p.waitForTimeout(2600);
  await p.screenshot({ path: `/tmp/new_${name}.png` });
  console.log('拍好', name, JSON.stringify(cam));
};

await shot('tea_out',  [-6.2, 2.6, 37.6], [-11.5, 1.5, 44.0]);
await shot('tea_in',   [-11.4, 1.65, 40.9], [-11.5, 1.05, 44.6]);
await shot('wishwall', [-9.6, 1.85, 36.4], [-9.6, 1.55, 31.5]);
await shot('altar',    [0.35, 1.45, 1.9],  [0, 0.55, -0.6]);
await b.close();
