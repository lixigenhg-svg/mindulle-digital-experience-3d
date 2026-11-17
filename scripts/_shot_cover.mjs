import { chromium } from 'playwright';

const b = await chromium.launch({
  executablePath: '/usr/local/bin/chromium',
  args: ['--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
});
const p = await b.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await p.goto('http://127.0.0.1:5303/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForSelector('[data-testid="enter-button"]', { timeout: 60000 });
await p.waitForTimeout(1800);
await p.screenshot({ path: '/tmp/cover_new.png', timeout: 120000 });
console.log('OK cover');
await b.close();
