import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const ctx = await b.newContext({ ...devices['iPhone 13'], isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(16000);
await p.evaluate(()=>window.__MD__?.enter?.());
await p.waitForTimeout(900);
await p.evaluate(()=>window.__MD_TP__(1.74,6.0));
await p.waitForTimeout(1200);
for (let i=0;i<4;i++){
  await p.waitForTimeout(900);
  const r = await p.evaluate(()=>{
    const out={bones:{},meshMin:null,meshMax:null};
    const scene=window.__SCENE__;
    scene.traverse(o=>{
      if(o.isBone && ['footL','footR','shinL','head','hips'].includes(o.name)){
        const v=new o.position.constructor(); o.getWorldPosition(v);
        out.bones[o.name]=+v.y.toFixed(3);
      }
      if(o.isSkinnedMesh && o.name.includes('monk')){ out.meshName = o.name; }
    });
    // 用 skinned 网格的几何包围盒近似判断最低点
    const m = scene.getObjectByName && null;
    return out;
  });
  console.log(i, JSON.stringify(r));
}
await p.screenshot({ path:'/tmp/foothold.png' });
await b.close();
