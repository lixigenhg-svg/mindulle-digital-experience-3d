import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1600,height:900} })).newPage();
const bad=[]; p.on('response', r=>{ if(r.status()>=400) bad.push(r.status()+' '+r.url().slice(-70)); });
const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,140)));
await p.goto('http://127.0.0.1:5303/', { waitUntil:'load' });
await p.waitForTimeout(9000);
console.log('TP:', await p.evaluate(()=>typeof window.__MD_TP__));
console.log('bodyLen:', await p.evaluate(()=>document.body.innerText.length));
console.log('BAD:', bad.slice(0,6));
console.log('ERR:', errs.slice(0,3));
await b.close();
