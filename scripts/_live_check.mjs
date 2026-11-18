import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1600,height:900} })).newPage();
const bad=[]; p.on('response', r=>{ if(r.status()>=400 && r.url().includes('mindulle.kr')) bad.push(r.status()+' '+r.url().slice(-55)); });
const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,100)));
await p.goto('https://mindulle.kr/3d/', { waitUntil:'load', timeout:60000 });
await p.waitForTimeout(7000);
await p.evaluate(()=>localStorage.setItem('mindulle.entered','1'));
await p.reload({ waitUntil:'load' });
await p.waitForFunction(()=>typeof window.__MD_TP__==='function', { timeout:45000 }).catch(()=>{});
await p.waitForTimeout(7000);
console.log('TP:', await p.evaluate(()=>typeof window.__MD_TP__));
console.log('canvas:', await p.evaluate(()=>document.querySelectorAll('canvas').length));
console.log('灯数:', await p.evaluate(()=>document.body.innerText.match(/\d+\s*\/\s*\d+/)?.[0] || 'n/a'));
console.log('BAD:', bad.slice(0,4));
console.log('ERR:', errs.slice(0,3));
await p.screenshot({ path:'/tmp/live-3d.jpg', type:'jpeg', quality:82 });
await b.close();
