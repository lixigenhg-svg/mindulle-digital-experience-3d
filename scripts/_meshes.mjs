import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const ctx = await b.newContext({ viewport:{width:900,height:600}});
const p = await ctx.newPage();
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(6000);
await p.waitForFunction(()=>window.__MD__, null, {timeout:30000});
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(1500);
const r = await p.evaluate(()=>{
  const out=[];
  window.__SCENE__.traverse(o=>{
    if(o.isSkinnedMesh) out.push({name:o.name, verts:o.geometry.attributes.position.count, vis:o.visible, bones:o.skeleton?o.skeleton.bones.length:0});
  });
  return out.slice(0,20);
});
console.log(JSON.stringify(r));
await b.close();
