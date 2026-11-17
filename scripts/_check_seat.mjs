import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1280,height:800} })).newPage();
const errs=[]; p.on('pageerror', e=>errs.push(e.message.slice(0,100)));
await p.goto('http://127.0.0.1:5303/', { waitUntil:'load' });
await p.waitForTimeout(12000);
await p.click('text=법당 열기');
await p.waitForTimeout(2500);
// 走到长凳旁坐下
await p.evaluate(() => window.__MD_TP__(7.2, 38.6));
await p.waitForTimeout(1200);
await p.evaluate(() => window.__MD_WALK__(7.2, 37.9));
await p.waitForTimeout(3000);
const btn = await p.evaluate(()=>!!document.querySelector('[data-testid="seat-button"]'));
console.log('座位按钮:', btn);
if (btn) await p.click('[data-testid="seat-button"]');
await p.waitForTimeout(4000);
const snap1 = await p.evaluate(()=>({ a: window.__MD__.getSnapshot().action, cam: localStorage.getItem('mindulle.pos') }));
console.log('刷新前 action=', snap1.a, ' 记忆=', snap1.cam);
await p.reload({ waitUntil:'load' });
await p.waitForTimeout(14000);
const snap2 = await p.evaluate(()=>({ a: window.__MD__.getSnapshot().action, z: window.__MD__.getSnapshot().player?.z, cover: [...document.querySelectorAll('button')].some(b=>b.innerText.includes('법당 열기')) }));
console.log('刷新后 action=', snap2.a, ' z=', snap2.z?.toFixed?.(1), ' 封面?', snap2.cover, ' 报错=', errs.length);
await p.screenshot({path:'/tmp/seat_after.png'});
await b.close();
