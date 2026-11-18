import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const ctx = await b.newContext({ ...devices['iPhone 13'], isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(16000);
await p.evaluate(()=>window.__MD__?.enter?.());
await p.waitForTimeout(1200);
await p.evaluate(()=>window.__MD_WALK__(0,20));
await p.waitForTimeout(2000);
const a = await p.evaluate(()=>{
  const list=[]; window.__SCENE__.traverse(o=>{ if(o.isBone) list.push(o.name+':'+o.rotation.x.toFixed(2)); });
  return list.slice(0,40);
});
await p.waitForTimeout(2000);
const c = await p.evaluate(()=>{
  const list=[]; window.__SCENE__.traverse(o=>{ if(o.isBone) list.push(o.name+':'+o.rotation.x.toFixed(2)); });
  return list.slice(0,40);
});
console.log('A', a.join(' | '));
console.log('B', c.join(' | '));
await b.close();
