import { chromium } from '@playwright/test';
const sets = (process.argv[2] || 'idle:idle').split(',');
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await b.newPage({ viewport: { width: 720, height: 820 } });
p.on('pageerror', e=>console.log('ERR', e.message.slice(0,160)));
p.on('console', m=>{ if(m.type()==='error') console.log('CE', m.text().slice(0,160)); });
await p.goto('http://localhost:5288/skin-preview.html', { waitUntil: 'load' });
await p.waitForTimeout(5000);
for (const s of sets) {
  const [m, a] = s.split(':');
  await p.evaluate(([m,a])=>window.__BONE__(m,a), [m,a]);
  await p.waitForTimeout(1800);
  await p.screenshot({ path: `/tmp/sk-${m}-${a}.png` });
}
await b.close();
console.log('ok');
