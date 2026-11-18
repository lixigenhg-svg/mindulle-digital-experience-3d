import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await b.newPage({viewport:{width:900,height:900}});
p.on('pageerror', e=>console.log('ERR', e.message.slice(0,120)));
await p.goto('http://localhost:5288/', {waitUntil:'load'});
await p.waitForTimeout(5000);
const has = await p.evaluate(()=>!!window.__MD__);
console.log('temple', has);
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(2500);
await p.screenshot({path:'/tmp/d-idle.png'});
for (const [n,a] of [['pray','PRAY'],['bow','BOW'],['wood','WOODFISH']]) {
  await p.evaluate(x=>window.__MD__.play(x), a);
  await p.waitForTimeout(1600);
  await p.screenshot({path:`/tmp/d-${n}.png`});
  await p.evaluate(()=>window.__MD__.play('IDLE'));
  await p.waitForTimeout(700);
}
await p.mouse.click(300, 620);
await p.waitForTimeout(700);
await p.screenshot({path:'/tmp/d-walk.png'});
await b.close();
console.log('ok');
