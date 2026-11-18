import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await b.newPage({viewport:{width:1280,height:800}});
p.on('pageerror', e => console.log('ERR', e.message.slice(0,180)));
p.on('console', m => { if (m.type()==='error') console.log('C', m.text().slice(0,120)); });
await p.goto('file:///home/user/Doubao/chats/38453565767905538/Temple%E5%AF%86%E5%AF%864.html'.replace(/Temple.*$/,'') + encodeURI('temple寺庙3D法堂-在线演示.html'));
await p.waitForTimeout(6000);
const ok = await p.evaluate(() => Boolean(window.__MD__));
console.log('temple api:', ok);
await p.screenshot({path:'/tmp/single-intro.png'});
if (ok) {
  await p.getByTestId('enter-button').click();
  await p.waitForTimeout(5000);
  await p.evaluate(()=>window.__MD__.play('PRAY'));
  await p.waitForTimeout(1500);
  await p.screenshot({path:'/tmp/single-hall.png'});
}
await b.close();
