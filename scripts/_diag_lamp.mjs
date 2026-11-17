import { chromium } from '@playwright/test';

const b = await chromium.launch({
  executablePath: '/usr/local/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
const errs = [];
p.on('console', m => {
  if (m.type() === 'error' || m.type() === 'warning') errs.push(`[${m.type()}] ${m.text().slice(0, 200)}`);
});
p.on('pageerror', e => errs.push(`[pageerror] ${String(e).slice(0, 300)}`));

await p.goto('http://localhost:5296/3d/', { waitUntil: 'load', timeout: 90000 });
await p.waitForTimeout(3000);
await p.waitForFunction(() => window.__MD__, null, { timeout: 90000 });
await p.evaluate(() => window.__MD__.enter());
await p.waitForTimeout(14000);

const info = await p.evaluate(() => {
  const s = window.__MD__.snapshot ? window.__MD__.snapshot() : null;
  return {
    hasSnapshot: !!s,
    scene: s?.scene,
  };
});
console.log('INFO:', JSON.stringify(info));
console.log('ERRS:', errs.length);
errs.slice(0, 12).forEach(e => console.log(' -', e));
await p.screenshot({ path: '/tmp/lamp_scene2.png', timeout: 90000 });
await b.close();
