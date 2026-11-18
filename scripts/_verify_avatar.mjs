import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1600,height:900}, deviceScaleFactor:2 })).newPage();
const bad=[]; p.on('response',r=>{ if(r.status()>=400 && !r.url().includes('favicon')) bad.push(r.status()+' '+r.url().slice(-45)); });
const err=[]; p.on('pageerror',e=>err.push(e.message.slice(0,80)));
await p.goto('http://127.0.0.1:5303/', { waitUntil:'load' });
await p.evaluate(()=>localStorage.setItem('mindulle.entered','1'));
await p.reload({ waitUntil:'load' });
await p.waitForFunction(()=>typeof window.__MD_TP__==='function', { timeout:40000 });
await p.waitForTimeout(8000);
await p.evaluate(()=>window.__MD_TP__(0,32)); await p.waitForTimeout(2000);
await p.evaluate(()=>window.__MD_CAM__(1.9,0.28,0)); await p.waitForTimeout(3000);
console.log('TP', typeof await p.evaluate(()=>window.__MD_TP__), '| 404', bad.length, bad.slice(0,3), '| ERR', err.slice(0,2));
await p.screenshot({path:'/tmp/avatar-check.jpg',type:'jpeg',quality:88,timeout:120000});
await b.close();
