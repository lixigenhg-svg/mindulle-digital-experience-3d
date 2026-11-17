import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1600,height:900} })).newPage();
const bad=[]; p.on('response', r=>{ if(r.status()>=400) bad.push(r.status()+' '+r.url().slice(-60)); });
const errs=[]; p.on('pageerror',e=>errs.push(e.message.slice(0,120)));
await p.goto('file:///home/user/Doubao/chats/38453565767905538/mindulle-digital-experience-3d/单文件/민들레-3D-체험관.html', { waitUntil:'load' });
await p.waitForTimeout(6000);
await p.evaluate(()=>localStorage.setItem('mindulle.entered','1'));
await p.reload({ waitUntil:'load' });
await p.waitForTimeout(7000);
console.log('TP:', await p.evaluate(()=>typeof window.__MD_TP__));
console.log('bodyLen:', await p.evaluate(()=>document.body.innerText.length));
console.log('canvas:', await p.evaluate(()=>document.querySelectorAll('canvas').length));
console.log('BAD:', bad.slice(0,4));
console.log('ERR:', errs.slice(0,3));
await p.screenshot({path:'/tmp/single-check.jpg', type:'jpeg', quality:80});
await b.close();
