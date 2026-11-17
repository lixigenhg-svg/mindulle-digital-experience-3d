import { chromium } from '@playwright/test';

const b = await chromium.launch({
  executablePath: '/usr/local/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
await p.goto('http://localhost:5296/3d/', { waitUntil: 'load', timeout: 90000 });
await p.waitForTimeout(3000);
await p.waitForFunction(() => window.__MD__, null, { timeout: 90000 });
await p.evaluate(() => window.__MD__.enter());
await p.waitForTimeout(7000);

const pos = () => p.evaluate(() => window.__MD_POS__?.());

// ① 树心：应被推到树干外
await p.evaluate(() => window.__MD_TP__(-6.6, 36.6));
await p.waitForTimeout(900);
console.log('① tree push-out:', JSON.stringify(await pos()), '(target -6.6,36.6)');

// ② 佛后：应被挡在佛前
await p.evaluate(() => window.__MD_TP__(0, -4));
await p.waitForTimeout(900);
console.log('② behind-buddha blocked:', JSON.stringify(await pos()), '(target 0,-4)');

// ③ 石灯：应被挡住
await p.evaluate(() => window.__MD_TP__(-5.4, 34.2));
await p.waitForTimeout(900);
console.log('③ stone lantern blocked:', JSON.stringify(await pos()), '(target -5.4,34.2)');
await p.evaluate(() => window.__MD_FIXCAM__([-3.2, 2.6, 32.0], [-5.4, 0.8, 34.4]));
await p.waitForTimeout(1200);
await p.screenshot({ path: '/tmp/obst_yard.png', timeout: 90000 });

// ④ 叩拜：应走到最近的拜垫中心站定后趴下
await p.evaluate(() => window.__MD_TP__(0.95, 3.2));
await p.waitForTimeout(900);
await p.evaluate(() => window.__MD_FIXCAM__([1.2, 2.2, 6.6], [1.2, 0.4, 2.6]));
await p.click('[data-testid="action-bow"]');
await p.waitForTimeout(7000);
console.log('④ bow position:', JSON.stringify(await pos()), '(expect cushion center ~x±1.77 z~3.5x)');
await p.screenshot({ path: '/tmp/bow_new.png', timeout: 90000 });

await b.close();
