import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const ctx = await b.newContext({ ...devices['iPhone 13'], isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(16000);
await p.evaluate(()=>window.__MD__?.enter?.());
await p.waitForTimeout(1500);
const info = await p.evaluate(()=>{
  const out=[];
  window.__SCENE__.traverse(o=>{
    if(o.isSkinnedMesh){
      const m=o.material;
      out.push({name:o.name, visible:o.visible, cast:o.castShadow, recv:o.receiveShadow, verts:o.geometry.attributes.position.count,
        mat:{type:m.type, transparent:m.transparent, opacity:m.opacity, alphaTest:m.alphaTest, side:m.side, map:!!m.map, mapName:m.map?.name, color:m.color?.getHexString(), flat:m.flatShading, wire:!!m.wireframe}});
    }
  });
  return out;
});
console.log(JSON.stringify(info,null,1));
await b.close();
