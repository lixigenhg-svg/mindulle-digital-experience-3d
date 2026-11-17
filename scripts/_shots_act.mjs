import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1280,height:800} })).newPage();
p.on('pageerror', e => console.log('ERR:', e.message.slice(0,120)));
await p.goto('http://127.0.0.1:5302/', { waitUntil:'load' });
await p.waitForTimeout(14000);
await p.evaluate(() => window.__MD__.enter());
await p.waitForTimeout(8000);

const tp = (x,z) => p.evaluate(([a,c]) => window.__MD_TP__(a,c), [x,z]);

// ① 茶室：瞬移到坐垫 → 坐下 → 倒茶 / 饮茶
await tp(10.3, 36.45);
await p.waitForTimeout(500);
await p.evaluate(() => window.__MD_FIXCAM__([9.7, 1.3, 39.5], [11.4, 0.45, 36.4]));
await p.waitForTimeout(2200);
await p.screenshot({ path:'/tmp/a_tea_before.png' });
console.log('坐前按钮:', await p.evaluate(() => document.querySelector('[data-testid="seat-button"]')?.textContent));
await p.evaluate(() => window.__MD__.sitNow());
await p.waitForTimeout(2000);
await p.screenshot({ path:'/tmp/a_tea_pour.png' });
console.log('位置:', await p.evaluate(() => JSON.stringify(window.__MD_POS__())));
await p.waitForTimeout(2600);
await p.screenshot({ path:'/tmp/a_tea_drink.png' });

// ② 长凳
await p.evaluate(() => window.__MD__.sitNow());  // 先起身
await p.waitForTimeout(900);
await tp(-7.2, 37.6);
await p.waitForTimeout(600);
await p.evaluate(() => window.__MD_FIXCAM__([-4.4, 1.5, 39.5], [-7.2, 0.6, 37.4]));
await p.waitForTimeout(2200);
await p.evaluate(() => window.__MD__.sitNow());
await p.waitForTimeout(1800);
await p.screenshot({ path:'/tmp/a_bench.png' });
console.log('长凳位置:', await p.evaluate(() => JSON.stringify(window.__MD_POS__())));
await b.close();
