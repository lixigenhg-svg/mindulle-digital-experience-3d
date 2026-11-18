import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await b.newPage({viewport:{width:1280,height:800}});
p.on('pageerror', e=>console.log('ERR', e.message.slice(0,160)));
await p.goto('file:///home/user/Doubao/chats/38453565767905538/temple-app-3d.html');
await p.waitForTimeout(7000);
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(3000);
await p.screenshot({path:'/tmp/b-idle.png'});
for (const [name, act] of [['pray','PRAY'],['bow','BOW'],['wood','WOODFISH']]) {
  await p.evaluate(a=>window.__MD__.play(a), act);
  await p.waitForTimeout(1400);
  await p.screenshot({path:`/tmp/b-${name}.png`});
  await p.evaluate(()=>window.__MD__.play('IDLE'));
  await p.waitForTimeout(800);
}
await p.mouse.click(1000, 620);
await p.waitForTimeout(900);
await p.screenshot({path:'/tmp/b-walk.png'});
await b.close();
