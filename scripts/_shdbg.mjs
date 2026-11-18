import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const ctx = await b.newContext({ viewport:{width:1000,height:600}, deviceScaleFactor:1 });
const p = await ctx.newPage();
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(6000);
await p.waitForFunction(()=>window.__MD__, null, {timeout:30000});
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(1500);
await p.evaluate(()=>{window.__MD_TP__(0,44);});
await p.waitForTimeout(3000);
console.log(JSON.stringify(await p.evaluate(()=>{
  const out=[];
  window.__SCENE__.traverse(o=>{
    if(o.isMesh && o.geometry?.type==='PlaneGeometry'){
      const pr=o.geometry.parameters;
      if(Math.abs(pr.width-0.98)<0.01){
        const v=new o.position.constructor(); o.getWorldPosition(v);
        out.push({w:v.x.toFixed(2),y:v.y.toFixed(2),z:v.z.toFixed(2),op:o.material.opacity});
      }
    }
  });
  return {pos: window.__MD_POS__(), shadows: out};
}, null, 2)));
await b.close();
