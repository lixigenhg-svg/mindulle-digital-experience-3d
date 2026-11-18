import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const ctx = await b.newContext({ viewport:{width:900,height:600}, deviceScaleFactor:1 });
const p = await ctx.newPage();
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(6000);
await p.waitForFunction(()=>window.__MD__, null, {timeout:30000});
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(1200);
await p.evaluate(()=>{window.__MD_TP__(0,40);});
await p.waitForTimeout(2500);
const r = await p.evaluate(()=>{
  const res=[];
  window.__SCENE__.traverse(o=>{
    if(o.isSkinnedMesh){
      o.updateWorldMatrix(true,false);
      const box={min:1e9,max:-1e9};
      const g=o.geometry; if(g.boundingBox){ g.boundingBox.getCenter(g.boundingBox.getCenter(new g.boundingBox.constructor())); }
      const b=g.boundingBox;
      if(b){ const c=b.getCenter(new (b.min.constructor)()); c.applyMatrix4(o.matrixWorld); res.push([+c.x.toFixed(2),+c.y.toFixed(2),+c.z.toFixed(2)]); }
    }
  });
  return {pos: window.__MD_POS__(), skinned: res.slice(0,6)};
});
console.log(JSON.stringify(r));
await b.close();
