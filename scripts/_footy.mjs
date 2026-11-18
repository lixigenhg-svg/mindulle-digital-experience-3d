import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const ctx = await b.newContext({ ...devices['iPhone 13'], isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(16000);
await p.evaluate(()=>window.__MD__?.enter?.());
await p.waitForTimeout(1500);
const probe = ()=> {
  const out={};
  window.__SCENE__.traverse(o=>{ if(o.isBone && /foot|hips|head/i.test(o.name)){ const v=new (o.position.constructor)(); o.getWorldPosition(v); out[o.name.replace(/[._]/g,'')]=[+v.x.toFixed(3),+v.y.toFixed(3),+v.z.toFixed(3)]; }});
  return out;
};
console.log('idle', JSON.stringify(await p.evaluate(probe)));
await p.evaluate(()=>window.__MD_TP__(0,40));
await p.waitForTimeout(800);
await p.evaluate(()=>window.__MD_WALK__(8,40));
await p.waitForTimeout(2500);
for (let i=0;i<3;i++){ console.log('walk', JSON.stringify(await p.evaluate(probe))); await p.waitForTimeout(700); }
await b.close();
