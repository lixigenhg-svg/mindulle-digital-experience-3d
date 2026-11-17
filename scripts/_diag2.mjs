import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:900,height:600} })).newPage();
p.on('pageerror', e => console.log('ERR:', e.message.slice(0,120)));
await p.goto('http://127.0.0.1:5302/', { waitUntil:'load' });
await p.waitForTimeout(13000);
await p.evaluate(() => window.__MD__.enter());
await p.waitForTimeout(6000);
await p.evaluate(() => window.__MD_TP__(10.3, 36.45));
await p.waitForTimeout(800);
await p.evaluate(() => window.__MD__.sitNow());
await p.waitForTimeout(1500);
console.log("姿态探针:", await p.evaluate(() => JSON.stringify(window.__POSE_DBG__)));
console.log("动作探针:", await p.evaluate(() => JSON.stringify(window.__ACT_DBG__)));
await b.close();
