import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const ctx = await b.newContext({ viewport:{width:1600,height:900}, deviceScaleFactor:2 });
const p = await ctx.newPage();
const errs=[]; p.on('pageerror', e=>errs.push(e.message.slice(0,80)));
await p.goto('http://127.0.0.1:5303/', { waitUntil:'load' });
await p.waitForTimeout(15000);

await p.click('text=법당 열기');
await p.waitForTimeout(4000);

const tp  = (x,z)=>p.evaluate(([x,z])=>window.__MD_TP__(x,z),[x,z]);
const cam = (d,pi,y)=>p.evaluate(([d,pi,y])=>window.__MD_CAM__(d,pi,y),[d,pi,y]);
const face= (y)=>p.evaluate((y)=>window.__MD_FACE__(y),y);

async function shot(file, opt){
  if (opt.tp) { await tp(...opt.tp); await p.waitForTimeout(2500); }
  if (opt.cam) await cam(...opt.cam);
  if (opt.face!==undefined) await face(opt.face);
  await p.waitForTimeout(opt.wait||2500);
  await p.screenshot({ path:`docs/screenshots/${file}`, timeout:120000 });
  console.log('拍完', file);
}

await shot('01-입구-데스크톱.png', { wait:1000 });
await shot('02-산문-전경.png', { tp:[0,63], cam:[7.0,0.18,0], wait:3500 });
await shot('03-돌길-단풍.png', { tp:[0,47], cam:[5.6,0.24,0.28], wait:3000 });
await shot('04-법당-전면.png', { tp:[0,28.5], cam:[5.2,0.24,0], wait:3500 });
await shot('05-불상-근경.png', { tp:[0,26.5], cam:[3.2,0.30,0], wait:3000 });
await shot('06-기원벽.png', { tp:[-4.6,29.6], cam:[4.2,0.20,-1.35], wait:3000 });
await shot('07-석탑-마당.png', { tp:[-5.4,45.5], cam:[5.0,0.22,-0.85], wait:3000 });
await shot('08-평상-단풍.png', { tp:[7.2,35.4], cam:[3.6,0.24,0.9], wait:3000 });
await shot('09-차실.png', { tp:[8.6,35.6], cam:[3.8,0.26,-1.1], wait:3000 });
await shot('10-동승-근경.png', { tp:[0,32], cam:[1.7,0.30,0], wait:3000 });
await b.close();
console.log('报错', errs.length);
