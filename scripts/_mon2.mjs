import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium', args:['--no-sandbox'] });
const ctx = await b.newContext({ viewport:{width:1180,height:900} });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('ERR:', e.message.slice(0,140)));
p.on('console', m => { if (m.type()==='error') console.log('CONSOLE:', m.text().slice(0,140)); });
await p.goto('http://127.0.0.1:5304/mon.html');
await p.waitForTimeout(6000);
for (let i=0;i<28;i++){ await p.evaluate(() => document.getElementById('now').click()); await p.waitForTimeout(150); }
await p.waitForTimeout(1200);
await p.screenshot({ path:'/tmp/mon_ok2.png', fullPage:true });
await p.setViewportSize({ width:390, height:844 });
await p.waitForTimeout(600);
await p.screenshot({ path:'/tmp/mon_mobile2.png', fullPage:true });
console.log('状态:', await p.evaluate(() => document.getElementById('conn').textContent));
await b.close();
