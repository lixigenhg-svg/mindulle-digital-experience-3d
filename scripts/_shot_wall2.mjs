import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1600,height:900}, deviceScaleFactor:2 })).newPage();
await p.goto('http://127.0.0.1:5303/', { waitUntil:'load' });
await p.waitForTimeout(14000);
await p.evaluate(()=>localStorage.setItem('mindulle.entered','1'));
await p.reload(); await p.waitForTimeout(14000);
const tp=(x,z)=>p.evaluate(([x,z])=>window.__MD_TP__(x,z),[x,z]);
const cam=(d,pi,y)=>p.evaluate(([d,pi,y])=>window.__MD_CAM__(d,pi,y),[d,pi,y]);
await tp(-6.6,29.2); await p.waitForTimeout(2500);
await cam(6.4,0.26,-1.45); await p.waitForTimeout(3200);
await p.screenshot({ path:'docs/screenshots/06-메시지-벽.jpg', type:'jpeg', quality:92, timeout:120000 });
console.log('ok');
await b.close();
