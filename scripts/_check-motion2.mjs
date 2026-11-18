import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await b.newPage({viewport:{width:1280,height:800}});
await p.goto('file:///home/user/Doubao/chats/38453565767905538/temple-app-3d.html');
await p.waitForTimeout(6000);
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(2000);
await p.mouse.click(1000, 620);
await p.waitForTimeout(700);
console.log('t0', await p.evaluate(()=>JSON.stringify(window.__MD__.getSnapshot().player)));
await p.waitForTimeout(900);
console.log('t1', await p.evaluate(()=>JSON.stringify(window.__MD__.getSnapshot().player)));
for (let i=0;i<3;i++){ await p.screenshot({path:`/tmp/wk${i}.png`, clip:{x:540,y:360,width:220,height:340}}); await p.waitForTimeout(140);}
await b.close();
