import { chromium } from '@playwright/test';
import fs from 'node:fs';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const p = await b.newPage({viewport:{width:1280,height:800}});
await p.goto('file:///home/user/Doubao/chats/38453565767905538/temple-app-3d.html');
await p.waitForTimeout(6000);
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(2500);
await p.mouse.click(640,280);
for (let i=0;i<4;i++){ await p.waitForTimeout(220); await p.screenshot({path:`/tmp/m${i}.png`, clip:{x:560,y:380,width:180,height:330}}); }
console.log(await p.evaluate(()=>JSON.stringify(window.__MD__.getSnapshot().player)));
await b.close();
