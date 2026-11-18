import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1600,height:900}, deviceScaleFactor:2 })).newPage();
await p.goto('http://127.0.0.1:5303/', { waitUntil:'load' });
await p.waitForTimeout(5000);
await p.evaluate(()=>localStorage.setItem('mindulle.entered','1'));
await p.reload({ waitUntil:'load' });
await p.waitForFunction(()=>typeof window.__MD_TP__==='function', { timeout:40000 });
await p.waitForTimeout(6000);
const tp=(x,z)=>p.evaluate(([x,z])=>window.__MD_TP__(x,z),[x,z]);
const cam=(d,pi,y)=>p.evaluate(([d,pi,y])=>window.__MD_CAM__(d,pi,y),[d,pi,y]);
const face=(r)=>p.evaluate(r=>window.__MD_FACE__(r),r);
await tp(0,2.6); await p.waitForTimeout(1500); await face(0); await cam(2.9,0.24,0); await p.waitForTimeout(3500);
await p.screenshot({ path:'docs/screenshots/05-전각-근경.jpg', type:'jpeg', quality:92, timeout:120000 });
console.log('05 ok');
await b.close();
