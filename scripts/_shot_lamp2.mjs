import { chromium } from '@playwright/test';

const b = await chromium.launch({
  executablePath: '/usr/local/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader'],
});
const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
const bad = [];
p.on('response', r => { if (r.status() >= 400) bad.push(r.status() + ' ' + r.url()); });
p.on('pageerror', e => bad.push('ERR ' + String(e).slice(0, 160)));

await p.goto('http://localhost:5296/3d/', { waitUntil: 'load', timeout: 90000 });
await p.waitForTimeout(3000);
await p.waitForFunction(() => window.__MD__, null, { timeout: 90000 });
await p.evaluate(() => window.__MD__.enter());
await p.waitForTimeout(9000);
await p.evaluate(() => window.__MD_TP__(0, 2.4));
await p.waitForTimeout(2500);
const ids = await p.evaluate(() => Array.from(document.querySelectorAll('[data-testid]')).map(e => e.getAttribute('data-testid')));
console.log('TESTIDS:', JSON.stringify(ids.slice(0, 40)));
await p.screenshot({ path: '/tmp/lamp_scene3.png', timeout: 90000 });
if (ids.includes('action-wish')) {
  await p.click('[data-testid="action-wish"]');
  await p.waitForTimeout(700);
  await p.fill('[data-testid="lamp-name"]', '김영희');
  await p.waitForTimeout(400);
  await p.screenshot({ path: '/tmp/lamp_modal.png', timeout: 90000 });
}
console.log('BAD:', bad.length);
bad.slice(0, 8).forEach(x => console.log('  ', x));
await b.close();
