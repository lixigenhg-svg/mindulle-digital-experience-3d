import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const ctx = await b.newContext({ viewport:{width:1600,height:900}, deviceScaleFactor:2 });
const p = await ctx.newPage();
const errs=[]; p.on('pageerror', e=>errs.push(e.message.slice(0,80)));
await p.goto('http://127.0.0.1:5303/', { waitUntil:'load' });
await p.waitForTimeout(15000);
await p.evaluate(()=>localStorage.setItem('mindulle.entered','1'));
await p.reload(); await p.waitForTimeout(15000);
const tp  = (x,z)=>p.evaluate(([x,z])=>window.__MD_TP__(x,z),[x,z]);
const cam = (d,pi,y)=>p.evaluate(([d,pi,y])=>window.__MD_CAM__(d,pi,y),[d,pi,y]);
async function shot(file, opt){
  if (opt.tp) { await tp(...opt.tp); await p.waitForTimeout(2500); }
  if (opt.cam) await cam(...opt.cam);
  await p.waitForTimeout(opt.wait||2600);
  await p.screenshot({ path:`docs/screenshots/${file}`, type:'jpeg', quality:92, timeout:120000 });
  console.log('拍完', file);
}
await shot('01-입구-데스크톱.jpg', { wait:1200 });
await shot('02-바깥-마당.jpg', { tp:[0,63], cam:[7.0,0.18,0], wait:3500 });
await shot('03-돌길-단풍.jpg', { tp:[0,47], cam:[5.6,0.24,0.28], wait:3000 });
await shot('04-전각-전면.jpg', { tp:[0,28.5], cam:[5.2,0.24,0], wait:3500 });
await shot('05-전각-근경.jpg', { tp:[0,26.5], cam:[3.2,0.30,0], wait:3000 });
await shot('06-메시지-벽.jpg', { tp:[-4.6,29.6], cam:[4.2,0.20,-1.35], wait:3000 });
await shot('07-마당-석조물.jpg', { tp:[-5.4,45.5], cam:[5.0,0.22,-0.85], wait:3000 });
await shot('08-평상-단풍.jpg', { tp:[7.2,35.4], cam:[3.6,0.24,0.9], wait:3000 });
await shot('09-차실.jpg', { tp:[8.6,35.6], cam:[3.8,0.26,-1.1], wait:3000 });
await shot('10-캐릭터-근경.jpg', { tp:[0,32], cam:[1.7,0.30,0], wait:3000 });
await b.close();
console.log('报错', errs.length);
