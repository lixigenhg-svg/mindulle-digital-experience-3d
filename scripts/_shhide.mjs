import { chromium } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const ctx = await b.newContext({ viewport:{width:1400,height:760}, deviceScaleFactor:1 });
const p = await ctx.newPage();
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(6000);
await p.waitForFunction(()=>window.__MD__, null, {timeout:30000});
await p.evaluate(()=>window.__MD__.enter());
await p.waitForTimeout(1200);
await p.evaluate(()=>{window.__MD_TP__(0,40); window.__MD_CAM__(4.2,0.35,0.0);});
await p.waitForTimeout(3000);
const n = await p.evaluate(()=>{
  let hit=0;
  window.__SCENE__.traverse(o=>{
    if(o.isMesh && o.geometry && o.geometry.type==='PlaneGeometry'){
      const pr=o.geometry.parameters;
      if(pr && Math.abs(pr.width-0.98)<0.01){ o.visible=false; hit++; }
    }
  });
  return hit;
});
await p.waitForTimeout(1200);
await p.screenshot({path:'/tmp/sh_hidden.png'});
console.log('hidden',n);
await b.close();
