import { chromium, devices } from '@playwright/test';
const b = await chromium.launch({executablePath:'/usr/local/bin/chromium',args:['--no-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const ctx = await b.newContext({ ...devices['iPhone 13'], isMobile: true, hasTouch: true });
const p = await ctx.newPage();
await p.goto('http://localhost:5288/', { waitUntil: 'load' });
await p.waitForTimeout(16000);
await p.evaluate(()=>window.__MD__?.enter?.());
await p.waitForTimeout(1200);
const r = await p.evaluate(()=>{
  const scene=window.__SCENE__;
  const meshes=[];
  scene.traverse(o=>{ if(o.isSkinnedMesh) meshes.push(o); });
  if(!meshes.length) return 'no mesh';

  let min=1e9, max=-1e9;
  const per=[];
  for(const mesh of meshes){
    const vec = mesh.geometry.attributes.position;
    const p3 = new (mesh.position.constructor)();
    let m2=1e9;
    for(let i=0;i<vec.count;i++){
      p3.fromBufferAttribute(vec,i);
      mesh.applyBoneTransform(i, p3);
      p3.applyMatrix4(mesh.matrixWorld);
      if(p3.y<m2) m2=p3.y;
    }
    per.push([mesh.name, +m2.toFixed(3)]);
    if(m2<min) min=m2;
  }
  return {min:+min.toFixed(3), per: per.sort((a,b)=>a[1]-b[1]).slice(0,4)};
});
console.log(JSON.stringify(r));
await b.close();
