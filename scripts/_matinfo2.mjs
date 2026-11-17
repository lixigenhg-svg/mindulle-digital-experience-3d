import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const ctx = await b.newContext({ ...devices['iPhone 13'], isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(16000);
await p.evaluate(()=>window.__MD__?.enter?.());
await p.waitForTimeout(1500);
const lines = await p.evaluate(()=>{
  const out=[];
  window.__SCENE__.traverse(o=>{ if(o.isSkinnedMesh){ const m=o.material;
    out.push([o.name,o.visible,o.geometry.attributes.position.count,(m.map&&m.map.name)||'-',m.type,m.side,m.transparent,m.opacity,m.alphaTest,m.color.getHexString()].join(' | ')); }});
  return out;
});
console.log(lines.join('\n'));
await b.close();
