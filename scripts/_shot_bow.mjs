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
await p.evaluate(() => window.__MD_TP__(0.95, 3.2));
await p.waitForTimeout(1500);

const pos0 = await p.evaluate(() => window.__MD_POS__?.());
console.log('POS before:', JSON.stringify(pos0));

await p.click('[data-testid="action-bow"]');
for (let i = 1; i <= 4; i++) {
  await p.waitForTimeout(2200);
  const pos = await p.evaluate(() => window.__MD_POS__?.());
  const st = await p.evaluate(() => window.__MD__?.state);
  console.log(`t+${i * 2.2}s pos=`, JSON.stringify(pos), 'state=', st);
  await p.screenshot({ path: `/tmp/bow_${i}.png`, timeout: 90000 });
}
await b.close();
