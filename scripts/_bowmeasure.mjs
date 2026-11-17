import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const ctx = await b.newContext({ ...devices['iPhone 13'], isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(16000);
await p.evaluate(()=>window.__MD__?.enter?.());
await p.waitForTimeout(800);
await p.evaluate(()=>window.__MD_TP__(1.74,4.24));
await p.waitForTimeout(600);
await p.evaluate(()=>window.__MD__.force('kowtow'));
for (let i=0;i<8;i++){
  await p.waitForTimeout(1500);
  const r = await p.evaluate(()=>{
    const out={};
    const scene = window.__SCENE__;
    if(!scene) return null;
    scene.traverse(o=>{
      if(o.isBone){
        const v=new (o.position.constructor)();
        o.getWorldPosition(v);
        out[o.name]=[+v.x.toFixed(2),+v.y.toFixed(2),+v.z.toFixed(2)];
      }
    });
    return out;
  });
  console.log(i, JSON.stringify({head:r?.head,neck:r?.neck,hips:r?.hips,footL:r?.footL,handL:r?.handL}));
}
await b.close();
