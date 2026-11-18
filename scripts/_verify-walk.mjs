import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await b.newPage({viewport:{width:1280,height:800}});
p.on('pageerror', e => console.log('ERR', e.message.slice(0,140)));
await p.goto('file:///home/user/Doubao/chats/38453565767905538/temple-app-3d.html');
await p.waitForTimeout(7000);
await p.screenshot({path:'/tmp/w-intro.png'});
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(4000);
await p.screenshot({path:'/tmp/w-idle.png'});
// 向前点地移动
await p.mouse.click(640, 300);
await p.waitForTimeout(2500);
await p.screenshot({path:'/tmp/w-walk.png'});
// 合掌
await p.evaluate(()=>window.__MD__.play('PRAY'));
await p.waitForTimeout(900);
await p.screenshot({path:'/tmp/w-pray.png'});
await b.close();
