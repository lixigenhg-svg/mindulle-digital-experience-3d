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
const r = await p.evaluate(()=>{
  let sh=null, monk=null, cam=null;
  window.__SCENE__.traverse(o=>{
    if(o.isMesh && o.geometry && o.geometry.type==='PlaneGeometry'){
      const pr=o.geometry.parameters;
      if(pr && Math.abs(pr.width-0.98)<0.01) sh=o;
    }
  });
  const cam3 = window.__SCENE__.userData?.camera;
  const V = new (window.__THREE__ ? window.__THREE__.Vector3 : Object)();
  const out = {pos: window.__MD_POS__()};
  if(sh){
    const v = new sh.position.constructor(); sh.getWorldPosition(v); out.sh=[v.x,v.y,v.z];
    const parent=v.clone(); sh.parent.getWorldPosition(parent); out.parent=[parent.x,parent.y,parent.z];
  }
  return out;
});
console.log(JSON.stringify(r));
await b.close();
