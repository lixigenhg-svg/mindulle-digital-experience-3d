import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const ctx = await b.newContext({ ...devices['iPhone 13'], isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(6000);
await p.waitForFunction(()=>window.__MD__, null, {timeout:30000});
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(1200);
await p.evaluate(()=>window.__MD_TP__(0, 20));
await p.waitForTimeout(1200);
await p.evaluate(()=>window.__MD__.bowNow());
for (let i=0;i<14;i++){
  await p.waitForTimeout(650);
  const st = await p.evaluate(()=>window.__MD__.getSnapshot().action);
  const r = await p.evaluate(()=>{
    const o={}; const scene=window.__SCENE__;
    scene.traverse(b=>{ if(b.isBone && ['head','hips','footL','handL'].includes(b.name)){ const v=new b.position.constructor(); b.getWorldPosition(v); o[b.name]=[+v.x.toFixed(2),+v.y.toFixed(2),+v.z.toFixed(2)]; } });
    return o;
  });
  console.log(i, st, JSON.stringify({head:r.head,hips:r.hips,foot:r.footL,hand:r.handL}));
}
await b.close();
