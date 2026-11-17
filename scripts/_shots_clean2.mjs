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
for (const [f,t,c] of [['08-평상-단풍.jpg',[7.2,35.4],[3.6,0.24,0.9]],
                       ['09-차실.jpg',[8.6,35.6],[3.8,0.26,-1.1]],
                       ['10-캐릭터-근경.jpg',[0,32],[1.7,0.30,0]]]) {
  await tp(...t); await p.waitForTimeout(2500);
  await cam(...c); await p.waitForTimeout(2800);
  await p.screenshot({ path:`docs/screenshots/${f}`, type:'jpeg', quality:92, timeout:120000 });
  console.log('拍完', f);
}
await b.close();
