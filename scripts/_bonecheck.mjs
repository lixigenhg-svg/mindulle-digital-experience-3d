import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const ctx = await b.newContext({ ...devices['iPhone 13'], isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(16000);
await p.evaluate(()=>window.__MD__?.enter?.());
await p.waitForTimeout(1500);
await p.evaluate(()=>window.__MD_WALK__(0,20));
for (let i=0;i<4;i++){
  await p.waitForTimeout(1600);
  const r = await p.evaluate(()=>{
    const s = window.__SCENE__; let out='none';
    s.traverse((o)=>{ if(o.isBone && /thigh/i.test(o.name) && /L/i.test(o.name)) out = o.rotation.x.toFixed(3); });
    return out;
  });
  console.log(i, r, JSON.stringify(await p.evaluate(()=>window.__MD__.getSnapshot().player)));
}
await b.close();
