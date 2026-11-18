import { chromium } from '@playwright/test';
const b = await chromium.launch({ executablePath:'/usr/local/bin/chromium',
  args:['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
const p = await (await b.newContext({ viewport:{width:1600,height:900}, deviceScaleFactor:2 })).newPage();
await p.goto('http://127.0.0.1:5303/', { waitUntil:'load' });
await p.evaluate(()=>localStorage.setItem('mindulle.entered','1'));
await p.reload({ waitUntil:'load' });
await p.waitForFunction(()=>typeof window.__MD_TP__==='function', { timeout:40000 });
await p.waitForTimeout(6000);
const tp=(x,z)=>p.evaluate(([x,z])=>window.__MD_TP__(x,z),[x,z]);
const fix=(pp,tt)=>p.evaluate(([pp,tt])=>window.__MD_FIXCAM__(pp,tt),[pp,tt]);
const face=(r)=>p.evaluate(r=>window.__MD_FACE__(r),r);
async function shot(f,o){ if(o.tp){await tp(...o.tp);await p.waitForTimeout(2000);} if(o.face!=null)await face(o.face); if(o.fix)await fix(o.fix[0],o.fix[1]); await p.waitForTimeout(o.wait||3200); await p.screenshot({path:f,type:'jpeg',quality:92,timeout:120000}); console.log('ok',f); }
// 留言墙全景：角色站远处，相机斜向收整面墙
await shot('/tmp/w3.jpg',{tp:[-4.2,33.4],face:Math.PI*0.62,fix:[[-3.0,1.62,25.6],[-8.6,1.05,31.0]]});
// 灯排：从殿前望向庭院，两侧灯柱透视
await shot('/tmp/l3.jpg',{tp:[0,30.5],face:Math.PI,fix:[[0,1.62,28.0],[0,0.95,47.0]]});
// 灯排侧向
await shot('/tmp/l4.jpg',{tp:[1.2,38.5],face:Math.PI+0.9,fix:[[-1.2,1.58,33.2],[4.4,0.95,43.0]]});
await b.close();
